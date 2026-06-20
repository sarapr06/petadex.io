import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { nightingaleFeaturesByTrack } from "./mockProteinData.js"
import {
  applyNightingaleChromeTheme,
  refreshNavigationViewport,
  refreshSequenceShadowTheme,
} from "./nightingaleChromeTheme.js"
import {
  detachNightingaleSequenceStripeGuard,
  mutationAffectsStripeGuard,
  paintNightingaleSequenceChrome,
} from "./nightingaleSequenceDots.js"
import { measureNightingaleViewerWidth } from "./nightingalePlotMargins.js"
import { isLightTheme } from "./nightingaleStripeColors.js"
import {
  buildNightingaleResidueLabel,
  clearNightingaleResidueLabel,
  clientXToNightingalePosition,
  residuePositionFromNightingaleFeature,
  syncNightingaleResidueHighlight,
} from "./residueColumnHighlight.js"
import {
  minimumViewportLength,
  residueWindowZoomLabel,
} from "./zoomReadout.js"

/**
 * @param {Record<string, unknown> | null | undefined} f
 * @returns {string}
 */
function nightingaleHoverLabel(f) {
  if (!f || typeof f !== "object") return ""
  if (typeof f.tooltipContent === "string" && f.tooltipContent.trim()) {
    return f.tooltipContent.trim()
  }
  if (typeof f.position === "number" && typeof f.aa === "string") {
    return `Residue ${f.position}: ${f.aa}`
  }
  const acc = typeof f.accession === "string" ? f.accession : "Feature"
  if (Array.isArray(f.fragments) && f.fragments.length) {
    const ranges = f.fragments
      .map(fr => {
        if (!fr || typeof fr !== "object") return ""
        const { start, end } = fr
        if (start == null || end == null) return ""
        return start === end ? `${start}` : `${start}–${end}`
      })
      .filter(Boolean)
    if (ranges.length) return `${acc}: ${ranges.join(", ")}`
  }
  if (f.start != null && f.end != null) {
    return `${acc}: ${f.start}–${f.end}`
  }
  return acc
}

/**
 * Only show custom hover for InterPro-style segments (domains, regions, sites, etc.).
 * Sequence tiles emit `mouseover` with `{ position, aa }` — those should not open the tooltip.
 * @param {Record<string, unknown> | null | undefined} f
 */
function isDomainOrSectionHoverFeature(f) {
  if (!f || typeof f !== "object" || Array.isArray(f)) return false

  const hasAccession = typeof f.accession === "string" && f.accession.trim().length > 0
  const hasLocations = Array.isArray(f.locations) && f.locations.length > 0
  const hasFragments = Array.isArray(f.fragments) && f.fragments.length > 0

  const isSequenceLetterTile =
    typeof f.position === "number" &&
    typeof f.aa === "string" &&
    !hasAccession &&
    !hasLocations &&
    !hasFragments

  if (isSequenceLetterTile) return false

  if (typeof f.tooltipContent === "string" && f.tooltipContent.trim()) return true

  if (hasAccession || hasLocations || hasFragments) return true

  const cs = f.start
  const ce = f.end
  if (typeof cs === "number" && typeof ce === "number" && ce >= cs) return true

  return false
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

/** @param {number} x @param {number} y @param {DOMRect} r */
function pointInDomRect(x, y, r) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

/**
 * True when the pointer is on an InterPro bar or its on-canvas label (`show-label`).
 * Used so the tooltip does not stay visible over empty track / ruler / sequence area.
 * @param {number} clientX
 * @param {number} clientY
 */
function pointerOverInterproAnnotationHit(clientX, clientY) {
  let stack
  try {
    stack = document.elementsFromPoint(clientX, clientY)
  } catch {
    return false
  }
  for (const node of stack) {
    if (!(node instanceof Element)) continue
    if (!node.closest("nightingale-interpro-track")) continue
    const cls = typeof node.getAttribute === "function" ? node.getAttribute("class") || "" : ""
    if (
      node.matches("path.feature") ||
      node.matches("text.feature-label") ||
      (node.matches("path") && cls.includes("feature"))
    ) {
      return true
    }
  }
  return false
}

/**
 * Viewport coordinates for `position: fixed` (use clientX/clientY from MouseEvent).
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ w?: number, h?: number }} box
 */
function tooltipPositionFixed(clientX, clientY, box = {}) {
  const pad = 12
  const w = box.w ?? 280
  const h = box.h ?? 72
  const vw = typeof window !== "undefined" ? window.innerWidth : 800
  const vh = typeof window !== "undefined" ? window.innerHeight : 600
  let left = clientX + pad
  let top = clientY + pad
  if (left + w > vw - 8) left = clientX - w - pad
  if (top + h > vh - 8) top = clientY - h - pad
  return {
    left: clamp(left, 8, vw - w - 8),
    top: clamp(top, 8, vh - h - 8),
  }
}

/**
 * Prefer client coords from the original mouse event (fixed tooltips).
 * @param {{ parentEvent?: Event, coords?: unknown }} d
 * @returns {{ x: number, y: number } | null}
 */
function nightingalePointerClientXY(d) {
  const pe = d.parentEvent
  if (
    pe &&
    typeof pe.clientX === "number" &&
    typeof pe.clientY === "number" &&
    !Number.isNaN(pe.clientX) &&
    !Number.isNaN(pe.clientY)
  ) {
    return { x: pe.clientX, y: pe.clientY }
  }
  if (Array.isArray(d.coords) && d.coords.length >= 2) {
    const a = d.coords[0]
    const b = d.coords[1]
    if (typeof a === "number" && typeof b === "number" && !Number.isNaN(a) && !Number.isNaN(b)) {
      if (typeof window !== "undefined") {
        return { x: a - window.scrollX, y: b - window.scrollY }
      }
      return { x: a, y: b }
    }
  }
  return null
}

/** Overview ruler + zoom wedge (library draws trapezoids in this band). */
const NG_NAV_HEIGHT = 80
const NG_SEQUENCE_HEIGHT = 56
const NG_TRACK_HEIGHT = 136
/** Thin gradient strip — not a full annotation row. */
const NG_PLDDT_TRACK_HEIGHT = 12

/** Client-only EBI Nightingale stack (web components). */
export default function NightingaleProteinPanel({
  sequence,
  trackPayloads: trackPayloadsProp,
  enrichmentLoading,
}) {
  const wrapRef = useRef(null)
  /** Nightingale viewer box (excludes zoom toolbar) — used to dismiss hover when pointer leaves. */
  const nightingaleChromeRef = useRef(null)
  const managerRef = useRef(null)
  const navRef = useRef(null)
  const seqRef = useRef(null)
  /** Mirrors display window for zoom / pan buttons (ref alone does not re-render). */
  const viewportRef = useRef({ lo: 1, hi: 1 })
  const trackRefs = useRef([])
  const [libsReady, setLibsReady] = useState(false)
  const [hoverTip, setHoverTip] = useState(null)
  const [residueLabel, setResidueLabel] = useState(
    /** @type {{ text: string, left: number, top: number } | null} */ (null),
  )
  /** Mirrors Nightingale `display-start` / `display-end` for toolbar readout. */
  const [displayWindow, setDisplayWindow] = useState(
    /** @type {{ start: number, end: number } | null} */ (null),
  )

  const seqLen = sequence?.length ?? 0

  const trackPayloads = useMemo(() => {
    if (trackPayloadsProp?.length) return trackPayloadsProp
    return seqLen > 0 ? nightingaleFeaturesByTrack(seqLen) : []
  }, [seqLen, trackPayloadsProp])

  const hasPlddtBar = trackPayloads.some(t => t.id === "plddt")

  const zoomMaxLib = useMemo(() => minimumViewportLength(seqLen), [seqLen])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.all([
        import("@nightingale-elements/nightingale-manager"),
        import("@nightingale-elements/nightingale-navigation"),
        import("@nightingale-elements/nightingale-sequence"),
        import("@nightingale-elements/nightingale-interpro-track"),
      ])
      if (!cancelled) setLibsReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setTrackRef = useCallback((index, el) => {
    trackRefs.current[index] = el
  }, [])

  /** Last hovered residue (1-based); cleared when letters are hidden (zoomed-out dots). */
  const hoverPositionRef = useRef(/** @type {number | null} */ (null))
  /** Last pointer in viewport coords — reused when layout/sequence repaints omit pointer. */
  const hoverPointerRef = useRef(/** @type {{ x: number, y: number } | null} */ (null))

  const applyResidueColumnHighlight = useCallback(
    (
      /** @type {number | null} */ position,
      /** @type {{ x: number, y: number } | undefined} */ pointer,
    ) => {
      hoverPositionRef.current = position
      if (pointer) {
        hoverPointerRef.current = pointer
      } else if (position == null) {
        hoverPointerRef.current = null
      }

      syncNightingaleResidueHighlight(
        {
          manager: managerRef.current,
          navigation: navRef.current,
          sequence: seqRef.current,
          tracks: trackRefs.current,
          chrome: nightingaleChromeRef.current,
          wrap: wrapRef.current,
        },
        position,
        isLightTheme(),
        sequence,
      )

      const ptr = pointer ?? hoverPointerRef.current ?? undefined
      setResidueLabel(prev => {
        if (position == null) return null
        const next = buildNightingaleResidueLabel(
          seqRef.current,
          position,
          sequence,
          ptr?.x,
          ptr?.y,
        )
        return next ?? prev
      })
    },
    [sequence],
  )

  const applyResidueColumnHighlightRef = useRef(applyResidueColumnHighlight)
  applyResidueColumnHighlightRef.current = applyResidueColumnHighlight

  const syncChromeTheme = useCallback(() => {
    applyNightingaleChromeTheme(
      {
        navigation: navRef.current,
        sequence: seqRef.current,
        tracks: trackRefs.current,
      },
      sequence,
    )
  }, [sequence])

  const syncChromeThemeRef = useRef(syncChromeTheme)
  syncChromeThemeRef.current = syncChromeTheme

  /**
   * Push the same residue window to manager + every track (matches Nightingale
   * `zoomIn` / `zoomOut` math) without calling those methods — avoids D3 brush
   * races when our layout sync was resetting `display-*` every resize.
   */
  const applySharedViewport = useCallback(
    (displayStart, displayEnd) => {
      if (!sequence || seqLen === 0) return
      const w = measureNightingaleViewerWidth(
        nightingaleChromeRef.current,
        wrapRef.current,
      )
      const len = seqLen
      let ds = Math.round(displayStart)
      let de = Math.round(displayEnd)
      ds = Math.max(1, Math.min(ds, len))
      de = Math.max(ds + 1, Math.min(de, len))
      const a = String(ds)
      const b = String(de)

      const mgr = managerRef.current
      if (mgr) {
        mgr.setAttribute(
          "reflected-attributes",
          "display-start display-end length highlight",
        )
        mgr.length = len
        mgr.width = w
        mgr.setAttribute("display-start", a)
        mgr.setAttribute("display-end", b)
      }

      const apply = el => {
        if (!el) return
        el.length = len
        el.width = w
        el.setAttribute("display-start", a)
        el.setAttribute("display-end", b)
      }

      apply(navRef.current)
      const nav = navRef.current
      if (nav) {
        nav.height = NG_NAV_HEIGHT
        nav.setAttribute("ruler-start", "1")
        nav.setAttribute("margin-right", "12")
        nav.setAttribute("show-highlight", "true")
      }

      const seqEl = seqRef.current
      apply(seqEl)
      if (seqEl) {
        seqEl.sequence = sequence
        seqEl.height = NG_SEQUENCE_HEIGHT
        seqEl.setAttribute("margin-top", "6")
      }

      trackPayloads.forEach((track, i) => {
        const tel = trackRefs.current[i]
        if (!tel) return
        apply(tel)
        const isPlddt = track.id === "plddt"
        tel.layout = isPlddt ? "overlapping" : "non-overlapping"
        tel.shape = isPlddt ? "rectangle" : "roundRectangle"
        tel["show-label"] = !isPlddt
        tel.data = track.data
        tel.height = isPlddt ? NG_PLDDT_TRACK_HEIGHT : NG_TRACK_HEIGHT
      })

      setDisplayWindow({ start: ds, end: de })
      viewportRef.current = { lo: ds, hi: de }
      requestAnimationFrame(() => {
        syncChromeThemeRef.current()
        refreshNavigationViewport(navRef.current)
        const pos = hoverPositionRef.current
        if (pos != null) {
          applyResidueColumnHighlightRef.current(pos, hoverPointerRef.current ?? undefined)
        }
      })
    },
    [sequence, seqLen, trackPayloads],
  )

  /** Width/length/data only — never overwrites zoom window (display-start/end). */
  const syncLayoutGeometry = useCallback(() => {
    if (!sequence || seqLen === 0) return
    const w = measureNightingaleViewerWidth(
      nightingaleChromeRef.current,
      wrapRef.current,
    )
    const len = seqLen

    const mgr = managerRef.current
    if (mgr) {
      mgr.setAttribute(
        "reflected-attributes",
        "display-start display-end length highlight",
      )
      mgr.length = len
      mgr.width = w
    }

    const applyGeom = el => {
      if (!el) return
      el.length = len
      el.width = w
    }

    const nav = navRef.current
    applyGeom(nav)
    if (nav) {
      nav.height = NG_NAV_HEIGHT
      nav.setAttribute("ruler-start", "1")
      nav.setAttribute("margin-right", "12")
      nav.setAttribute("show-highlight", "true")
      const { lo, hi } = viewportRef.current
      nav.setAttribute("display-start", String(lo))
      nav.setAttribute("display-end", String(hi))
    }

    const seqEl = seqRef.current
    applyGeom(seqEl)
    if (seqEl) {
      seqEl.sequence = sequence
      seqEl.height = NG_SEQUENCE_HEIGHT
      seqEl.setAttribute("margin-top", "6")
    }

    trackPayloads.forEach((track, i) => {
      const tel = trackRefs.current[i]
      if (!tel) return
      applyGeom(tel)
      const isPlddt = track.id === "plddt"
      tel.layout = isPlddt ? "overlapping" : "non-overlapping"
      tel.shape = isPlddt ? "rectangle" : "roundRectangle"
      tel["show-label"] = !isPlddt
      tel.data = track.data
      tel.height = isPlddt ? NG_PLDDT_TRACK_HEIGHT : NG_TRACK_HEIGHT
    })

    requestAnimationFrame(() => {
      syncChromeThemeRef.current()
      refreshNavigationViewport(navRef.current)
    })
  }, [sequence, seqLen, trackPayloads])

  const applyVpRef = useRef(applySharedViewport)
  applyVpRef.current = applySharedViewport

  useEffect(() => {
    if (!libsReady || seqLen === 0) return
    applyVpRef.current(1, seqLen)
    requestAnimationFrame(() => syncChromeThemeRef.current())
  }, [libsReady, seqLen])

  useEffect(() => {
    if (!libsReady || seqLen === 0) return

    let raf = 0
    const scheduleSequencePaint = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        paintNightingaleSequenceChrome(seqRef.current, sequence)
        refreshSequenceShadowTheme(seqRef.current)
        const pos = hoverPositionRef.current
        if (pos != null) {
          applyResidueColumnHighlightRef.current(
            pos,
            hoverPointerRef.current ?? undefined,
          )
        }
      })
    }

    scheduleSequencePaint()

    const htmlMo = new MutationObserver(scheduleSequencePaint)
    htmlMo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    let seqMo = null
    const attachSequenceObserver = () => {
      const seq = seqRef.current
      if (!seq?.shadowRoot || seqMo) return
      seqMo = new MutationObserver(mutations => {
        if (!mutations.some(mutationAffectsStripeGuard)) return
        scheduleSequencePaint()
      })
      seqMo.observe(seq.shadowRoot, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style", "transform", "opacity", "fill"],
      })
    }

    requestAnimationFrame(() => {
      attachSequenceObserver()
    })

    return () => {
      cancelAnimationFrame(raf)
      htmlMo.disconnect()
      seqMo?.disconnect()
      detachNightingaleSequenceStripeGuard(seqRef.current)
    }
  }, [libsReady, seqLen, sequence])

  useEffect(() => {
    if (!libsReady || seqLen === 0) return
    syncLayoutGeometry()
    const chrome = nightingaleChromeRef.current
    if (!chrome || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => syncLayoutGeometry())
    ro.observe(chrome)
    return () => ro.disconnect()
  }, [libsReady, seqLen, syncLayoutGeometry, hasPlddtBar])

  /**
   * When the viewport changes, the manager sometimes re-applies a stale internal
   * `display-start` / `display-end` to children. Re-push the window from the event
   * detail so all tracks match.
   */
  const applyVpFromManagerEventRef = useRef(applySharedViewport)
  applyVpFromManagerEventRef.current = applySharedViewport

  useEffect(() => {
    if (!libsReady || seqLen === 0) return
    const mgr = managerRef.current
    if (!mgr) return

    const onManagerChange = (/** @type {CustomEvent} */ e) => {
      const d = e.detail
      if (!d || typeof d !== "object") return
      if ("eventType" in d || "eventtype" in d) return

      const rawDs = d["display-start"]
      const rawDe = d["display-end"]
      if (rawDs == null || rawDe == null) return

      const ds = typeof rawDs === "number" ? rawDs : Number(rawDs)
      const de = typeof rawDe === "number" ? rawDe : Number(rawDe)
      if (!Number.isFinite(ds) || !Number.isFinite(de) || de <= ds) return

      const seqEl = seqRef.current
      if (seqEl) {
        const attrS = seqEl.getAttribute("display-start")
        const attrE = seqEl.getAttribute("display-end")
        const cs = attrS != null ? Number(attrS) : Number(seqEl["display-start"])
        const ce = attrE != null ? Number(attrE) : Number(seqEl["display-end"])
        if (
          Number.isFinite(cs) &&
          Number.isFinite(ce) &&
          Math.round(cs) === Math.round(ds) &&
          Math.round(ce) === Math.round(de)
        ) {
          requestAnimationFrame(() => {
            refreshNavigationViewport(navRef.current)
          })
          return
        }
      }

      applyVpFromManagerEventRef.current(ds, de)
    }

    mgr.addEventListener("change", onManagerChange)
    return () => mgr.removeEventListener("change", onManagerChange)
  }, [libsReady, seqLen])

  const handleResetZoom = useCallback(() => {
    applySharedViewport(1, seqLen)
    viewportRef.current = { lo: 1, hi: seqLen }
  }, [applySharedViewport, seqLen])

  const handleZoomIn = useCallback(() => {
    const L = seqLen
    const { lo, hi } = viewportRef.current
    const span = hi - lo
    if (L <= 0 || span <= zoomMaxLib + 0.02) return

    const targetLen = Math.max(zoomMaxLib + 0.02, span * 0.62)
    const mid = (lo + hi) / 2
    let a = mid - targetLen / 2
    let b = mid + targetLen / 2
    if (a < 1) {
      b += 1 - a
      a = 1
    }
    if (b > L) {
      a -= b - L
      b = L
    }
    if (a < 1) a = 1
    applySharedViewport(a, b)
  }, [applySharedViewport, seqLen, zoomMaxLib])

  const handleZoomOut = useCallback(() => {
    const L = seqLen
    const { lo, hi } = viewportRef.current
    const span = hi - lo
    if (L <= 0) return

    if (span >= L - 0.5) {
      handleResetZoom()
      return
    }

    const targetLen = Math.min(L - 0.02, span / 0.62)
    const mid = (lo + hi) / 2
    let a = mid - targetLen / 2
    let b = mid + targetLen / 2
    if (a < 1) {
      b += 1 - a
      a = 1
    }
    if (b > L) {
      a -= b - L
      b = L
    }
    if (a < 1) a = 1
    if (b > L) b = L
    if (b - a >= L - 0.5) {
      handleResetZoom()
      return
    }
    applySharedViewport(a, b)
  }, [applySharedViewport, handleResetZoom, seqLen])

  const panByResidues = useCallback(
    delta => {
      const L = seqLen
      const { lo, hi } = viewportRef.current
      const span = hi - lo
      if (L <= 0 || span >= L - 0.5 || delta === 0) return

      let a = lo + delta
      let b = hi + delta
      if (a < 1) {
        b += 1 - a
        a = 1
      }
      if (b > L) {
        a -= b - L
        b = L
      }
      if (a < 1) a = 1
      if (b > L) b = L
      applySharedViewport(a, b)
    },
    [applySharedViewport, seqLen],
  )

  useEffect(() => {
    if (!libsReady || seqLen === 0) return
    const chrome = nightingaleChromeRef.current
    if (!chrome) return

    chrome.querySelector(".ng-residue-column-highlight")?.remove()

    let raf = 0
    const onPointerMove = (/** @type {PointerEvent} */ ev) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = chrome.getBoundingClientRect()
        if (!pointInDomRect(ev.clientX, ev.clientY, r)) {
          applyResidueColumnHighlightRef.current(null)
          return
        }
        const { lo, hi } = viewportRef.current
        const pos = clientXToNightingalePosition(
          seqRef.current,
          ev.clientX,
          { lo, hi },
          ev.clientY,
        )
        if (pos == null) return
        applyResidueColumnHighlightRef.current(pos, {
          x: ev.clientX,
          y: ev.clientY,
        })
      })
    }

    const onPointerLeave = (/** @type {PointerEvent} */ ev) => {
      // Shadow boundaries often yield null; window pointermove keeps hover in sync.
      if (ev.relatedTarget == null) return
      const next = ev.relatedTarget
      if (next instanceof Node && chrome.contains(next)) return
      applyResidueColumnHighlightRef.current(null)
    }

    // Window listener: Nightingale hosts use shadow DOM; retargeting can miss wrap capture.
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    chrome.addEventListener("pointerleave", onPointerLeave, { capture: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onPointerMove)
      chrome.removeEventListener("pointerleave", onPointerLeave, { capture: true })
      applyResidueColumnHighlightRef.current(null)
      clearNightingaleResidueLabel()
    }
  }, [libsReady, seqLen])

  useEffect(() => {
    if (!libsReady || seqLen === 0) return
    const pos = hoverPositionRef.current
    if (pos == null) return
    const ptr = hoverPointerRef.current ?? undefined
    let raf = requestAnimationFrame(() =>
      applyResidueColumnHighlightRef.current(pos, ptr),
    )
    const chrome = nightingaleChromeRef.current
    const ro =
      typeof ResizeObserver !== "undefined" && chrome
        ? new ResizeObserver(() => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() =>
              applyResidueColumnHighlightRef.current(pos, ptr),
            )
          })
        : null
    ro?.observe(chrome)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [libsReady, seqLen, displayWindow])

  useEffect(() => {
    if (!libsReady) return
    const root = wrapRef.current
    if (!root) return

    /** @type {{ label: string } | null} */
    let tracking = null

    const clearHover = () => {
      tracking = null
      setHoverTip(null)
    }

    const onMove = (/** @type {MouseEvent} */ ev) => {
      if (!tracking) return
      const chrome = nightingaleChromeRef.current
      if (chrome) {
        const r = chrome.getBoundingClientRect()
        if (!pointInDomRect(ev.clientX, ev.clientY, r)) {
          clearHover()
          return
        }
      }
      if (!pointerOverInterproAnnotationHit(ev.clientX, ev.clientY)) {
        clearHover()
        return
      }
      setHoverTip({
        label: tracking.label,
        ...tooltipPositionFixed(ev.clientX, ev.clientY),
      })
    }

    const onChange = (/** @type {CustomEvent} */ e) => {
      const d = e.detail
      if (!d || typeof d !== "object") return

      const eventType =
        typeof d.eventType === "string"
          ? d.eventType
          : typeof d.eventtype === "string"
            ? d.eventtype
            : null
      if (!eventType) return

      if (eventType === "mouseout") {
        clearHover()
        return
      }
      if (eventType !== "mouseover" || !d.feature) return

      const feat = /** @type {Record<string, unknown>} */ (d.feature)
      const residuePos = residuePositionFromNightingaleFeature(feat)
      if (residuePos != null) {
        const xy = nightingalePointerClientXY(d)
        applyResidueColumnHighlightRef.current(
          residuePos,
          xy ? { x: xy.x, y: xy.y } : undefined,
        )
        return
      }
      if (!isDomainOrSectionHoverFeature(feat)) return

      const label = nightingaleHoverLabel(feat)
      if (!label) return

      const xy = nightingalePointerClientXY(d)
      if (!xy) return

      tracking = { label }
      setHoverTip({ label, ...tooltipPositionFixed(xy.x, xy.y) })
    }

    const chrome = nightingaleChromeRef.current
    window.addEventListener("mousemove", onMove, { passive: true })
    root.addEventListener("change", onChange)
    chrome?.addEventListener("pointerleave", clearHover)

    return () => {
      window.removeEventListener("mousemove", onMove)
      root.removeEventListener("change", onChange)
      chrome?.removeEventListener("pointerleave", clearHover)
      tracking = null
      setHoverTip(null)
    }
  }, [libsReady, seqLen, displayWindow])

  if (!libsReady) {
    return (
      <div
        ref={wrapRef}
        className="min-h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground"
      >
        Loading Nightingale components…
      </div>
    )
  }

  if (!sequence || seqLen === 0) {
    return (
      <div className="min-h-[200px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
        Choose a protein or wait for the sequence to load.
      </div>
    )
  }

  const brushExtent = displayWindow
    ? { lo: displayWindow.start, hi: displayWindow.end }
    : { lo: 1, hi: seqLen }

  const zoomScale =
    seqLen > 0
      ? seqLen / Math.max(1, brushExtent.hi - brushExtent.lo + 1)
      : 1

  const extentLen =
    brushExtent.hi > brushExtent.lo
      ? brushExtent.hi - brushExtent.lo
      : Math.max(0, seqLen - 1)

  const zoomedPastOne = zoomScale > 1.001
  const canZoomIn =
    seqLen > zoomMaxLib + 1 && extentLen > zoomMaxLib + 1.5
  const canZoomOut = zoomedPastOne

  const ngZoomReadout =
    displayWindow != null
      ? residueWindowZoomLabel(seqLen, displayWindow.start, displayWindow.end)
      : residueWindowZoomLabel(seqLen, 1, seqLen)

  return (
    <div ref={wrapRef} className="nightingale-prototype relative w-full min-w-0 pb-1">
      {hoverTip ? (
        <div
          className="pointer-events-none fixed z-[600] max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
          style={{ left: hoverTip.left, top: hoverTip.top }}
          role="status"
          aria-live="polite"
        >
          {hoverTip.label}
        </div>
      ) : null}
      {residueLabel ? (
        <div
          className="nightingale-residue-position-label pointer-events-none fixed z-[9999]"
          style={{ left: residueLabel.left, top: residueLabel.top }}
          aria-hidden="true"
        >
          {residueLabel.text}
        </div>
      ) : null}
      {enrichmentLoading ? (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
          Updating enrichment…
        </p>
      ) : null}
      <div className="w-full min-w-0 max-w-[min(100%,52rem)] px-4 mb-2 space-y-2">
        <div
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          aria-label="Sequence zoom controls"
        >
          <span className="font-medium text-foreground">Zoom</span>
          <button
            type="button"
            className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem]"
            onClick={handleZoomOut}
            disabled={!canZoomOut}
            aria-label="Zoom out"
            title="Show more of the sequence"
          >
            −
          </button>
          <button
            type="button"
            className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem]"
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            aria-label="Zoom in"
            title="Magnify a shorter residue window"
          >
            +
          </button>
          <button
            type="button"
            className="btn btn-secondary text-sm px-2 py-1 min-w-[2.25rem] disabled:opacity-40"
            onClick={handleResetZoom}
            disabled={!zoomedPastOne}
            aria-label="Reset zoom to full sequence (1×)"
            title={
              zoomedPastOne
                ? "Show the full sequence (1×)"
                : "Already showing the full sequence"
            }
          >
            1×
          </button>
          <button
            type="button"
            className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem] disabled:opacity-40"
            onClick={() => {
              const { lo, hi } = viewportRef.current
              const span = hi - lo
              panByResidues(-Math.max(5, Math.floor(span * 0.12)))
            }}
            disabled={!zoomedPastOne}
            aria-label="Pan view toward N-terminus"
            title="Pan left (N-terminus)"
          >
            «
          </button>
          <button
            type="button"
            className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem] disabled:opacity-40"
            onClick={() => {
              const { lo, hi } = viewportRef.current
              const span = hi - lo
              panByResidues(Math.max(5, Math.floor(span * 0.12)))
            }}
            disabled={!zoomedPastOne}
            aria-label="Pan view toward C-terminus"
            title="Pan right (C-terminus)"
          >
            »
          </button>
          <span
            className="text-[11px] tabular-nums text-muted-foreground whitespace-nowrap"
            aria-live="polite"
          >
            {ngZoomReadout}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-3xl">
          Drag the shaded window on the overview ruler to pan or resize the visible range.
          Hover a residue to highlight its column across tracks and show its position.
        </p>
      </div>
      <div
        ref={nightingaleChromeRef}
        className="nightingale-chrome nightingale-chrome-unified relative mx-4 min-w-0 max-w-[min(100%,52rem)] rounded-lg border border-border bg-background"
      >
        <nightingale-manager ref={managerRef} style={{ display: "block" }}>
          <nightingale-navigation ref={navRef} />
          <nightingale-sequence ref={seqRef} />
          {trackPayloads.map((track, i) => (
            <nightingale-interpro-track
              key={`${track.id}-${i}`}
              ref={el => setTrackRef(i, el)}
            />
          ))}
        </nightingale-manager>
      </div>
    </div>
  )
}

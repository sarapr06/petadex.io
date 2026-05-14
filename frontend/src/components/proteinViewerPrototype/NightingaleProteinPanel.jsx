import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { nightingaleFeaturesByTrack } from "./mockProteinData.js"

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

/** Roomier layout than library defaults — reduces ruler / sequence / track overlap. */
const NG_NAV_HEIGHT = 72
const NG_SEQUENCE_HEIGHT = 56
const NG_LINEGRAPH_HEIGHT = 88
const NG_TRACK_HEIGHT = 136

/** Client-only EBI Nightingale stack (web components). */
export default function NightingaleProteinPanel({
  sequence,
  trackPayloads: trackPayloadsProp,
  linegraphData,
  enrichmentLoading,
}) {
  const wrapRef = useRef(null)
  /** Nightingale viewer box (excludes zoom toolbar) — used to dismiss hover when pointer leaves. */
  const nightingaleChromeRef = useRef(null)
  const managerRef = useRef(null)
  const navRef = useRef(null)
  const seqRef = useRef(null)
  const lineRef = useRef(null)
  const trackRefs = useRef([])
  const [libsReady, setLibsReady] = useState(false)
  const [hoverTip, setHoverTip] = useState(null)

  const seqLen = sequence?.length ?? 0

  const trackPayloads = useMemo(() => {
    if (trackPayloadsProp?.length) return trackPayloadsProp
    return seqLen > 0 ? nightingaleFeaturesByTrack(seqLen) : []
  }, [seqLen, trackPayloadsProp])

  const showLine = Array.isArray(linegraphData) && linegraphData.length > 0

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.all([
        import("@nightingale-elements/nightingale-manager"),
        import("@nightingale-elements/nightingale-navigation"),
        import("@nightingale-elements/nightingale-sequence"),
        import("@nightingale-elements/nightingale-interpro-track"),
        import("@nightingale-elements/nightingale-linegraph-track"),
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

  /**
   * Push the same residue window to manager + every track (matches Nightingale
   * `zoomIn` / `zoomOut` math) without calling those methods — avoids D3 brush
   * races when our layout sync was resetting `display-*` every resize.
   */
  const applySharedViewport = useCallback(
    (displayStart, displayEnd) => {
      if (!sequence || seqLen === 0) return
      const root = wrapRef.current
      const w = Math.max(400, root?.offsetWidth || 960)
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
      }

      const seqEl = seqRef.current
      apply(seqEl)
      if (seqEl) {
        seqEl.sequence = sequence
        seqEl.height = NG_SEQUENCE_HEIGHT
      }

      const lineEl = lineRef.current
      apply(lineEl)
      if (lineEl && showLine) {
        lineEl.data = linegraphData
        lineEl.height = NG_LINEGRAPH_HEIGHT
      }

      trackPayloads.forEach((track, i) => {
        const tel = trackRefs.current[i]
        if (!tel) return
        apply(tel)
        tel.layout = "non-overlapping"
        tel.shape = "roundRectangle"
        tel["show-label"] = true
        tel.data = track.data
        tel.height = NG_TRACK_HEIGHT
      })
    },
    [sequence, seqLen, trackPayloads, linegraphData, showLine],
  )

  /** Width/length/data only — never overwrites zoom window (display-start/end). */
  const syncLayoutGeometry = useCallback(() => {
    if (!sequence || seqLen === 0) return
    const root = wrapRef.current
    if (!root) return
    const w = Math.max(400, root.offsetWidth || 960)
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
    }

    const seqEl = seqRef.current
    applyGeom(seqEl)
    if (seqEl) {
      seqEl.sequence = sequence
      seqEl.height = NG_SEQUENCE_HEIGHT
    }

    const lineEl = lineRef.current
    applyGeom(lineEl)
    if (lineEl && showLine) {
      lineEl.data = linegraphData
      lineEl.height = NG_LINEGRAPH_HEIGHT
    }

    trackPayloads.forEach((track, i) => {
      const tel = trackRefs.current[i]
      if (!tel) return
      applyGeom(tel)
      tel.layout = "non-overlapping"
      tel.shape = "roundRectangle"
      tel["show-label"] = true
      tel.data = track.data
      tel.height = NG_TRACK_HEIGHT
    })
  }, [sequence, seqLen, trackPayloads, linegraphData, showLine])

  const applyVpRef = useRef(applySharedViewport)
  applyVpRef.current = applySharedViewport

  useEffect(() => {
    if (!libsReady || seqLen === 0) return
    applyVpRef.current(1, seqLen)
  }, [libsReady, seqLen])

  useEffect(() => {
    if (!libsReady || seqLen === 0) return
    syncLayoutGeometry()
    const root = wrapRef.current
    if (!root || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => syncLayoutGeometry())
    ro.observe(root)
    return () => ro.disconnect()
  }, [libsReady, seqLen, syncLayoutGeometry, showLine])

  /**
   * When the overview brush is dragged, `nightingale-navigation` dispatches `change`
   * on `nightingale-manager`. The manager sometimes re-applies a stale internal
   * `display-start` / `display-end` to children, so tracks stay stuck while the
   * brush moves. Re-push the window from the event detail so all tracks match.
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
          return
        }
      }

      applyVpFromManagerEventRef.current(ds, de)
    }

    mgr.addEventListener("change", onManagerChange)
    return () => mgr.removeEventListener("change", onManagerChange)
  }, [libsReady, seqLen])

  const runZoom = useCallback(
    direction => {
      syncLayoutGeometry()
      const nav = navRef.current
      const L = seqLen
      if (!nav || !L) return

      requestAnimationFrame(() => {
        const rs = Number(nav["ruler-start"]) || 1
        const sf =
          Number(nav["scale-factor"]) || Math.max(10, Math.floor(L / 5))
        const start =
          typeof nav.getStart === "function"
            ? nav.getStart()
            : Number(nav["display-start"]) || 1
        const end =
          typeof nav.getEnd === "function"
            ? nav.getEnd()
            : Number(nav["display-end"]) || L

        let nds
        let nde
        if (direction === "in") {
          const t = Math.min(start + sf, end - 1)
          nds = t
          nde = Math.max(end - sf, t + 1)
        } else {
          nds = Math.max(rs, start - sf)
          nde = Math.min(L + rs - 1, end + sf)
        }

        nds = Math.max(1, Math.min(nds, L))
        nde = Math.max(nds + 1, Math.min(nde, L))
        applySharedViewport(nds, nde)
      })
    },
    [syncLayoutGeometry, seqLen, applySharedViewport],
  )

  const zoomOut = useCallback(() => runZoom("out"), [runZoom])
  const zoomIn = useCallback(() => runZoom("in"), [runZoom])

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
  }, [libsReady, seqLen])

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

  return (
    <div ref={wrapRef} className="nightingale-prototype relative w-full min-w-0 overflow-x-auto pb-1">
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
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Zoom</span>
        <button
          type="button"
          className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem]"
          onClick={zoomOut}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem]"
          onClick={zoomIn}
          aria-label="Zoom in"
        >
          +
        </button>
        <span className="text-[11px] max-w-md">
          Adjusts the residue window on all tracks. Drag the shaded window on the overview
          ruler to pan; drag its edges to zoom that region.
        </span>
        {enrichmentLoading ? (
          <span className="text-amber-600 dark:text-amber-400">Updating enrichment…</span>
        ) : null}
      </div>
      <div ref={nightingaleChromeRef} className="nightingale-dark-chrome min-w-[min(100%,52rem)]">
        <nightingale-manager ref={managerRef} style={{ display: "block" }}>
          <nightingale-navigation ref={navRef} />
          <nightingale-sequence ref={seqRef} />
          {showLine ? (
            <nightingale-linegraph-track ref={lineRef} />
          ) : null}
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

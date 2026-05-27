import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import FeatureViewerOverviewNav from "./FeatureViewerOverviewNav.jsx"
import { featureViewerTrackDefinitions } from "./mockProteinData.js"
import { isLightTheme } from "./nightingaleStripeColors.js"
import ResidueSelectionPanel from "./ResidueSelectionPanel.jsx"
import {
  clearFeatureViewerColumnHighlight,
  clearFeatureViewerSelectionHighlights,
  clientXToFeatureViewerPosition,
  readFeatureViewerViewport,
  syncFeatureViewerColumnHighlight,
  syncFeatureViewerSelectionHighlights,
} from "./residueColumnHighlight.js"
import {
  addRange,
  removeRange,
  selectionRowsFromSet,
  togglePosition,
} from "./residueSelection.js"
import { formatMagnification, minimumViewportLength } from "./zoomReadout.js"
import { syncFeatureViewerSequenceStyle } from "./featureViewerSequenceStripes.js"
import { trimFeatureViewerSvgHeight } from "./trimFeatureViewerLayout.js"

/** @see feature-viewer `self.events.ZOOM_EVENT` */
const FV_ZOOM_EVENT = "feature-viewer-zoom-altered"

/** Petadex-owned DOM under the feature-viewer host (not library mutations). */
const FV_OWN_DECORATION =
  ".fv-residue-column-highlight, .fv-residue-position-label, .fv-residue-selection-layer, .fv-residue-selection-highlight, .petadex-fv-sequence-stripes, .petadex-fv-sequence-dots"

/**
 * @param {Node} n
 */
function isFvOwnDecorationNode(n) {
  return (
    n instanceof Element &&
    (n.matches(FV_OWN_DECORATION) || !!n.closest(FV_OWN_DECORATION))
  )
}

/**
 * @param {MutationRecord} m
 */
function isFvOwnDecorationMutation(m) {
  if (isFvOwnDecorationNode(m.target)) return true
  for (const n of m.addedNodes) {
    if (isFvOwnDecorationNode(n)) return true
  }
  for (const n of m.removedNodes) {
    if (isFvOwnDecorationNode(n)) return true
  }
  return false
}

/**
 * @param {{ start?: unknown, end?: unknown, zoom?: unknown }} d
 * @param {number} seqLen
 * @returns {{ lo: number, hi: number, zoom: number }}
 */
function viewportFromZoomDetail(d, seqLen) {
  const zRaw = d?.zoom
  const zoom =
    typeof zRaw === "string" ? parseFloat(zRaw) : Number(zRaw)
  const z = Number.isFinite(zoom) ? zoom : 1

  if (!Number.isFinite(z) || z <= 1.001) {
    return { lo: 1, hi: seqLen, zoom: 1 }
  }

  const s = Number(d?.start)
  const e = Number(d?.end)
  if (!Number.isFinite(s) || !Number.isFinite(e)) {
    return { lo: 1, hi: seqLen, zoom: 1 }
  }

  return {
    lo: Math.max(1, Math.round(s)),
    hi: Math.min(seqLen, Math.round(e)),
    zoom: z,
  }
}

/**
 * Client-only SIB feature-viewer (D3). Loads CommonJS entry which pulls jQuery/Bootstrap/CSS.
 * @param {{
 *   sequence: string,
 *   rectTrackDefs?: ReturnType<typeof import("./mockProteinData.js").featureViewerDefsFromLogicalTracks>,
 *   enrichmentLoading?: boolean,
 * }} props
 */
export default function FeatureViewerPanel({
  sequence,
  rectTrackDefs,
  enrichmentLoading,
}) {
  const containerRef = useRef(null)
  const scrollRef = useRef(null)
  const instanceRef = useRef(null)
  /** Brush-domain extent [lo, hi] used by `instance.zoom(lo, hi)` (matches library internals). */
  const viewportRef = useRef({ lo: 1, hi: 1 })
  /** Mirrors {@link viewportRef} for button disabled state (ref alone does not re-render). */
  const [brushExtent, setBrushExtent] = useState(
    /** @type {{ lo: number, hi: number } | null} */ (null),
  )
  const zoomSvgRef = useRef(/** @type {SVGSVGElement | null} */ (null))
  /** Last hovered residue (1-based); restored after layout / zoom repaints. */
  const hoverPositionRef = useRef(/** @type {number | null} */ (null))
  /** Anchor for shift+click range (1-based). */
  const selectionAnchorRef = useRef(/** @type {number | null} */ (null))
  /** @type {React.MutableRefObject<{ active: boolean, anchor: number | null, preDrag: Set<number>, moved: boolean, shiftKey: boolean }>} */
  const dragSelectRef = useRef({
    active: false,
    anchor: null,
    preDrag: new Set(),
    moved: false,
    shiftKey: false,
  })
  const [selectedPositions, setSelectedPositions] = useState(
    () => new Set(),
  )
  const selectedPositionsRef = useRef(selectedPositions)
  const [mounted, setMounted] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const reactId = useId()
  const fvDomId = `fv-proto-${reactId.replace(/:/g, "")}`

  const seqLen = sequence?.length ?? 0

  const mockDefs = useMemo(
    () => featureViewerTrackDefinitions(seqLen),
    [seqLen],
  )

  const defs = rectTrackDefs?.length ? rectTrackDefs : mockDefs

  /** Same cap as passed to feature-viewer; brushend only zooms when extent length exceeds this. */
  const zoomMaxLib = useMemo(() => minimumViewportLength(seqLen), [seqLen])

  const selectedSorted = useMemo(
    () => [...selectedPositions].sort((a, b) => a - b),
    [selectedPositions],
  )

  const selectionRows = useMemo(
    () => selectionRowsFromSet(selectedPositions, sequence),
    [selectedPositions, sequence],
  )

  useEffect(() => {
    selectedPositionsRef.current = selectedPositions
  }, [selectedPositions])

  const repaintVisuals = useCallback(
    (/** @type {number | null} */ hoverPos) => {
      const host = containerRef.current
      if (!host) return
      const light = isLightTheme()
      const vp = readFeatureViewerViewport(
        host,
        seqLen,
        brushExtent ?? viewportRef.current,
        sequence,
      )
      if (selectedSorted.length === 0) {
        clearFeatureViewerSelectionHighlights(host)
      } else {
        syncFeatureViewerSelectionHighlights(host, selectedSorted, vp, light)
      }
      if (hoverPos == null) {
        clearFeatureViewerColumnHighlight(host)
        return
      }
      syncFeatureViewerColumnHighlight(
        host,
        hoverPos,
        vp,
        light,
        sequence,
      )
    },
    [selectedSorted, sequence, seqLen, brushExtent],
  )

  const applyColumnHighlight = useCallback(
    (/** @type {number | null} */ position) => {
      hoverPositionRef.current = position
      repaintVisuals(position)
    },
    [repaintVisuals],
  )

  const handleClearSelection = useCallback(() => {
    setSelectedPositions(new Set())
    selectionAnchorRef.current = null
    repaintVisuals(hoverPositionRef.current)
  }, [repaintVisuals])

  const handleRemoveSelectionEntry = useCallback(
    (lo, hi) => {
      setSelectedPositions(prev => removeRange(prev, lo, hi))
      repaintVisuals(hoverPositionRef.current)
    },
    [repaintVisuals],
  )

  useEffect(() => {
    setSelectedPositions(new Set())
    selectionAnchorRef.current = null
    const host = containerRef.current
    if (host) {
      clearFeatureViewerSelectionHighlights(host)
      clearFeatureViewerColumnHighlight(host)
    }
  }, [sequence])

  useEffect(() => {
    if (seqLen <= 0) return
    setSelectedPositions(prev => {
      const next = new Set(
        [...prev].filter(p => Number.isFinite(p) && p >= 1 && p <= seqLen),
      )
      return next.size === prev.size ? prev : next
    })
  }, [seqLen])

  const applyViewportFromEvent = useCallback(
    (/** @type {CustomEvent} */ ev) => {
      const d = ev.detail
      if (!d || typeof d !== "object") return
      const vp = viewportFromZoomDetail(d, seqLen)
      viewportRef.current = { lo: vp.lo, hi: vp.hi }
      setBrushExtent({ lo: vp.lo, hi: vp.hi })
      setZoomScale(vp.zoom)
    },
    [seqLen],
  )

  const handleResetZoom = useCallback(() => {
    try {
      instanceRef.current?.resetZoom?.()
    } catch {
      /* ignore */
    }
    viewportRef.current = { lo: 1, hi: seqLen }
    setBrushExtent({ lo: 1, hi: seqLen })
    setZoomScale(1)
  }, [seqLen])

  const runFeatureZoom = useCallback(
    (lo, hi) => {
      const ft = instanceRef.current
      if (!ft || typeof ft.zoom !== "function") return
      const L = seqLen
      if (L <= 0) return
      let a = Math.min(lo, hi)
      let b = Math.max(lo, hi)
      const minLen = zoomMaxLib + 0.01
      if (b - a <= minLen) {
        const mid = (a + b) / 2
        a = mid - minLen / 2
        b = mid + minLen / 2
      }
      a = Math.max(1, a)
      b = Math.min(L, b)
      if (b - a <= minLen) {
        a = Math.max(1, b - minLen - 0.02)
      }
      const span = Math.max(1, b - a)
      viewportRef.current = { lo: a, hi: b }
      setBrushExtent({ lo: a, hi: b })
      setZoomScale(L / span)
      try {
        ft.zoom(a, b)
      } catch {
        /* ignore */
      }
    },
    [seqLen, zoomMaxLib],
  )

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
    runFeatureZoom(a, b)
  }, [runFeatureZoom, seqLen, zoomMaxLib])

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
    runFeatureZoom(a, b)
  }, [handleResetZoom, runFeatureZoom, seqLen])

  const panByResidues = useCallback(
    (delta) => {
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
      runFeatureZoom(a, b)
    },
    [runFeatureZoom, seqLen],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current || !sequence || seqLen === 0) return

    const el = containerRef.current
    el.id = fvDomId

    let cancelled = false
    let layoutRaf = 0
    /** @type {MutationObserver | null} */
    let variantUiObserver = null
    /** @type {((ev: Event) => void) | null} */
    let onZoomLayout = null
    /** @type {((ev: MouseEvent) => void) | null} */
    let blockContextZoom = null

    ;(async () => {
      const mod = await import("feature-viewer")
      await import("../../styles/feature-viewer-overrides.css")
      const { createFeature } = mod
      if (cancelled || !containerRef.current) return

      const ft = new createFeature(sequence, `#${fvDomId}`, {
        showAxis: true,
        showSequence: true,
        brushActive: false,
        toolbar: false,
        bubbleHelp: false,
        showvariant: false,
        zoomMax: zoomMaxLib,
      })

      instanceRef.current = ft
      viewportRef.current = { lo: 1, hi: seqLen }
      setBrushExtent({ lo: 1, hi: seqLen })
      setZoomScale(1)

      defs.forEach(def => {
        ft.addFeature(def.feature)
      })

      zoomSvgRef.current = containerRef.current?.querySelector("svg") ?? null
      zoomSvgRef.current?.addEventListener(FV_ZOOM_EVENT, applyViewportFromEvent)

      /* Right-click reset zoom lives on overview toolbar (1×), not inside the track panel */
      const svgEl = zoomSvgRef.current
      blockContextZoom = (/** @type {MouseEvent} */ e) => {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
      svgEl?.addEventListener("contextmenu", blockContextZoom, true)

      /* feature-viewer always injects neXtProt variant popups with the toolbar; remove them. */
      const host = containerRef.current
      if (!cancelled && host) {
        const stripVariantPopups = () => {
          host
            .querySelectorAll(".single-variant-popup, .multiple-variant-popup")
            .forEach(node => node.remove())
        }
        const observeOpts = { childList: true, subtree: true }

        const runLayoutPass = () => {
          variantUiObserver?.disconnect()
          try {
            stripVariantPopups()
            syncFeatureViewerSequenceStyle(host, viewportRef.current)
            trimFeatureViewerSvgHeight(host)
            const sel = [...selectedPositionsRef.current].sort(
              (a, b) => a - b,
            )
            const light = isLightTheme()
            const vp = readFeatureViewerViewport(
              host,
              seqLen,
              viewportRef.current,
            )
            if (sel.length === 0) {
              clearFeatureViewerSelectionHighlights(host)
            } else {
              syncFeatureViewerSelectionHighlights(host, sel, vp, light)
            }
            if (hoverPositionRef.current != null) {
              syncFeatureViewerColumnHighlight(
                host,
                hoverPositionRef.current,
                vp,
                light,
                sequence,
              )
            } else {
              clearFeatureViewerColumnHighlight(host)
            }
          } finally {
            if (!cancelled && variantUiObserver) {
              variantUiObserver.observe(host, observeOpts)
            }
          }
        }

        const scheduleLayoutPass = () => {
          cancelAnimationFrame(layoutRaf)
          layoutRaf = requestAnimationFrame(() => {
            layoutRaf = 0
            runLayoutPass()
          })
        }

        runLayoutPass()
        requestAnimationFrame(scheduleLayoutPass)

        variantUiObserver = new MutationObserver(mutations => {
          if (
            mutations.length > 0 &&
            mutations.every(isFvOwnDecorationMutation)
          ) {
            return
          }
          scheduleLayoutPass()
        })
        variantUiObserver.observe(host, observeOpts)

        const svg = zoomSvgRef.current
        if (svg) {
          onZoomLayout = () => scheduleLayoutPass()
          svg.addEventListener(FV_ZOOM_EVENT, onZoomLayout)
        }
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(layoutRaf)
      if (onZoomLayout && zoomSvgRef.current) {
        zoomSvgRef.current.removeEventListener(FV_ZOOM_EVENT, onZoomLayout)
      }
      if (blockContextZoom && zoomSvgRef.current) {
        zoomSvgRef.current.removeEventListener("contextmenu", blockContextZoom, true)
      }
      zoomSvgRef.current?.removeEventListener(FV_ZOOM_EVENT, applyViewportFromEvent)
      zoomSvgRef.current = null
      variantUiObserver?.disconnect()
      variantUiObserver = null
      try {
        instanceRef.current?.clearInstance?.()
      } catch {
        /* ignore teardown errors from legacy library */
      }
      instanceRef.current = null
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [
    mounted,
    fvDomId,
    sequence,
    seqLen,
    defs,
    zoomMaxLib,
    applyViewportFromEvent,
  ])

  useEffect(() => {
    viewportRef.current = { lo: 1, hi: seqLen }
    setBrushExtent({ lo: 1, hi: seqLen })
    setZoomScale(1)
  }, [seqLen])

  useEffect(() => {
    const sc = scrollRef.current
    const host = containerRef.current
    if (!sc || !host || !mounted || seqLen === 0) return

    let raf = 0

    const resolvePosition = (/** @type {PointerEvent} */ e) => {
      const vp = brushExtent ?? viewportRef.current
      return clientXToFeatureViewerPosition(
        host,
        e.clientX,
        vp,
        e.clientY,
        seqLen,
        sequence,
      )
    }

    const isSequenceLetter = (/** @type {EventTarget | null} */ target) => {
      if (!(target instanceof Element)) return false
      return !!target.closest(".seqGroup text.AA")
    }

    const finishDrag = (/** @type {PointerEvent} */ e) => {
      const drag = dragSelectRef.current
      if (!drag.active) return

      drag.active = false
      const pos = resolvePosition(e) ?? drag.anchor
      if (pos == null) return

      if (!drag.moved) {
        setSelectedPositions(prev => togglePosition(prev, pos))
        selectionAnchorRef.current = pos
      } else if (drag.anchor != null) {
        setSelectedPositions(addRange(drag.preDrag, drag.anchor, pos))
        selectionAnchorRef.current = pos
      }

      if (sc.hasPointerCapture(e.pointerId)) {
        try {
          sc.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
    }

    const onPointerDown = (/** @type {PointerEvent} */ e) => {
      if (e.button !== 0 || !isSequenceLetter(e.target)) return

      e.preventDefault()
      e.stopPropagation()

      const pos = resolvePosition(e)
      if (pos == null) return

      // Preserve the most recent concrete residue immediately, even if pointerup gets lost.
      if (!e.shiftKey || selectionAnchorRef.current == null) {
        selectionAnchorRef.current = pos
      }

      if (e.shiftKey && selectionAnchorRef.current != null) {
        const rangeStart = selectionAnchorRef.current
        setSelectedPositions(prev =>
          addRange(prev, rangeStart, pos),
        )
        selectionAnchorRef.current = pos
        dragSelectRef.current = {
          active: false,
          anchor: pos,
          preDrag: new Set(),
          moved: false,
          shiftKey: true,
        }
        return
      }

      dragSelectRef.current = {
        active: true,
        anchor: pos,
        preDrag: new Set(selectedPositionsRef.current),
        moved: false,
        shiftKey: false,
      }

      try {
        sc.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    const onPointerMove = (/** @type {PointerEvent} */ e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const pos = resolvePosition(e)
        const drag = dragSelectRef.current

        if (drag.active && drag.anchor != null && pos != null) {
          if (pos !== drag.anchor) drag.moved = true
          setSelectedPositions(
            addRange(drag.preDrag, drag.anchor, pos),
          )
        }

        applyColumnHighlight(pos)
      })
    }

    const onPointerLeave = () => {
      if (!dragSelectRef.current.active) {
        applyColumnHighlight(null)
      }
    }

    const onPointerUp = (/** @type {PointerEvent} */ e) => {
      finishDrag(e)
    }

    const blockVariantClick = (/** @type {MouseEvent} */ e) => {
      if (!isSequenceLetter(e.target)) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    sc.addEventListener("pointerdown", onPointerDown)
    sc.addEventListener("pointermove", onPointerMove)
    sc.addEventListener("pointerleave", onPointerLeave)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    host.addEventListener("click", blockVariantClick, true)

    return () => {
      cancelAnimationFrame(raf)
      dragSelectRef.current.active = false
      sc.removeEventListener("pointerdown", onPointerDown)
      sc.removeEventListener("pointermove", onPointerMove)
      sc.removeEventListener("pointerleave", onPointerLeave)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      host.removeEventListener("click", blockVariantClick, true)
      hoverPositionRef.current = null
      clearFeatureViewerColumnHighlight(host)
      clearFeatureViewerSelectionHighlights(host)
    }
  }, [mounted, seqLen, brushExtent, applyColumnHighlight])

  useEffect(() => {
    if (!mounted || seqLen === 0) return
    repaintVisuals(hoverPositionRef.current)
  }, [mounted, seqLen, brushExtent, selectedSorted, repaintVisuals])

  useEffect(() => {
    const host = containerRef.current
    if (!host || !mounted || seqLen === 0) return

    const run = () => {
      syncFeatureViewerSequenceStyle(host, viewportRef.current)
      repaintVisuals(hoverPositionRef.current)
    }
    run()

    const themeMo = new MutationObserver(() => {
      requestAnimationFrame(run)
    })
    themeMo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => themeMo.disconnect()
  }, [mounted, seqLen, brushExtent, sequence, repaintVisuals])

  useEffect(() => {
    const sc = scrollRef.current
    if (!sc || !mounted || seqLen === 0) return

    const onWheel = (/** @type {WheelEvent} */ e) => {
      if (!instanceRef.current) return
      const L = seqLen
      const { lo, hi } = viewportRef.current
      const span = hi - lo
      if (L <= 0 || span >= L - 0.5) return

      const dx = e.deltaX
      const dy = e.shiftKey ? e.deltaY : 0
      const delta = dx + dy
      if (!delta) return

      e.preventDefault()
      const step = Math.max(1, Math.floor(span * 0.06))
      const dir = Math.sign(delta)
      panByResidues(dir * step)
    }

    sc.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      sc.removeEventListener("wheel", onWheel)
    }
  }, [mounted, seqLen, panByResidues])

  const zoomedPastOne = zoomScale > 1.001
  const extentLen =
    brushExtent && brushExtent.hi > brushExtent.lo
      ? brushExtent.hi - brushExtent.lo
      : Math.max(0, seqLen - 1)
  const canZoomIn = seqLen > zoomMaxLib + 1 && extentLen > zoomMaxLib + 1.5
  const canZoomOut = zoomedPastOne

  const fvZoomReadout =
    seqLen > 0
      ? brushExtent
        ? `${brushExtent.lo}–${brushExtent.hi} · ${formatMagnification(zoomScale)}`
        : `1–${seqLen} · ${formatMagnification(1)}`
      : ""

  if (!mounted) {
    return (
      <div className="min-h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        Loading feature-viewer…
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
    <div className="w-full">
      {enrichmentLoading ? (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
          Updating enrichment…
        </p>
      ) : (
        <p className="text-xs text-muted-foreground mb-2">
          Click a letter first, then Shift+click another to select the range between them
          (or drag across letters). Adjacent picks show as one range in the panel.
          Hover for a preview column.
        </p>
      )}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
        <div className="min-w-0">
          <FeatureViewerOverviewNav
            seqLen={seqLen}
            viewport={brushExtent}
            zoomMaxLib={zoomMaxLib}
            onViewportChange={runFeatureZoom}
            zoomReadout={fvZoomReadout}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            zoomedPastOne={zoomedPastOne}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onPanLeft={() => {
              const { lo, hi } = viewportRef.current
              const span = hi - lo
              panByResidues(-Math.max(5, Math.floor(span * 0.12)))
            }}
            onPanRight={() => {
              const { lo, hi } = viewportRef.current
              const span = hi - lo
              panByResidues(Math.max(5, Math.floor(span * 0.12)))
            }}
          />
          <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background"
          >
            <div
              ref={containerRef}
              className="fv-prototype w-full min-w-0"
            />
          </div>
        </div>
        <ResidueSelectionPanel
          rows={selectionRows}
          totalCount={selectedSorted.length}
          onClearAll={handleClearSelection}
          onRemoveEntry={handleRemoveSelectionEntry}
        />
      </div>
    </div>
  )
}

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { featureViewerTrackDefinitions } from "./mockProteinData.js"

/** @see feature-viewer `self.events.ZOOM_EVENT` */
const FV_ZOOM_EVENT = "feature-viewer-zoom-altered"

/**
 * @param {Array<{ values?: Array<{ position: number, value: number }> }> | null | undefined} lineDataRows
 * @returns {Array<{ x: number, y: number, description: string }> | null}
 */
export function featureViewerPointsFromLineData(lineDataRows) {
  const row = Array.isArray(lineDataRows) ? lineDataRows[0] : null
  if (!row?.values?.length) return null
  return row.values.map(({ position, value }) => ({
    x: position,
    y: value,
    description: `pLDDT ${Number(value).toFixed(1)} (residue ${position})`,
  }))
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

  return { lo: s + 1, hi: e - 1, zoom: z }
}

/**
 * Client-only SIB feature-viewer (D3). Loads CommonJS entry which pulls jQuery/Bootstrap/CSS.
 * @param {{
 *   sequence: string,
 *   rectTrackDefs?: ReturnType<typeof import("./mockProteinData.js").featureViewerDefsFromLogicalTracks>,
 *   lineData?: Array<{ values?: Array<{ position: number, value: number }> }> | null,
 *   enrichmentLoading?: boolean,
 * }} props
 */
export default function FeatureViewerPanel({
  sequence,
  rectTrackDefs,
  lineData,
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

  const linePts = useMemo(() => featureViewerPointsFromLineData(lineData), [lineData])

  /** Same cap as passed to feature-viewer; brushend only zooms when extent length exceeds this. */
  const zoomMaxLib = useMemo(
    () => Math.min(120, Math.max(30, Math.ceil(seqLen / 5))),
    [seqLen],
  )

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
    /** @type {MutationObserver | null} */
    let variantUiObserver = null

    ;(async () => {
      const mod = await import("feature-viewer")
      await import("../../styles/feature-viewer-overrides.css")
      const { createFeature } = mod
      if (cancelled || !containerRef.current) return

      const ft = new createFeature(sequence, `#${fvDomId}`, {
        showAxis: true,
        showSequence: true,
        brushActive: false,
        toolbar: true,
        bubbleHelp: false,
        showvariant: false,
        zoomMax: zoomMaxLib,
      })

      instanceRef.current = ft
      viewportRef.current = { lo: 1, hi: seqLen }
      setBrushExtent({ lo: 1, hi: seqLen })
      setZoomScale(1)

      if (linePts?.length) {
        ft.addFeature({
          data: linePts,
          name: "pLDDT (AlphaFold)",
          className: "fv-track-plddt",
          color: "#6366f1",
          type: "line",
          height: "12",
          interpolation: "linear",
        })
      }

      defs.forEach(def => {
        ft.addFeature(def.feature)
      })

      zoomSvgRef.current = containerRef.current?.querySelector("svg") ?? null
      zoomSvgRef.current?.addEventListener(FV_ZOOM_EVENT, applyViewportFromEvent)

      /* feature-viewer always injects neXtProt variant popups with the toolbar; remove them. */
      const host = containerRef.current
      if (!cancelled && host) {
        const stripVariantPopups = () => {
          host
            .querySelectorAll(".single-variant-popup, .multiple-variant-popup")
            .forEach(node => node.remove())
        }
        stripVariantPopups()
        variantUiObserver = new MutationObserver(stripVariantPopups)
        variantUiObserver.observe(host, { childList: true, subtree: true })
      }
    })()

    return () => {
      cancelled = true
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
    linePts,
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
          Use + / − to zoom the residue window. When zoomed, horizontal trackpad scroll or
          Shift+vertical scroll pans; « / » nudge the window. pLDDT appears as a line track when
          AlphaFold length matches the Petadex sequence.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground">
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
          title={zoomedPastOne ? "Show the full sequence (1×)" : "Already showing the full sequence"}
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
        <span className="text-[11px] max-w-md text-muted-foreground">
          Scroll the track area horizontally (or Shift+scroll) when zoomed.
        </span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-border bg-background"
      >
        <div
          ref={containerRef}
          className="fv-prototype min-h-[320px] w-full min-w-0"
        />
      </div>
    </div>
  )
}

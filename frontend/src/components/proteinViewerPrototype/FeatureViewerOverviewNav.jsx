import React, { useCallback, useEffect, useRef } from "react"
import * as d3 from "d3"

const NAV_HEIGHT = 56
const MARGIN = { left: 36, right: 12, top: 10, bottom: 22 }

/**
 * Compact overview ruler with draggable window (Nightingale-style navigation).
 * Zoom buttons live here — not inside the feature-viewer SVG panel below.
 * @param {{
 *   seqLen: number,
 *   viewport: { lo: number, hi: number } | null,
 *   zoomMaxLib: number,
 *   onViewportChange: (lo: number, hi: number) => void,
 *   zoomReadout?: string,
 *   canZoomIn?: boolean,
 *   canZoomOut?: boolean,
 *   zoomedPastOne?: boolean,
 *   onZoomIn?: () => void,
 *   onZoomOut?: () => void,
 *   onResetZoom?: () => void,
 *   onPanLeft?: () => void,
 *   onPanRight?: () => void,
 *   plotMarginLeft?: number,
 *   plotMarginRight?: number,
 *   drawWrapRef?: React.MutableRefObject<HTMLElement | null>,
 * }} props
 */
export default function FeatureViewerOverviewNav({
  seqLen,
  viewport,
  zoomMaxLib,
  onViewportChange,
  zoomReadout = "",
  canZoomIn = false,
  canZoomOut = false,
  zoomedPastOne = false,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPanLeft,
  onPanRight,
  plotMarginLeft = MARGIN.left,
  plotMarginRight = MARGIN.right,
  drawWrapRef,
}) {
  const wrapRef = useRef(null)
  const setDrawWrapRef = useCallback(
    /** @param {HTMLDivElement | null} el */
    el => {
      wrapRef.current = el
      if (drawWrapRef) drawWrapRef.current = el
    },
    [drawWrapRef],
  )
  const svgRef = useRef(null)
  const onChangeRef = useRef(onViewportChange)
  onChangeRef.current = onViewportChange
  const suppressBrushRef = useRef(false)
  const draggingRef = useRef(false)
  const viewportRef = useRef({ lo: 1, hi: 1 })
  /** @type {React.MutableRefObject<{ brush: d3.BrushBehavior<unknown>, brushG: d3.Selection<SVGGElement, unknown, null, undefined>, x: d3.ScaleLinear<number, number> } | null>} */
  const brushApiRef = useRef(null)

  const lo = viewport?.lo ?? 1
  const hi = viewport?.hi ?? seqLen
  viewportRef.current = { lo, hi }

  useEffect(() => {
    const wrap = wrapRef.current
    const svgEl = svgRef.current
    if (!wrap || !svgEl || seqLen <= 0) return

    const minSpan = Math.max(2, Math.ceil(zoomMaxLib) + 1)

    const clampWindow = (a, b) => {
      let loR = Math.round(Math.min(a, b))
      let hiR = Math.round(Math.max(a, b))
      if (hiR - loR < minSpan) {
        const mid = (loR + hiR) / 2
        loR = Math.round(mid - minSpan / 2)
        hiR = Math.round(mid + minSpan / 2)
      }
      loR = Math.max(1, loR)
      hiR = Math.min(seqLen, hiR)
      if (hiR - loR < minSpan) {
        loR = Math.max(1, hiR - minSpan)
      }
      return [loR, hiR]
    }

    const marginLeft = plotMarginLeft
    const marginRight = plotMarginRight
    const draw = () => {
      const width = Math.max(280, wrap.clientWidth || 280)
      const innerW = width - marginLeft - marginRight
      const innerH = NAV_HEIGHT - MARGIN.top - MARGIN.bottom

      const x = d3
        .scaleLinear()
        .domain([1, seqLen])
        .range([marginLeft, width - marginRight])

      const svg = d3.select(svgEl)
      svg.selectAll("*").remove()
      svg.attr("width", width).attr("height", NAV_HEIGHT)

      svg
        .append("rect")
        .attr("class", "fv-overview-track")
        .attr("x", marginLeft)
        .attr("y", MARGIN.top)
        .attr("width", innerW)
        .attr("height", innerH)
        .attr("rx", 4)

      const axis = d3
        .axisBottom(x)
        .ticks(Math.min(8, Math.max(3, Math.floor(innerW / 72))))
        .tickSize(4)
        .tickPadding(6)

      svg
        .append("g")
        .attr("class", "fv-overview-axis")
        .attr("transform", `translate(0,${NAV_HEIGHT - MARGIN.bottom + 4})`)
        .call(axis)

      let brushRaf = 0
      const applyBrushSelection = (/** @type {d3.D3BrushEvent<unknown>} */ event) => {
        if (suppressBrushRef.current || !event.selection) return
        const [px0, px1] = event.selection
        const [loR, hiR] = clampWindow(x.invert(px0), x.invert(px1))
        const vp = viewportRef.current
        if (loR === vp.lo && hiR === vp.hi) return
        onChangeRef.current(loR, hiR)
      }

      const brush = d3
        .brushX()
        .extent([
          [marginLeft, MARGIN.top],
          [width - marginRight, MARGIN.top + innerH],
        ])
        .on("start", () => {
          draggingRef.current = true
        })
        .on("brush", event => {
          cancelAnimationFrame(brushRaf)
          brushRaf = requestAnimationFrame(() => applyBrushSelection(event))
        })
        .on("end", event => {
          draggingRef.current = false
          cancelAnimationFrame(brushRaf)
          applyBrushSelection(event)
        })

      const brushG = svg.append("g").attr("class", "fv-overview-brush").call(brush)
      brushApiRef.current = { brush, brushG, x }

      const pxLo = x(lo)
      const pxHi = x(hi)
      suppressBrushRef.current = true
      brushG.call(brush.move, pxHi > pxLo ? [pxLo, pxHi] : null)
      requestAnimationFrame(() => {
        suppressBrushRef.current = false
      })
    }

    draw()

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => draw())
        : null
    ro?.observe(wrap)

    return () => {
      ro?.disconnect()
      brushApiRef.current = null
    }
  }, [seqLen, zoomMaxLib, plotMarginLeft, plotMarginRight])

  useEffect(() => {
    if (draggingRef.current) return
    const api = brushApiRef.current
    if (!api || seqLen <= 0) return
    const pxLo = api.x(lo)
    const pxHi = api.x(hi)
    if (!Number.isFinite(pxLo) || !Number.isFinite(pxHi) || pxHi <= pxLo) return
    const current = api.brushG.select(".selection").node()
    if (current instanceof SVGRectElement) {
      const cx = parseFloat(current.getAttribute("x") || "")
      const cw = parseFloat(current.getAttribute("width") || "")
      if (
        Number.isFinite(cx) &&
        Number.isFinite(cw) &&
        Math.abs(cx - pxLo) < 0.5 &&
        Math.abs(cx + cw - pxHi) < 0.5
      ) {
        return
      }
    }
    suppressBrushRef.current = true
    api.brushG.call(api.brush.move, [pxLo, pxHi])
    requestAnimationFrame(() => {
      suppressBrushRef.current = false
    })
  }, [lo, hi, seqLen])

  if (seqLen <= 0) return null

  return (
    <div
      className="fv-overview-nav-shell mb-2 w-full min-w-0 space-y-1"
      aria-label="Sequence overview and zoom"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground px-0.5">
        <span className="font-medium text-foreground">Zoom</span>
        <button
          type="button"
          className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem]"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
          title="Show more of the sequence"
        >
          −
        </button>
        <button
          type="button"
          className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem]"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
          title="Magnify a shorter residue window"
        >
          +
        </button>
        <button
          type="button"
          className="btn btn-secondary text-sm px-2 py-1 min-w-[2.25rem] disabled:opacity-40"
          onClick={onResetZoom}
          disabled={!zoomedPastOne}
          aria-label="Reset zoom to full sequence (1×)"
          title={zoomedPastOne ? "Show the full sequence (1×)" : "Already showing the full sequence"}
        >
          1×
        </button>
        <button
          type="button"
          className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem] disabled:opacity-40"
          onClick={onPanLeft}
          disabled={!zoomedPastOne}
          aria-label="Pan view toward N-terminus"
          title="Pan left (N-terminus)"
        >
          «
        </button>
        <button
          type="button"
          className="btn btn-secondary text-sm px-2 py-1 min-w-[2rem] disabled:opacity-40"
          onClick={onPanRight}
          disabled={!zoomedPastOne}
          aria-label="Pan view toward C-terminus"
          title="Pan right (C-terminus)"
        >
          »
        </button>
        {zoomReadout ? (
          <span
            className="text-[11px] tabular-nums text-muted-foreground whitespace-nowrap"
            aria-live="polite"
          >
            {zoomReadout}
          </span>
        ) : null}
        <span className="text-[11px] max-w-md text-muted-foreground">
          Drag the shaded window on the ruler to pan or resize the visible range.
        </span>
      </div>
      <div
        ref={setDrawWrapRef}
        className="fv-overview-nav rounded-lg border border-border bg-surface-sunken pt-1"
      >
        <svg ref={svgRef} className="block w-full" role="presentation" />
      </div>
    </div>
  )
}

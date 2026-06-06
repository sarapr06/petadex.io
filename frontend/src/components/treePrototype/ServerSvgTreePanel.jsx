import React, { useCallback, useLayoutEffect, useRef, useState } from "react"

/** @param {HTMLElement} container @param {SVGSVGElement} svgEl */
function computeFitTransform(container, svgEl) {
  const pad = 24
  const cw = container.clientWidth
  const ch = container.clientHeight
  if (cw <= 0 || ch <= 0) return { x: 0, y: 0, k: 1 }

  const bbox = svgEl.getBBox()
  if (bbox.width <= 0 || bbox.height <= 0) return { x: 0, y: 0, k: 1 }

  const k = Math.min((cw - pad * 2) / bbox.width, (ch - pad * 2) / bbox.height, 2)
  const x = (cw - bbox.width * k) / 2 - bbox.x * k
  const y = (ch - bbox.height * k) / 2 - bbox.y * k
  return { x, y, k }
}

/**
 * Display a server-rendered SVG tree (ETE3 or Biopython) with pan/zoom.
 * @param {{
 *   engineLabel: string,
 *   loading: boolean,
 *   error: string | null,
 *   svg: string,
 *   renderMs: number | null,
 * }} props
 */
export default function ServerSvgTreePanel({
  engineLabel,
  loading,
  error,
  svg,
  renderMs,
}) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const dragRef = useRef(null)
  const fitRef = useRef(/** @type {{ x: number, y: number, k: number } | null} */ (null))
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [hoverTip, setHoverTip] = useState(
    /** @type {{ left: number, top: number, label: string } | null} */ (null),
  )

  const applyFit = useCallback(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return
    const svgEl = content.querySelector("svg")
    if (!(svgEl instanceof SVGSVGElement)) return
    const fit = computeFitTransform(container, svgEl)
    fitRef.current = fit
    setTransform(fit)
  }, [])

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content || !svg?.trim()) return
    content.innerHTML = svg.trim()
    const svgEl = content.querySelector("svg")
    if (svgEl instanceof SVGSVGElement) {
      svgEl.style.display = "block"
      svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet")
    }
    content.querySelectorAll(".petadex-tree-node").forEach(el => {
      if (el instanceof SVGElement) {
        el.style.cursor = "pointer"
      }
    })
    applyFit()
    setHoverTip(null)
  }, [svg, applyFit])

  const onWheel = useCallback(e => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => ({
      ...t,
      k: Math.min(Math.max(t.k * factor, 0.15), 8),
    }))
  }, [])

  const onMouseDown = useCallback(
    e => {
      dragRef.current = {
        startX: e.clientX - transform.x,
        startY: e.clientY - transform.y,
      }
    },
    [transform.x, transform.y],
  )

  const onMouseMove = useCallback(e => {
    const d = dragRef.current
    if (d) {
      setHoverTip(null)
      setTransform(t => ({
        ...t,
        x: e.clientX - d.startX,
        y: e.clientY - d.startY,
      }))
      return
    }

    const container = containerRef.current
    const hit = document.elementFromPoint(e.clientX, e.clientY)
    const nodeEl = hit?.closest?.(".petadex-tree-node")
    if (container && nodeEl instanceof Element) {
      const label = nodeEl.getAttribute("data-node-label")
      if (label) {
        const rect = container.getBoundingClientRect()
        setHoverTip({
          left: e.clientX - rect.left + 12,
          top: e.clientY - rect.top - 10,
          label,
        })
        return
      }
    }
    setHoverTip(null)
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current = null
  }, [])

  const clearHoverTip = useCallback(() => {
    setHoverTip(null)
  }, [])

  const resetView = useCallback(() => {
    if (fitRef.current) {
      setTransform(fitRef.current)
      return
    }
    applyFit()
  }, [applyFit])

  if (loading) {
    return (
      <div className="min-h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        Rendering with {engineLabel}…
      </div>
    )
  }

  if (error) {
    const isAwsError = /AWS credentials|S3/i.test(error)
    const isPythonError = /Python|venv|ete3|biopython|PyQt/i.test(error)

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-2">
        <p className="font-medium">{engineLabel} render failed</p>
        <p className="text-xs">{error}</p>
        {isAwsError ? (
          <p className="text-xs text-muted-foreground">
            Live mode needs S3 access to fetch the Newick file first. Switch to{" "}
            <strong className="text-foreground">Mock demo tree</strong> to try {engineLabel}{" "}
            without AWS, or add{" "}
            <code className="font-mono">AWS_ACCESS_KEY_ID</code> /{" "}
            <code className="font-mono">AWS_SECRET_ACCESS_KEY</code> to{" "}
            <code className="font-mono">backend/.env</code>.
          </p>
        ) : isPythonError ? (
          <p className="text-xs text-muted-foreground">
            Install Python deps:{" "}
            <code className="font-mono">
              cd backend && python3 -m venv .venv-trees && .venv-trees/bin/pip install -r
              scripts/requirements-trees.txt
            </code>
          </p>
        ) : null}
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="min-h-[200px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        No SVG to display.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <p className="text-xs text-muted-foreground m-0">
          SVG from {engineLabel} (server-side Python).
          {renderMs != null ? ` Rendered in ${renderMs} ms.` : null}
          {" "}Scroll to zoom · drag to pan · hover nodes for labels.
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.25, 8) }))}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k * 0.8, 0.15) }))}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="h-8 px-2 flex items-center justify-center rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={resetView}
          >
            Reset
          </button>
        </div>
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={containerRef}
        className="relative w-full bg-white overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: 520 }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={() => {
          endDrag()
          clearHoverTip()
        }}
        aria-label={`${engineLabel} phylogenetic tree`}
      >
        {hoverTip ? (
          <div
            className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs text-foreground shadow-md"
            style={{ left: hoverTip.left, top: hoverTip.top }}
            role="tooltip"
          >
            {hoverTip.label}
          </div>
        ) : null}
        <div
          ref={contentRef}
          className="inline-block origin-top-left"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
            transformOrigin: "0 0",
          }}
        />
      </div>
    </div>
  )
}

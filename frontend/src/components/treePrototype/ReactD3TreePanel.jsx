import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  countTips,
  parseNewick,
  toReactD3Datum,
  treeNodeTooltip,
} from "./newickUtils.js"

/**
 * @param {{
 *   newick: string,
 *   height?: number,
 *   onTreeReady?: (info: { tipCount: number }) => void,
 * }} props
 */
export default function ReactD3TreePanel({
  newick,
  height = 520,
  onTreeReady,
}) {
  const [mounted, setMounted] = useState(false)
  const [TreeComponent, setTreeComponent] = useState(null)
  const [renderError, setRenderError] = useState(null)
  const containerRef = useRef(null)
  const [hoverTip, setHoverTip] = useState(
    /** @type {{ left: number, top: number, label: string } | null} */ (null),
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    import("react-d3-tree")
      .then(mod => {
        if (!cancelled) setTreeComponent(() => mod.Tree)
      })
      .catch(err => {
        if (!cancelled) {
          setRenderError(err instanceof Error ? err.message : String(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [mounted])

  const { datum, tipCount, parseError } = useMemo(() => {
    if (!newick?.trim()) {
      return { datum: null, tipCount: 0, parseError: null }
    }
    try {
      const root = parseNewick(newick.trim())
      return {
        datum: toReactD3Datum(root),
        tipCount: countTips(root),
        parseError: null,
      }
    } catch (err) {
      return {
        datum: null,
        tipCount: 0,
        parseError: err instanceof Error ? err.message : String(err),
      }
    }
  }, [newick])

  useEffect(() => {
    setHoverTip(null)
  }, [datum])

  useEffect(() => {
    if (datum && !parseError) {
      onTreeReady?.({ tipCount })
    }
  }, [datum, parseError, tipCount, onTreeReady])

  const onNodeMouseOver = useCallback((node, evt) => {
    const container = containerRef.current
    if (!container || !node?.data) return
    const native = evt?.nativeEvent ?? evt
    const clientX = native?.clientX
    const clientY = native?.clientY
    if (clientX == null || clientY == null) return
    const rect = container.getBoundingClientRect()
    setHoverTip({
      left: clientX - rect.left + 12,
      top: clientY - rect.top - 10,
      label: treeNodeTooltip(node.data),
    })
  }, [])

  const onNodeMouseOut = useCallback(() => {
    setHoverTip(null)
  }, [])

  const clearHoverTip = useCallback(() => {
    setHoverTip(null)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        Loading react-d3-tree…
      </div>
    )
  }

  if (!newick?.trim()) {
    return (
      <div className="min-h-[200px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
        No Newick data to display.
      </div>
    )
  }

  if (parseError || renderError) {
    return (
      <div className="min-h-[200px] rounded-lg border border-destructive/40 bg-destructive/10 flex items-center justify-center text-sm text-destructive px-4 text-center">
        {parseError || renderError}
      </div>
    )
  }

  if (!TreeComponent || !datum) {
    return (
      <div className="min-h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        Loading tree component…
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <p className="text-xs text-muted-foreground px-3 py-2 border-b border-border">
        Cladogram layout (branch lengths shown as node attributes, not true phylogram spacing).
        Pan/zoom and collapse supported · hover nodes for labels.
      </p>
      <div
        ref={containerRef}
        className="relative w-full bg-white"
        style={{ height, width: "100%" }}
        id="react-d3-tree-container"
        onMouseLeave={clearHoverTip}
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
        <TreeComponent
          data={datum}
          orientation="horizontal"
          zoomable
          draggable
          collapsible
          initialDepth={99}
          translate={{ x: 80, y: height / 2 }}
          nodeSize={{ x: 160, y: 80 }}
          separation={{ siblings: 1, nonSiblings: 1.2 }}
          pathFunc="elbow"
          rootNodeClassName="react-d3-tree-root"
          branchNodeClassName="react-d3-tree-branch"
          leafNodeClassName="react-d3-tree-leaf"
          onNodeMouseOver={onNodeMouseOver}
          onNodeMouseOut={onNodeMouseOut}
        />
      </div>
    </div>
  )
}

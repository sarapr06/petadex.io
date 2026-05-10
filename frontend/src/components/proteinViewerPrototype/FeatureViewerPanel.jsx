import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { featureViewerTrackDefinitions } from "./mockProteinData.js"

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
  const instanceRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  const reactId = useId()
  const fvDomId = `fv-proto-${reactId.replace(/:/g, "")}`

  const seqLen = sequence?.length ?? 0

  const mockDefs = useMemo(
    () => featureViewerTrackDefinitions(seqLen),
    [seqLen],
  )

  const defs = rectTrackDefs?.length ? rectTrackDefs : mockDefs

  const linePts = useMemo(() => featureViewerPointsFromLineData(lineData), [lineData])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current || !sequence || seqLen === 0) return

    const el = containerRef.current
    el.id = fvDomId

    let cancelled = false

    ;(async () => {
      const mod = await import("feature-viewer")
      const { createFeature } = mod
      if (cancelled || !containerRef.current) return

      const zoomMax = Math.min(120, Math.max(30, Math.ceil(seqLen / 5)))

      const ft = new createFeature(sequence, `#${fvDomId}`, {
        showAxis: true,
        showSequence: true,
        brushActive: true,
        toolbar: true,
        bubbleHelp: true,
        zoomMax,
      })

      instanceRef.current = ft

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
    })()

    return () => {
      cancelled = true
      try {
        instanceRef.current?.clearInstance?.()
      } catch {
        /* ignore teardown errors from legacy lib */
      }
      instanceRef.current = null
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [mounted, fvDomId, sequence, seqLen, defs, linePts])

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
          Zoom with the built-in brush or toolbar. pLDDT uses a line track when AlphaFold
          length matches the Petadex sequence.
        </p>
      )}
      <div
        ref={containerRef}
        className="fv-prototype min-h-[320px] w-full overflow-x-auto rounded-lg border border-border bg-background"
      />
    </div>
  )
}

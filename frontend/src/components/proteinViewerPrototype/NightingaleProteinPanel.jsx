import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { nightingaleFeaturesByTrack } from "./mockProteinData.js"

/** Client-only EBI Nightingale stack (web components). */
export default function NightingaleProteinPanel({
  sequence,
  trackPayloads: trackPayloadsProp,
  linegraphData,
  enrichmentLoading,
}) {
  const wrapRef = useRef(null)
  const managerRef = useRef(null)
  const navRef = useRef(null)
  const seqRef = useRef(null)
  const lineRef = useRef(null)
  const trackRefs = useRef([])
  const [libsReady, setLibsReady] = useState(false)

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
      const w = Math.max(320, root?.offsetWidth || 920)
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
        nav.height = 50
        nav.setAttribute("ruler-start", "1")
      }

      const seqEl = seqRef.current
      apply(seqEl)
      if (seqEl) {
        seqEl.sequence = sequence
        seqEl.height = 45
      }

      const lineEl = lineRef.current
      apply(lineEl)
      if (lineEl && showLine) {
        lineEl.data = linegraphData
        lineEl.height = 72
      }

      trackPayloads.forEach((track, i) => {
        const tel = trackRefs.current[i]
        if (!tel) return
        apply(tel)
        tel.layout = "non-overlapping"
        tel.shape = "roundRectangle"
        tel.data = track.data
        tel.height = 110
      })
    },
    [sequence, seqLen, trackPayloads, linegraphData, showLine],
  )

  /** Width/length/data only — never overwrites zoom window (display-start/end). */
  const syncLayoutGeometry = useCallback(() => {
    if (!sequence || seqLen === 0) return
    const root = wrapRef.current
    if (!root) return
    const w = Math.max(320, root.offsetWidth || 920)
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
      nav.height = 50
      nav.setAttribute("ruler-start", "1")
    }

    const seqEl = seqRef.current
    applyGeom(seqEl)
    if (seqEl) {
      seqEl.sequence = sequence
      seqEl.height = 45
    }

    const lineEl = lineRef.current
    applyGeom(lineEl)
    if (lineEl && showLine) {
      lineEl.data = linegraphData
      lineEl.height = 72
    }

    trackPayloads.forEach((track, i) => {
      const tel = trackRefs.current[i]
      if (!tel) return
      applyGeom(tel)
      tel.layout = "non-overlapping"
      tel.shape = "roundRectangle"
      tel.data = track.data
      tel.height = 110
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
    <div ref={wrapRef} className="nightingale-prototype w-full overflow-x-auto">
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
          Adjusts the residue window on all tracks. You can also use the shaded
          zoom bar under the ruler when it responds.
        </span>
        {enrichmentLoading ? (
          <span className="text-amber-600 dark:text-amber-400">Updating enrichment…</span>
        ) : null}
      </div>
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
  )
}

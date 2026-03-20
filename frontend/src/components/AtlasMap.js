import React, { useEffect, useRef, useState } from "react"
import config from "../config"

const AtlasMap = () => {
  const containerRef = useRef(null)
  const deckRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pointCount, setPointCount] = useState(0)

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${config.apiUrl}/atlas/umap`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { points } = await res.json()

        const { Deck, OrthographicView } = await import("@deck.gl/core")
        const { ScatterplotLayer } = await import("@deck.gl/layers")

        if (!containerRef.current) return

        const xs = points.map(p => p.umap_x)
        const ys = points.map(p => p.umap_y)
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minY = Math.min(...ys), maxY = Math.max(...ys)
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        const xRange = maxX - minX
        const yRange = maxY - minY

        const w = containerRef.current.clientWidth * 0.85
        const h = containerRef.current.clientHeight * 0.85
        const zoom = Math.log2(Math.min(w / xRange, h / yRange))

        const maxSize = Math.max(...points.map(p => p.family_size))

        const deck = new Deck({
          parent: containerRef.current,
          views: new OrthographicView({ id: "ortho" }),
          initialViewState: {
            target: [cx, cy, 0],
            zoom,
          },
          controller: true,
          layers: [
            new ScatterplotLayer({
              id: "umap",
              data: points,
              getPosition: d => [d.umap_x, d.umap_y],
              getRadius: d => Math.sqrt(d.family_size / maxSize) * 1.5,
              radiusMinPixels: 2,
              radiusMaxPixels: 12,
              getFillColor: [100, 210, 190, 200],
              pickable: true,
            }),
          ],
          getTooltip: ({ object }) =>
            object && {
              html: `<div style="font-weight:600;margin-bottom:4px">Family ${object.family_id}</div><div>${object.family_size.toLocaleString()} sequences</div>`,
              style: {
                background: "#1e293b",
                color: "#f1f5f9",
                padding: "10px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                border: "1px solid #334155",
                pointerEvents: "none",
              },
            },
        })

        deckRef.current = deck
        setPointCount(points.length)
        setLoading(false)
      } catch (err) {
        console.error("AtlasMap error:", err)
        setError(err.message)
        setLoading(false)
      }
    }

    init()

    return () => {
      if (deckRef.current) {
        deckRef.current.finalize()
        deckRef.current = null
      }
    }
  }, [])

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "80vh",
        background: "#0f172a",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: "1rem",
          }}
        >
          Loading atlas…
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f87171",
            fontSize: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            color: "#64748b",
            fontSize: "12px",
          }}
        >
          {pointCount.toLocaleString()} families · scroll to zoom · drag to pan
        </div>
      )}
    </div>
  )
}

export default AtlasMap

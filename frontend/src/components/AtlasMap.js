import React, { useEffect, useRef, useState } from "react"
import config from "../config"

// ── colour helpers ──────────────────────────────────────────────────────────

const DOMAIN_COLORS = {
  Bacteria:   [78,  205, 196, 220],
  Archaea:    [255, 107, 107, 220],
  Eukaryota:  [255, 217,  61, 220],
  Viruses:    [180, 130, 255, 220],
  Unknown:    [148, 163, 184, 160],
}

// 20-colour categorical palette for phylum
const CATEGORICAL_PALETTE = [
  [78,  205, 196], [255, 107, 107], [255, 217,  61], [75,  192, 192],
  [153, 102, 255], [255, 159,  64], [58,  191, 130], [232, 121, 249],
  [100, 149, 237], [255, 140,   0], [0,   206, 209], [220,  20,  60],
  [0,   128, 128], [148,   0, 211], [50,  205,  50], [255,  99,  71],
  [70,  130, 180], [255, 165,   0], [34,  139,  34], [210, 105,  30],
]

function parseTaxonomy(taxonomy) {
  if (!taxonomy) return { domain: "Unknown", phylum: "Unknown" }
  const tokens = taxonomy.split(";").map(s => s.trim()).filter(Boolean)
  return {
    domain: tokens[0] || "Unknown",
    phylum: tokens[1] || "Unknown",
  }
}

function hashColor(str, alpha = 200) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  const color = CATEGORICAL_PALETTE[Math.abs(h) % CATEGORICAL_PALETTE.length]
  return [...color, alpha]
}

function getPointColor(point, colorBy) {
  if (colorBy === "none") return [100, 210, 190, 200]
  const { domain, phylum } = parseTaxonomy(point.taxonomy)
  if (colorBy === "domain") return DOMAIN_COLORS[domain] || DOMAIN_COLORS.Unknown
  if (colorBy === "phylum") return phylum === "Unknown" ? [148, 163, 184, 160] : hashColor(phylum)
  if (colorBy === "component") {
    if (point.component == null) return [148, 163, 184, 160]
    const color = CATEGORICAL_PALETTE[point.component % CATEGORICAL_PALETTE.length]
    return [...color, 220]
  }
  return [100, 210, 190, 200]
}

function buildLegend(points, colorBy) {
  if (colorBy === "none") return []
  const counts = new Map()
  for (const p of points) {
    const { domain, phylum } = parseTaxonomy(p.taxonomy)
    const key =
      colorBy === "domain" ? domain
      : colorBy === "phylum" ? phylum
      : String(p.component ?? "Unassigned")
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      color:
        colorBy === "domain"
          ? DOMAIN_COLORS[label] || DOMAIN_COLORS.Unknown
          : colorBy === "component"
          ? label === "Unassigned"
            ? [148, 163, 184, 160]
            : [...CATEGORICAL_PALETTE[parseInt(label) % CATEGORICAL_PALETTE.length], 220]
          : label === "Unknown"
          ? [148, 163, 184, 160]
          : hashColor(label),
    }))
}

function buildScatterLayer(points, maxSize, ScatterplotLayer, colorBy) {
  return new ScatterplotLayer({
    id: "umap",
    data: points,
    getPosition: d => [d.umap_x, d.umap_y],
    getRadius: d => Math.sqrt(d.family_size / maxSize) * 1.5,
    radiusMinPixels: 2,
    radiusMaxPixels: 12,
    getFillColor: d => getPointColor(d, colorBy),
    updateTriggers: { getFillColor: colorBy },
    pickable: true,
  })
}

function buildTooltip(object) {
  const { domain, phylum } = parseTaxonomy(object.taxonomy)
  const rows = [
    ["Family", object.family_id],
    ["Sequences", object.family_size.toLocaleString()],
    object.organism ? ["Organism", object.organism] : null,
    ["Domain", domain],
    ["Phylum", phylum],
    object.country ? ["Country", object.country] : null,
    object.component != null ? ["Component", object.component] : null,
  ].filter(Boolean)

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<div style="display:flex;gap:8px;margin-top:3px">
           <span style="color:#94a3b8;min-width:72px">${k}</span>
           <span style="color:#f1f5f9;word-break:break-word">${v}</span>
         </div>`
    )
    .join("")

  return {
    html: `<div style="max-width:280px">${rowsHtml}</div>`,
    style: {
      background: "#1e293b",
      padding: "10px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      border: "1px solid #334155",
      pointerEvents: "none",
    },
  }
}

// ── component ───────────────────────────────────────────────────────────────

const COLOR_MODES = [
  { value: "none",      label: "None" },
  { value: "domain",    label: "Domain" },
  { value: "phylum",    label: "Phylum" },
  { value: "component", label: "Component" },
]

const AtlasMap = () => {
  const containerRef    = useRef(null)
  const deckRef         = useRef(null)
  const pointsRef       = useRef([])
  const maxSizeRef      = useRef(1)
  const LayerRef        = useRef(null)   // ScatterplotLayer constructor

  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [pointCount, setPointCount] = useState(0)
  const [colorBy,    setColorBy]    = useState("none")
  const [legend,     setLegend]     = useState([])

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${config.apiUrl}/atlas/umap`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { points } = await res.json()

        const { Deck, OrthographicView } = await import("@deck.gl/core")
        const { ScatterplotLayer }       = await import("@deck.gl/layers")
        LayerRef.current = ScatterplotLayer

        if (!containerRef.current) return

        const xs    = points.map(p => p.umap_x)
        const ys    = points.map(p => p.umap_y)
        const minX  = Math.min(...xs), maxX = Math.max(...xs)
        const minY  = Math.min(...ys), maxY = Math.max(...ys)
        const cx    = (minX + maxX) / 2
        const cy    = (minY + maxY) / 2
        const xRange = maxX - minX
        const yRange = maxY - minY

        const w    = containerRef.current.clientWidth  * 0.85
        const h    = containerRef.current.clientHeight * 0.85
        const zoom = Math.log2(Math.min(w / xRange, h / yRange))

        const maxSize       = Math.max(...points.map(p => p.family_size))
        maxSizeRef.current  = maxSize
        pointsRef.current   = points

        const deck = new Deck({
          parent: containerRef.current,
          views: new OrthographicView({ id: "ortho" }),
          initialViewState: { target: [cx, cy, 0], zoom },
          controller: true,
          layers: [buildScatterLayer(points, maxSize, ScatterplotLayer, "none")],
          getTooltip: ({ object }) => object && buildTooltip(object),
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
      if (deckRef.current) { deckRef.current.finalize(); deckRef.current = null }
    }
  }, [])

  // ── react to colorBy changes ──────────────────────────────────────────────
  useEffect(() => {
    if (!deckRef.current || !pointsRef.current.length || !LayerRef.current) return
    deckRef.current.setProps({
      layers: [buildScatterLayer(pointsRef.current, maxSizeRef.current, LayerRef.current, colorBy)],
    })
    setLegend(buildLegend(pointsRef.current, colorBy))
  }, [colorBy])

  // ── render ────────────────────────────────────────────────────────────────
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
      {/* deck.gl canvas */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* colour-by controls */}
      {!loading && !error && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 10,
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: "11px", marginRight: "2px" }}>
            Color by
          </span>
          {COLOR_MODES.map(mode => (
            <button
              key={mode.value}
              onClick={() => setColorBy(mode.value)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "1px solid",
                borderColor: colorBy === mode.value ? "#38bdf8" : "#334155",
                background: colorBy === mode.value ? "#0c4a6e" : "#1e293b",
                color: colorBy === mode.value ? "#e0f2fe" : "#94a3b8",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}

      {/* legend */}
      {legend.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "52px",
            left: "14px",
            maxHeight: "calc(80vh - 80px)",
            overflowY: "auto",
            background: "rgba(15,23,42,0.85)",
            border: "1px solid #1e293b",
            borderRadius: "6px",
            padding: "8px 10px",
            zIndex: 10,
            minWidth: "160px",
            maxWidth: "220px",
          }}
        >
          {legend.map(({ label, count, color }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px" }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: `rgba(${color[0]},${color[1]},${color[2]},${(color[3] ?? 200) / 255})`,
                }}
              />
              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: "11px",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={label}
              >
                {label}
              </span>
              <span style={{ color: "#475569", fontSize: "10px", flexShrink: 0 }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* loading */}
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

      {/* error */}
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

      {/* point count */}
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

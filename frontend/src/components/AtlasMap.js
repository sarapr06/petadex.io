import React, { useCallback, useEffect, useRef, useState } from "react"
import config from "../config"
import {
  COMPONENT_SHADE_RGBA,
  COMPONENT_TO_CATH,
  CATH_GROUPS,
  CATH_BASE_CSS,
} from "../utils/cathColors"

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

const HIDDEN_COLOR = [30, 41, 59, 40]
const HIGHLIGHT_COLOR = [255, 20, 147, 255]

// Convert family_id to a deck.gl RGBA — matches familyColor() in ResultsView/enzymes
function familyIdToRGBA(familyId) {
  const hue = (familyId * 137.508) % 360
  const h = hue / 360, s = 0.6, l = 0.45
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
  }
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), 255]
}

function getPointColor(point, colorBy, hidden, highlightFamilyId, highlightFamilyIds) {
  if (highlightFamilyId != null && point.family_id === highlightFamilyId) return HIGHLIGHT_COLOR
  if (highlightFamilyIds != null) {
    return highlightFamilyIds.has(point.family_id)
      ? familyIdToRGBA(point.family_id)
      : [100, 116, 139, 100]
  }
  if (colorBy === "none") return [100, 210, 190, 200]
  const { domain, phylum } = parseTaxonomy(point.taxonomy)
  if (colorBy === "domain") {
    if (hidden.has(domain)) return HIDDEN_COLOR
    return DOMAIN_COLORS[domain] || DOMAIN_COLORS.Unknown
  }
  if (colorBy === "phylum") {
    const key = phylum
    if (hidden.has(key)) return HIDDEN_COLOR
    return key === "Unknown" ? [148, 163, 184, 160] : hashColor(key)
  }
  if (colorBy === "component") {
    const key = point.component != null ? String(point.component) : "Unassigned"
    if (hidden.has(key)) return HIDDEN_COLOR
    return point.component != null
      ? COMPONENT_SHADE_RGBA[point.component] || [148, 163, 184, 160]
      : [148, 163, 184, 160]
  }
  return [100, 210, 190, 200]
}

function buildLegend(points, colorBy) {
  if (colorBy === "none") return []

  if (colorBy === "component") {
    // Count points per component
    const compCounts = new Map()
    let unassignedCount = 0
    for (const p of points) {
      if (p.component != null) {
        compCounts.set(p.component, (compCounts.get(p.component) || 0) + 1)
      } else {
        unassignedCount++
      }
    }

    // Group components under their CATH domain parent
    const cathOrder = Object.keys(CATH_GROUPS)
    const groups = []
    for (const cath of cathOrder) {
      const children = CATH_GROUPS[cath]
        .filter(comp => compCounts.has(comp))
        .map(comp => ({
          label: String(comp),
          count: compCounts.get(comp),
          color: COMPONENT_SHADE_RGBA[comp] || [148, 163, 184, 160],
        }))
      if (children.length > 0) {
        const total = children.reduce((s, c) => s + c.count, 0)
        groups.push({ cath, cathColor: CATH_BASE_CSS[cath], total, children })
      }
    }
    if (unassignedCount > 0) {
      groups.push({
        cath: "Unassigned",
        cathColor: "rgb(148,163,184)",
        total: unassignedCount,
        children: [],
      })
    }
    return { grouped: true, groups }
  }

  const counts = new Map()
  for (const p of points) {
    const { domain, phylum } = parseTaxonomy(p.taxonomy)
    const key = colorBy === "domain" ? domain : phylum
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
          : label === "Unknown"
          ? [148, 163, 184, 160]
          : hashColor(label),
    }))
}

function buildScatterLayer(points, maxSize, ScatterplotLayer, colorBy, hidden, highlightFamilyId, highlightFamilyIds) {
  const sorted = (highlightFamilyId != null || highlightFamilyIds != null)
    ? [...points].sort((a, b) => {
        const aHit = (highlightFamilyIds?.has(a.family_id) ? 1 : 0) + (a.family_id === highlightFamilyId ? 1 : 0)
        const bHit = (highlightFamilyIds?.has(b.family_id) ? 1 : 0) + (b.family_id === highlightFamilyId ? 1 : 0)
        return aHit - bHit
      })
    : points
  return new ScatterplotLayer({
    id: "umap",
    data: sorted,
    getPosition: d => [d.umap_x, d.umap_y],
    getRadius: d => {
      const base = Math.sqrt(d.family_size / maxSize) * 1.5
      return (highlightFamilyIds?.has(d.family_id)) ? base * 1.8 : base
    },
    radiusMinPixels: 2,
    radiusMaxPixels: 12,
    getFillColor: d => getPointColor(d, colorBy, hidden, highlightFamilyId, highlightFamilyIds),
    updateTriggers: { getFillColor: [colorBy, ...hidden, highlightFamilyId, highlightFamilyIds] },
    pickable: true,
  })
}

function buildTooltip(object, highlightFamilyId) {
  const { domain, phylum } = parseTaxonomy(object.taxonomy)
  const isCurrent = highlightFamilyId != null && object.family_id === highlightFamilyId
  const rows = [
    ["Family", `${object.family_id}${isCurrent ? " (current)" : ""}`],
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
    html: `<div style="max-width:280px">${rowsHtml}${!isCurrent ? '<div style="margin-top:6px;color:#64748b;font-size:11px">Click to view family</div>' : ''}</div>`,
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

const navBtnStyle = {
  padding: "3px 7px",
  borderRadius: "4px",
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#94a3b8",
  fontSize: "14px",
  cursor: "pointer",
  fontFamily: "inherit",
  lineHeight: 1,
}

const AtlasMap = ({ familyId: familyIdProp, highlightFamilyIds, controllerEnabled = true } = {}) => {
  const propHighlightId = familyIdProp != null ? parseInt(familyIdProp) : null
  const compact = propHighlightId != null
  const [highlightFamilyId, setHighlightFamilyId] = useState(propHighlightId)
  const containerRef    = useRef(null)
  const deckRef         = useRef(null)
  const pointsRef       = useRef([])
  const maxSizeRef      = useRef(1)
  const LayerRef        = useRef(null)   // ScatterplotLayer constructor

  const highlightPosRef = useRef(null)   // world [x, y] of highlighted point

  const [loading,              setLoading]              = useState(true)
  const [error,                setError]                = useState(null)
  const [pointCount,           setPointCount]           = useState(0)
  const [colorBy,              setColorBy]              = useState("none")
  const [legend,               setLegend]               = useState([])
  const [hidden,               setHidden]               = useState(new Set())
  const [ripplePos,            setRipplePos]            = useState(null)
  const [searchQuery,          setSearchQuery]          = useState("")
  const [searchMatches,        setSearchMatches]        = useState([])
  const [searchMatchIdx,       setSearchMatchIdx]       = useState(0)
  const [searchPanel,          setSearchPanel]          = useState(null)  // current match point

  const zoomToHighlight = useCallback(() => {
    if (!deckRef.current || !highlightPosRef.current) return
    const [x, y, z] = highlightPosRef.current
    deckRef.current.setProps({
      initialViewState: { target: [x, y, z], zoom: 6, transitionDuration: 800, _ts: Date.now() },
    })
  }, [])

  const zoomToPoint = useCallback((point) => {
    if (!deckRef.current || !point) return
    deckRef.current.setProps({
      initialViewState: { target: [point.umap_x, point.umap_y, 0], zoom: 6, transitionDuration: 600, _ts: Date.now() },
    })
  }, [])

  const fitToHighlighted = useCallback(() => {
    if (!deckRef.current || !containerRef.current) return
    const pts = pointsRef.current.filter(p =>
      (highlightFamilyIds?.has(p.family_id)) ||
      (highlightFamilyId != null && p.family_id === highlightFamilyId)
    )
    if (!pts.length) return
    const xs = pts.map(p => p.umap_x), ys = pts.map(p => p.umap_y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    const w = containerRef.current.clientWidth  * 0.7
    const h = containerRef.current.clientHeight * 0.7
    const xRange = maxX - minX || 1, yRange = maxY - minY || 1
    const zoom = Math.log2(Math.min(w / xRange, h / yRange))
    deckRef.current.setProps({
      initialViewState: { target: [cx, cy, 0], zoom, transitionDuration: 700, _ts: Date.now() },
    })
  }, [highlightFamilyIds, highlightFamilyId])

  const handleSearch = useCallback((q) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchMatches([])
      setSearchMatchIdx(0)
      setSearchPanel(null)
      setRipplePos(null)
      highlightPosRef.current = null
      setHighlightFamilyId(propHighlightId)
      if (deckRef.current && pointsRef.current.length && LayerRef.current) {
        deckRef.current.setProps({
          layers: [buildScatterLayer(pointsRef.current, maxSizeRef.current, LayerRef.current, colorBy, hidden, propHighlightId, highlightFamilyIds)],
        })
      }
      return
    }
    const lower = q.toLowerCase()
    const matches = pointsRef.current.filter(p =>
      String(p.family_id).includes(lower) ||
      (p.organism && p.organism.toLowerCase().includes(lower))
    )
    setSearchMatches(matches)
    setSearchMatchIdx(0)
    if (matches.length > 0) {
      setHighlightFamilyId(matches[0].family_id)
      setSearchPanel(matches[0])
      highlightPosRef.current = [matches[0].umap_x, matches[0].umap_y, 0]
      zoomToPoint(matches[0])
      if (deckRef.current && LayerRef.current) {
        deckRef.current.setProps({
          layers: [buildScatterLayer(pointsRef.current, maxSizeRef.current, LayerRef.current, colorBy, hidden, matches[0].family_id, highlightFamilyIds)],
        })
      }
    } else {
      setSearchPanel(null)
    }
  }, [zoomToPoint, colorBy, hidden, propHighlightId])

  const cycleMatch = useCallback((dir) => {
    if (!searchMatches.length) return
    const next = (searchMatchIdx + dir + searchMatches.length) % searchMatches.length
    setSearchMatchIdx(next)
    const point = searchMatches[next]
    setHighlightFamilyId(point.family_id)
    setSearchPanel(point)
    highlightPosRef.current = [point.umap_x, point.umap_y, 0]
    zoomToPoint(point)
    if (deckRef.current && LayerRef.current) {
      deckRef.current.setProps({
        layers: [buildScatterLayer(pointsRef.current, maxSizeRef.current, LayerRef.current, colorBy, hidden, point.family_id, highlightFamilyIds)],
      })
    }
  }, [searchMatches, searchMatchIdx, zoomToPoint, colorBy, hidden])

  const projectHighlight = useCallback(() => {
    if (!deckRef.current) return
    const viewports = deckRef.current.getViewports()
    if (!viewports || !viewports.length) return
    const vp = viewports[0]
    const positions = []
    if (highlightPosRef.current) {
      const [sx, sy] = vp.project(highlightPosRef.current)
      positions.push({ x: sx, y: sy })
    }
    if (highlightFamilyIds) {
      for (const p of pointsRef.current) {
        if (highlightFamilyIds.has(p.family_id)) {
          const [sx, sy] = vp.project([p.umap_x, p.umap_y, 0])
          positions.push({ x: sx, y: sy })
        }
      }
    }
    setRipplePos(positions.length > 0 ? positions : null)
  }, [highlightFamilyIds])

  const updateLayer = useCallback((h) => {
    if (!deckRef.current || !pointsRef.current.length || !LayerRef.current) return
    deckRef.current.setProps({
      layers: [buildScatterLayer(pointsRef.current, maxSizeRef.current, LayerRef.current, colorBy, h, highlightFamilyId, highlightFamilyIds)],
    })
  }, [colorBy, highlightFamilyId, highlightFamilyIds])

  const toggleKey = useCallback((key) => {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      updateLayer(next)
      return next
    })
  }, [updateLayer])

  const toggleKeys = useCallback((keys) => {
    setHidden(prev => {
      const next = new Set(prev)
      const allHidden = keys.every(k => next.has(k))
      for (const k of keys) {
        if (allHidden) next.delete(k)
        else next.add(k)
      }
      updateLayer(next)
      return next
    })
  }, [updateLayer])

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        const endpoint = highlightFamilyId != null
          ? `${config.apiUrl}/family/${highlightFamilyId}/umap`
          : `${config.apiUrl}/atlas/umap`
        let res
        try {
          res = await fetch(endpoint, { signal: controller.signal })
        } finally {
          clearTimeout(timeoutId)
        }
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

        // Store highlighted point's world position for ripple overlay
        if (highlightFamilyId != null) {
          const hp = points.find(p => p.family_id === highlightFamilyId)
          if (hp) highlightPosRef.current = [hp.umap_x, hp.umap_y, 0]
        }

        const deck = new Deck({
          parent: containerRef.current,
          views: new OrthographicView({ id: "ortho" }),
          initialViewState: { target: [cx, cy, 0], zoom },
          controller: controllerEnabled,
          layers: [buildScatterLayer(points, maxSize, ScatterplotLayer, "none", new Set(), highlightFamilyId, highlightFamilyIds)],
          getTooltip: ({ object }) => object && buildTooltip(object, highlightFamilyId),
          onClick: ({ object }) => {
            if (object?.family_id != null && object.family_id !== highlightFamilyId) {
              window.location.href = `/family/${object.family_id}`
            }
          },
          getCursor: ({ isHovering }) => isHovering ? "pointer" : "grab",
          onViewStateChange: () => { requestAnimationFrame(projectHighlight) },
        })

        deckRef.current = deck
        setPointCount(points.length)
        setLoading(false)

        // Initial projection after first render
        requestAnimationFrame(projectHighlight)
      } catch (err) {
        console.error("AtlasMap error:", err)
        setError(err.name === "AbortError" ? "Atlas data timed out — server may be unavailable" : err.message)
        setLoading(false)
      }
    }

    init()
    return () => {
      if (deckRef.current) { deckRef.current.finalize(); deckRef.current = null }
    }
  }, [])

  // ── sync controller enabled/disabled ─────────────────────────────────────
  useEffect(() => {
    if (!deckRef.current) return
    deckRef.current.setProps({ controller: controllerEnabled })
  }, [controllerEnabled])

  // ── react to colorBy changes ──────────────────────────────────────────────
  useEffect(() => {
    if (!deckRef.current || !pointsRef.current.length || !LayerRef.current) return
    const fresh = new Set()
    setHidden(fresh)
    deckRef.current.setProps({
      layers: [buildScatterLayer(pointsRef.current, maxSizeRef.current, LayerRef.current, colorBy, fresh, highlightFamilyId, highlightFamilyIds)],
    })
    setLegend(buildLegend(pointsRef.current, colorBy))
  }, [colorBy])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: compact ? "50vh" : "80vh",
        minHeight: compact ? 350 : undefined,
        background: "#0f172a",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* deck.gl canvas */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* pulse ring on highlighted family */}
      {ripplePos && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {ripplePos.map((pos, i) => (
            <circle key={i} cx={pos.x} cy={pos.y} r={14} fill="none" stroke="#FF1493" strokeWidth={2}>
              <animate attributeName="r" from="8" to="18" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
      )}

      {/* pinned tooltip for search-selected family */}
      {searchPanel && ripplePos?.[0] && (() => {
        const pos = ripplePos[0]
        const { domain, phylum } = parseTaxonomy(searchPanel.taxonomy)
        const rows = [
          ["Family",    searchPanel.family_id],
          ["Sequences", searchPanel.family_size.toLocaleString()],
          searchPanel.organism ? ["Organism", searchPanel.organism] : null,
          ["Domain",    domain],
          ["Phylum",    phylum],
          searchPanel.country   ? ["Country",   searchPanel.country]   : null,
          searchPanel.component != null ? ["Component", searchPanel.component] : null,
        ].filter(Boolean)
        return (
          <div
            style={{
              position: "absolute",
              left: pos.x + 20,
              top:  pos.y - 10,
              zIndex: 20,
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              pointerEvents: "none",
              maxWidth: "280px",
            }}
          >
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: "8px", marginTop: "3px" }}>
                <span style={{ color: "#94a3b8", minWidth: "72px" }}>{k}</span>
                <span style={{ color: "#f1f5f9", wordBreak: "break-word" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: "6px", color: "#64748b", fontSize: "11px" }}>
              Click to view family
            </div>
          </div>
        )
      })()}

      {/* fit-to-highlighted button */}
      {!loading && !error && (highlightFamilyIds?.size > 0 || searchMatches.length > 0) && (
        <button
          onClick={fitToHighlighted}
          title="Fit view to highlighted families"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 10,
            padding: "5px 10px",
            borderRadius: "4px",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#94a3b8",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="1" y="1" width="5" height="5" /><rect x="10" y="1" width="5" height="5" />
            <rect x="1" y="10" width="5" height="5" /><rect x="10" y="10" width="5" height="5" />
          </svg>
          Fit to hits
        </button>
      )}

      {/* zoom-to-highlight button (family page only, hidden when multi-highlight active) */}
      {compact && !loading && !error && !highlightFamilyIds && highlightPosRef.current && (
        <button
          onClick={zoomToHighlight}
          title="Zoom to this family"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 10,
            padding: "5px 10px",
            borderRadius: "4px",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#94a3b8",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="15" y2="15" />
            <line x1="5" y1="7" x2="9" y2="7" />
            <line x1="7" y1="5" x2="7" y2="9" />
          </svg>
          Locate family
        </button>
      )}

      {/* search bar */}
      {!loading && !error && (
        <div
          style={{
            position: "absolute",
            top: (compact || highlightFamilyIds?.size > 0) ? "48px" : "14px",
            right: "14px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg
              width="12" height="12" viewBox="0 0 16 16" fill="none"
              stroke="#64748b" strokeWidth="2" strokeLinecap="round"
              style={{ position: "absolute", left: "8px", pointerEvents: "none" }}
            >
              <circle cx="7" cy="7" r="5" />
              <line x1="11" y1="11" x2="15" y2="15" />
            </svg>
            <input
              type="text"
              placeholder="Search family / organism…"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") cycleMatch(e.shiftKey ? -1 : 1)
                if (e.key === "Escape") handleSearch("")
              }}
              style={{
                paddingLeft: "26px",
                paddingRight: "8px",
                paddingTop: "5px",
                paddingBottom: "5px",
                borderRadius: "4px",
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#e2e8f0",
                fontSize: "12px",
                fontFamily: "inherit",
                width: "200px",
                outline: "none",
              }}
            />
          </div>
          {searchMatches.length > 0 && (
            <>
              <span style={{ color: "#64748b", fontSize: "11px", whiteSpace: "nowrap" }}>
                {searchMatchIdx + 1}/{searchMatches.length}
              </span>
              <button onClick={() => cycleMatch(-1)} title="Previous" style={navBtnStyle}>‹</button>
              <button onClick={() => cycleMatch(1)}  title="Next"     style={navBtnStyle}>›</button>
            </>
          )}
          {searchQuery && searchMatches.length === 0 && (
            <span style={{ color: "#f87171", fontSize: "11px" }}>No match</span>
          )}
        </div>
      )}

      {/* colour-by controls */}
      {!loading && !error && (
        <div
          style={{
            position: "absolute",
            top: compact ? "48px" : "14px",
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

      {/* text legend — flat (domain/phylum) */}
      {Array.isArray(legend) && legend.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: compact ? "86px" : "52px",
            left: "14px",
            maxHeight: compact ? "calc(50vh - 80px)" : "calc(80vh - 80px)",
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
          {legend.map(({ label, count, color }) => {
            const off = hidden.has(label)
            return (
              <div
                key={label}
                onClick={() => toggleKey(label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  marginBottom: "5px",
                  cursor: "pointer",
                  opacity: off ? 0.35 : 1,
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: off
                      ? "#334155"
                      : `rgba(${color[0]},${color[1]},${color[2]},${(color[3] ?? 200) / 255})`,
                  }}
                />
                <span
                  style={{
                    color: off ? "#475569" : "#cbd5e1",
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
            )
          })}
        </div>
      )}

      {/* grouped legend — component mode (CATH → components) */}
      {legend && legend.grouped && (
        <div
          style={{
            position: "absolute",
            top: compact ? "86px" : "52px",
            left: "14px",
            maxHeight: compact ? "calc(50vh - 80px)" : "calc(80vh - 80px)",
            overflowY: "auto",
            background: "rgba(15,23,42,0.85)",
            border: "1px solid #1e293b",
            borderRadius: "6px",
            padding: "8px 10px",
            zIndex: 10,
            minWidth: "180px",
            maxWidth: "240px",
          }}
        >
          {legend.groups.map(({ cath, cathColor, total, children }) => {
            const childKeys = children.map(c => c.label)
            const allChildrenOff = childKeys.length > 0 && childKeys.every(k => hidden.has(k))
            const parentOff = cath === "Unassigned" ? hidden.has("Unassigned") : allChildrenOff
            return (
              <div key={cath} style={{ marginBottom: "8px" }}>
                {/* CATH domain parent row */}
                <div
                  onClick={() =>
                    cath === "Unassigned"
                      ? toggleKey("Unassigned")
                      : toggleKeys(childKeys)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    marginBottom: "3px",
                    cursor: "pointer",
                    opacity: parentOff ? 0.35 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "3px",
                      flexShrink: 0,
                      background: parentOff ? "#334155" : cathColor,
                    }}
                  />
                  <span
                    style={{
                      color: parentOff ? "#475569" : "#e2e8f0",
                      fontSize: "11px",
                      fontWeight: 600,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={cath}
                  >
                    {cath}
                  </span>
                  <span style={{ color: "#475569", fontSize: "10px", flexShrink: 0 }}>
                    {total}
                  </span>
                </div>
                {/* Component children */}
                {children.map(({ label, count, color }) => {
                  const off = hidden.has(label)
                  return (
                    <div
                      key={label}
                      onClick={() => toggleKey(label)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        marginBottom: "2px",
                        paddingLeft: "17px",
                        cursor: "pointer",
                        opacity: off ? 0.35 : 1,
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: off
                            ? "#334155"
                            : `rgba(${color[0]},${color[1]},${color[2]},${(color[3] ?? 200) / 255})`,
                        }}
                      />
                      <span style={{ color: off ? "#475569" : "#cbd5e1", fontSize: "10px", flex: 1 }}>
                        Component {label}
                      </span>
                      <span style={{ color: "#475569", fontSize: "10px", flexShrink: 0 }}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
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

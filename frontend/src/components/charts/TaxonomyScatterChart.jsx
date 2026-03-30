import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import * as s from "./taxonomyScatter.module.css"

// ── Taxonomy keyword lists ─────────────────────────────────────────────────────

const PHYLUM_KEYWORDS = [
  "Proteobacteria", "Actinobacteria", "Actinomycetota", "Firmicutes",
  "Bacteroidetes", "Bacteroidota", "Chloroflexi", "Cyanobacteria",
  "Planctomycetes", "Verrucomicrobia", "Spirochaetes", "Fusobacteria",
  "Deinococcus", "Thermotogae", "Acidobacteria", "Nitrospirae",
  "Ascomycota", "Basidiomycota", "Mucoromycota",
  "Chordata", "Arthropoda", "Nematoda", "Mollusca",
  "Streptophyta", "Chlorophyta",
]

const CLASS_KEYWORDS = [
  "Gammaproteobacteria", "Alphaproteobacteria", "Betaproteobacteria",
  "Deltaproteobacteria", "Epsilonproteobacteria",
  "Actinomycetes", "Bacilli", "Clostridia", "Erysipelotrichia",
  "Bacteroidia", "Flavobacteriia",
  "Saccharomycetes", "Sordariomycetes", "Eurotiomycetes", "Dothideomycetes",
  "Agaricomycetes", "Tremellomycetes",
  "Mammalia", "Aves", "Reptilia", "Amphibia", "Actinopterygii",
  "Insecta", "Arachnida", "Malacostraca",
]

function extractRank(organism, rank, taxonomy) {
  // Try taxonomy lineage string first (more reliable)
  const searchStrings = [taxonomy, organism].filter(Boolean)
  if (!searchStrings.length) return "Unknown"

  const keywords = rank === "phylum" ? PHYLUM_KEYWORDS : CLASS_KEYWORDS
  for (const str of searchStrings) {
    const lower = str.toLowerCase()
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return kw
    }
  }
  const genus = (organism || "").trim().split(/\s+/)[0]
  return genus || "Unknown"
}

// ── Beeswarm dodge ─────────────────────────────────────────────────────────────

const DOT_R = 4
const DOT_SPACING = DOT_R * 2 + 1

function beeswarmDodge(points) {
  const sorted = [...points].sort((a, b) => a.cy - b.cy)
  const placed = []

  for (const p of sorted) {
    const nearby = placed.filter(
      q => q.cat === p.cat && Math.abs(q.cy - p.cy) < DOT_SPACING,
    )
    let bestOffset = 0
    if (nearby.length > 0) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const sign = attempt % 2 === 0 ? 1 : -1
        const candidate = sign * Math.ceil(attempt / 2) * DOT_SPACING
        const collision = nearby.some(
          q =>
            Math.abs(q.jitter - candidate) < DOT_SPACING &&
            Math.abs(q.cy - p.cy) < DOT_SPACING,
        )
        if (!collision) {
          bestOffset = candidate
          break
        }
        bestOffset = candidate
      }
    }
    placed.push({ ...p, jitter: bestOffset })
  }
  return placed
}

// ── Color palette ──────────────────────────────────────────────────────────────

const PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
  "#59a14f", "#edc948", "#b07aa1", "#ff9da7",
  "#9c755f", "#bab0ac", "#af7aa1", "#86bcb6",
]

// ── Main component ─────────────────────────────────────────────────────────────

export function TaxonomyScatterChart({ data, height = 440 }) {
  const containerRef = useRef(null)
  const [rankMode, setRankMode] = useState("phylum")
  const [tooltip, setTooltip] = useState(null)
  const [hiddenCats, setHiddenCats] = useState(new Set())
  const [highlightCat, setHighlightCat] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // ── Responsive width ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w && w > 0) setContainerWidth(Math.floor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const width = containerWidth || 700

  const margin = { top: 16, right: 20, bottom: 72, left: 50 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  // ── Derived points ───────────────────────────────────────────────────────────
  const points = useMemo(
    () =>
      data.map(hit => ({
        accession: hit.accession,
        organism: hit.organism || "Unknown",
        definition: hit.name || "",
        identity: hit.identity ?? 0,
        evalue: hit.evalue,
        coverage: hit.query_coverage,
        enzyme_id: hit.enzyme_id,
        cat: extractRank(hit.organism, rankMode, hit.taxonomy),
      })),
    [data, rankMode],
  )

  // Categories sorted by count desc
  const categories = useMemo(() => {
    const counts = {}
    for (const p of points) counts[p.cat] = (counts[p.cat] || 0) + 1
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ name: k, count: v }))
  }, [points])

  const catNames = useMemo(() => categories.map(c => c.name), [categories])

  const visibleCatNames = useMemo(
    () => catNames.filter(c => !hiddenCats.has(c)),
    [catNames, hiddenCats],
  )

  const visiblePoints = useMemo(
    () => points.filter(p => !hiddenCats.has(p.cat)),
    [points, hiddenCats],
  )

  // ── Scales ───────────────────────────────────────────────────────────────────
  const xScale = useMemo(
    () =>
      d3
        .scalePoint()
        .domain(visibleCatNames)
        .range([0, innerW])
        .padding(0.5),
    [visibleCatNames, innerW],
  )

  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, 105]).range([innerH, 0]),
    [innerH],
  )

  const colorScale = useMemo(
    () => d3.scaleOrdinal(PALETTE).domain(catNames),
    [catNames],
  )

  // ── Beeswarm layout ─────────────────────────────────────────────────────────
  const jittered = useMemo(() => {
    if (innerW <= 0 || innerH <= 0) return []
    const withPos = visiblePoints.map(p => ({
      ...p,
      cx: xScale(p.cat),
      cy: yScale(p.identity),
    }))
    return beeswarmDodge(withPos)
  }, [visiblePoints, xScale, yScale, innerW, innerH])

  // Reset hidden categories when rank mode changes
  useEffect(() => {
    setHiddenCats(new Set())
  }, [rankMode])

  // ── Category toggle ──────────────────────────────────────────────────────────
  const toggleCategory = useCallback(
    cat => {
      setHiddenCats(prev => {
        const next = new Set(prev)
        if (next.has(cat)) {
          next.delete(cat)
        } else {
          if (catNames.length - next.size <= 1) return prev
          next.add(cat)
        }
        return next
      })
    },
    [catNames],
  )

  // ── Tooltip helpers ──────────────────────────────────────────────────────────
  const showTooltip = useCallback((e, p) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      ...p,
    })
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  // ── Ticks ────────────────────────────────────────────────────────────────────
  const yTicks = yScale.ticks(6)
  const xTicks = visibleCatNames.map(cat => ({ cat, x: xScale(cat) }))

  if (!containerWidth) {
    return <div ref={containerRef} style={{ width: "100%", minHeight: height }} />
  }

  return (
    <div ref={containerRef} className={s.container}>
      {/* ── Controls ──────────────────────────────────────────────────────────── */}
      <div className={s.controls}>
        {["phylum", "class"].map(r => (
          <button
            key={r}
            onClick={() => setRankMode(r)}
            className={rankMode === r ? s.rankBtnActive : s.rankBtn}
          >
            {r}
          </button>
        ))}
      </div>

      {/* ── Category legend chips ─────────────────────────────────────────────── */}
      <div className={s.legendWrap}>
        {categories.map(({ name, count }) => {
          const hidden = hiddenCats.has(name)
          const color = colorScale(name)
          return (
            <span
              key={name}
              className={s.legendChip}
              style={{
                borderColor: hidden ? "transparent" : color,
                opacity: hidden ? 0.4 : 1,
                background: hidden ? "#f3f4f6" : `${color}10`,
              }}
              onClick={() => toggleCategory(name)}
              onMouseEnter={() => !hidden && setHighlightCat(name)}
              onMouseLeave={() => setHighlightCat(null)}
            >
              <span
                className={s.legendChipDot}
                style={{ background: hidden ? "#d1d5db" : color }}
              />
              {name}
              <span className={s.legendChipCount}>{count}</span>
            </span>
          )
        })}
      </div>

      {/* ── Chart ─────────────────────────────────────────────────────────────── */}
      <div className={s.svgWrap}>
        <svg width={width} height={height} style={{ display: "block" }}>
          <defs>
            <clipPath id="taxo-beeswarm-clip">
              <rect x={0} y={0} width={innerW} height={innerH} />
            </clipPath>
          </defs>

          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Y grid lines */}
            {yTicks.map(t => (
              <line
                key={t}
                x1={0}
                x2={innerW}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="#f0f0f0"
                strokeWidth={1}
              />
            ))}

            {/* Vertical category lanes */}
            {xTicks.map(({ cat, x }) => (
              <line
                key={cat}
                x1={x}
                x2={x}
                y1={0}
                y2={innerH}
                stroke={highlightCat === cat ? colorScale(cat) : "#f0f0f0"}
                strokeWidth={highlightCat === cat ? 1.5 : 0.5}
                strokeDasharray={highlightCat === cat ? "none" : "2 4"}
                opacity={highlightCat === cat ? 0.4 : 1}
              />
            ))}

            {/* Axes */}
            <line x1={0} x2={0} y1={0} y2={innerH} stroke="#d1d5db" />
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="#d1d5db" />

            {/* Y ticks */}
            {yTicks.map(t => (
              <g key={t} transform={`translate(0,${yScale(t)})`}>
                <line x2={-4} stroke="#d1d5db" />
                <text
                  x={-8}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="#9ca3af"
                >
                  {t}%
                </text>
              </g>
            ))}

            {/* Y axis label */}
            <text
              transform={`translate(-36,${innerH / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={11}
              fill="#6b7280"
              fontWeight={500}
            >
              % Identity
            </text>

            {/* X ticks */}
            {xTicks.map(({ cat, x }) => (
              <g key={cat} transform={`translate(${x},${innerH})`}>
                <line y2={5} stroke="#d1d5db" />
                <text
                  y={8}
                  textAnchor="end"
                  dominantBaseline="hanging"
                  fontSize={10}
                  fill={highlightCat === cat ? colorScale(cat) : "#6b7280"}
                  fontWeight={highlightCat === cat ? 600 : 400}
                  transform="rotate(-40)"
                >
                  {cat.length > 16 ? cat.slice(0, 15) + "\u2026" : cat}
                </text>
              </g>
            ))}

            {/* Points */}
            <g clipPath="url(#taxo-beeswarm-clip)">
              {jittered.map((p, i) => {
                const cx = p.cx + p.jitter
                const cy = p.cy
                const color = colorScale(p.cat)
                const dimmed = highlightCat != null && highlightCat !== p.cat

                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={DOT_R}
                    fill={color}
                    opacity={dimmed ? 0.1 : 0.75}
                    style={{
                      cursor: p.enzyme_id ? "pointer" : "default",
                      transition: "opacity 0.15s ease",
                    }}
                    onClick={() => {
                      if (p.enzyme_id)
                        window.open(`/enzyme/${p.enzyme_id}`, "_blank")
                    }}
                    onMouseEnter={e => showTooltip(e, p)}
                    onMouseMove={e => showTooltip(e, p)}
                    onMouseLeave={hideTooltip}
                  />
                )
              })}
            </g>
          </g>
        </svg>

        {/* ── Tooltip overlay ───────────────────────────────────────────────── */}
        {tooltip && (
          <div
            className={s.tooltip}
            style={{
              left: Math.min(tooltip.x + 14, width - 220),
              top: Math.max(tooltip.y - 60, 4),
            }}
          >
            <div
              className={s.tooltipHeader}
              style={{ background: colorScale(tooltip.cat) }}
            >
              {tooltip.accession || tooltip.organism}
            </div>
            <div className={s.tooltipBody}>
              <div className={s.tooltipRow}>
                <span>Organism</span>
                <b>{tooltip.organism}</b>
              </div>
              <div className={s.tooltipRow}>
                <span>Group</span>
                <b>{tooltip.cat}</b>
              </div>
              <div className={s.tooltipRow}>
                <span>Identity</span>
                <b>{tooltip.identity?.toFixed(1)}%</b>
              </div>
              <div className={s.tooltipRow}>
                <span>Coverage</span>
                <b>
                  {tooltip.coverage != null ? `${tooltip.coverage}%` : "\u2014"}
                </b>
              </div>
              <div className={s.tooltipRow}>
                <span>E-value</span>
                <b>
                  {tooltip.evalue === 0
                    ? "0"
                    : tooltip.evalue?.toExponential(1)}
                </b>
              </div>
              {tooltip.definition && (
                <div className={s.tooltipDef}>
                  {tooltip.definition.length > 100
                    ? tooltip.definition.slice(0, 99) + "\u2026"
                    : tooltip.definition}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

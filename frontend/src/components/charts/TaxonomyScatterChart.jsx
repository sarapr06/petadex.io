import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"

// ── Taxonomy keyword lists ─────────────────────────────────────────────────────

const PHYLUM_KEYWORDS = [
  "Proteobacteria",
  "Actinobacteria",
  "Actinomycetota",
  "Firmicutes",
  "Bacteroidetes",
  "Bacteroidota",
  "Chloroflexi",
  "Cyanobacteria",
  "Planctomycetes",
  "Verrucomicrobia",
  "Spirochaetes",
  "Fusobacteria",
  "Deinococcus",
  "Thermotogae",
  "Acidobacteria",
  "Nitrospirae",
  "Ascomycota",
  "Basidiomycota",
  "Mucoromycota",
  "Chordata",
  "Arthropoda",
  "Nematoda",
  "Mollusca",
  "Streptophyta",
  "Chlorophyta",
]

const CLASS_KEYWORDS = [
  "Gammaproteobacteria",
  "Alphaproteobacteria",
  "Betaproteobacteria",
  "Deltaproteobacteria",
  "Epsilonproteobacteria",
  "Actinomycetes",
  "Bacilli",
  "Clostridia",
  "Erysipelotrichia",
  "Bacteroidia",
  "Flavobacteriia",
  "Saccharomycetes",
  "Sordariomycetes",
  "Eurotiomycetes",
  "Dothideomycetes",
  "Agaricomycetes",
  "Tremellomycetes",
  "Mammalia",
  "Aves",
  "Reptilia",
  "Amphibia",
  "Actinopterygii",
  "Insecta",
  "Arachnida",
  "Malacostraca",
]

function extractRank(organism, rank, taxonomy) {
  const searchStrings = [taxonomy, organism].filter(Boolean)
  if (!searchStrings.length) return "Unknown"
  const keywords = rank === "phylum" ? PHYLUM_KEYWORDS : CLASS_KEYWORDS
  for (const str of searchStrings) {
    const lower = str.toLowerCase()
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return kw
    }
  }
  return (organism || "").trim().split(/\s+/)[0] || "Unknown"
}

// ── Beeswarm ───────────────────────────────────────────────────────────────────

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

const PALETTE = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#af7aa1",
  "#86bcb6",
]

// ── Tooltip ────────────────────────────────────────────────────────────────────

const ChartTooltip = ({ tooltip, colorScale, width }) => {
  if (!tooltip) return null
  return (
    <div
      className="absolute pointer-events-none bg-background border border-border rounded-lg shadow-lg max-w-[260px] z-10 overflow-hidden text-xs"
      style={{
        left: Math.min(tooltip.x + 14, width - 220),
        top: Math.max(tooltip.y - 60, 4),
      }}
    >
      {/* Header uses the category's d3 color */}
      <div
        className="px-2.5 py-1.5 font-semibold text-xs text-white whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ background: colorScale(tooltip.cat) }}
      >
        {tooltip.accession || tooltip.organism}
      </div>
      <div className="px-2.5 py-2 flex flex-col gap-1">
        {[
          ["Organism", tooltip.organism],
          ["Group", tooltip.cat],
          ["Identity", `${tooltip.identity?.toFixed(1)}%`],
          ["Coverage", tooltip.coverage != null ? `${tooltip.coverage}%` : "—"],
          [
            "E-value",
            tooltip.evalue === 0 ? "0" : tooltip.evalue?.toExponential(1),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 leading-[18px] text-muted-foreground"
          >
            <span>{label}</span>
            <b className="text-right max-w-[140px] break-words text-foreground font-semibold">
              {value}
            </b>
          </div>
        ))}
        {tooltip.definition && (
          <div className="mt-0.5 text-[11px] text-muted-foreground break-words leading-snug border-t border-border pt-1">
            {tooltip.definition.length > 100
              ? tooltip.definition.slice(0, 99) + "…"
              : tooltip.definition}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TaxonomyScatterChart({ data, height = 440 }) {
  const containerRef = useRef(null)
  const [rankMode, setRankMode] = useState("phylum")
  const [tooltip, setTooltip] = useState(null)
  const [hiddenCats, setHiddenCats] = useState(new Set())
  const [highlightCat, setHighlightCat] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)

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

  const xScale = useMemo(
    () =>
      d3.scalePoint().domain(visibleCatNames).range([0, innerW]).padding(0.5),
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

  const jittered = useMemo(() => {
    if (innerW <= 0 || innerH <= 0) return []
    const withPos = visiblePoints.map(p => ({
      ...p,
      cx: xScale(p.cat),
      cy: yScale(p.identity),
    }))
    return beeswarmDodge(withPos)
  }, [visiblePoints, xScale, yScale, innerW, innerH])

  useEffect(() => {
    setHiddenCats(new Set())
  }, [rankMode])

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

  const showTooltip = useCallback((e, p) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, ...p })
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  const yTicks = yScale.ticks(6)
  const xTicks = visibleCatNames.map(cat => ({ cat, x: xScale(cat) }))

  if (!containerWidth) {
    return (
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: height }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none flex flex-col flex-1"
    >
      {/* Rank toggle */}
      <div className="flex items-center gap-1.5 mb-2.5">
        {["phylum", "class"].map(r => (
          <button
            key={r}
            onClick={() => setRankMode(r)}
            className={[
              "px-3.5 py-1 text-xs font-medium capitalize border rounded transition-colors",
              rankMode === r
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background text-muted-foreground border-border hover:bg-surface-raised hover:border-border-strong",
            ].join(" ")}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Category legend chips */}
      <div className="flex flex-wrap gap-1 mb-2">
        {categories.map(({ name, count }) => {
          const hidden = hiddenCats.has(name)
          const color = colorScale(name)
          return (
            <span
              key={name}
              role="button"
              tabIndex={0}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border-[1.5px] cursor-pointer transition-all hover:shadow-sm text-foreground"
              style={{
                borderColor: hidden ? "transparent" : color,
                opacity: hidden ? 0.4 : 1,
                background: hidden ? "var(--surface-raised)" : `${color}10`,
              }}
              onClick={() => toggleCategory(name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleCategory(name)
                }
              }}
              onMouseEnter={() => !hidden && setHighlightCat(name)}
              onMouseLeave={() => setHighlightCat(null)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: hidden ? "var(--border-strong)" : color }}
              />
              {name}
              <span className="text-muted-foreground text-[10px] font-normal">
                {count}
              </span>
            </span>
          )
        })}
      </div>

      {/* Chart */}
      <div className="relative border border-border rounded-lg overflow-hidden bg-surface-raised flex flex-col flex-1 justify-center">
        <svg width={width} height={height} className="block">
          <defs>
            <clipPath id="taxo-beeswarm-clip">
              <rect x={0} y={0} width={innerW} height={innerH} />
            </clipPath>
          </defs>

          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Y grid */}
            {yTicks.map(t => (
              <line
                key={t}
                x1={0}
                x2={innerW}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
            ))}

            {/* Category lane guides */}
            {xTicks.map(({ cat, x }) => (
              <line
                key={cat}
                x1={x}
                x2={x}
                y1={0}
                y2={innerH}
                stroke={
                  highlightCat === cat ? colorScale(cat) : "var(--border)"
                }
                strokeWidth={highlightCat === cat ? 1.5 : 0.5}
                strokeDasharray={highlightCat === cat ? "none" : "2 4"}
                opacity={highlightCat === cat ? 0.4 : 1}
              />
            ))}

            {/* Axes */}
            <line
              x1={0}
              x2={0}
              y1={0}
              y2={innerH}
              stroke="var(--border-strong)"
            />
            <line
              x1={0}
              x2={innerW}
              y1={innerH}
              y2={innerH}
              stroke="var(--border-strong)"
            />

            {/* Y ticks */}
            {yTicks.map(t => (
              <g key={t} transform={`translate(0,${yScale(t)})`}>
                <line x2={-4} stroke="var(--border-strong)" />
                <text
                  x={-8}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--muted-foreground)"
                >
                  {t}%
                </text>
              </g>
            ))}

            {/* Y label */}
            <text
              transform={`translate(-36,${innerH / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={11}
              fill="var(--muted-foreground)"
              fontWeight={500}
            >
              % Identity
            </text>

            {/* X ticks */}
            {xTicks.map(({ cat, x }) => (
              <g key={cat} transform={`translate(${x},${innerH})`}>
                <line y2={5} stroke="var(--border-strong)" />
                <text
                  y={8}
                  textAnchor="end"
                  dominantBaseline="hanging"
                  fontSize={10}
                  fill={
                    highlightCat === cat
                      ? colorScale(cat)
                      : "var(--muted-foreground)"
                  }
                  fontWeight={highlightCat === cat ? 600 : 400}
                  transform="rotate(-40)"
                >
                  {cat.length > 16 ? cat.slice(0, 15) + "…" : cat}
                </text>
              </g>
            ))}

            {/* Points */}
            <g clipPath="url(#taxo-beeswarm-clip)">
              {jittered.map((p, i) => {
                const color = colorScale(p.cat)
                const dimmed = highlightCat != null && highlightCat !== p.cat
                return (
                  <circle
                    key={i}
                    cx={p.cx + p.jitter}
                    cy={p.cy}
                    r={DOT_R}
                    fill={color}
                    opacity={dimmed ? 0.1 : 0.75}
                    style={{
                      cursor: p.enzyme_id ? "pointer" : "default",
                      transition: "opacity 0.15s ease",
                    }}
                    onClick={() =>
                      p.enzyme_id &&
                      window.open(`/enzyme/${p.enzyme_id}`, "_blank")
                    }
                    onMouseEnter={e => showTooltip(e, p)}
                    onMouseMove={e => showTooltip(e, p)}
                    onMouseLeave={hideTooltip}
                  />
                )
              })}
            </g>
          </g>
        </svg>

        <ChartTooltip tooltip={tooltip} colorScale={colorScale} width={width} />
      </div>
    </div>
  )
}

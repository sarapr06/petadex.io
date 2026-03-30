import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import keywordMap from "../../utils/keyword_map.json"
import * as s from "./functionalAnnotation.module.css"

// ── Parse definition into functional category ─────────────────────────────────

const KEYWORD_ENTRIES = Object.entries(keywordMap).map(([parent, keywords]) => ({
  parent,
  patterns: keywords.map(kw => kw.toLowerCase()),
}))

function classifyDefinition(definition) {
  if (!definition) return "Other"
  const lower = definition.toLowerCase()
  for (const { parent, patterns } of KEYWORD_ENTRIES) {
    for (const pat of patterns) {
      if (lower.includes(pat)) return parent
    }
  }
  return "Other"
}

// ── Main component ────────────────────────────────────────────────────────────

export function FunctionalAnnotationChart({ data, height = 500 }) {
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // ── Responsive width ────────────────────────────────────────────────────────
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

  // ── Classify hits ───────────────────────────────────────────────────────────
  const classified = useMemo(
    () =>
      data.map(hit => ({
        category: classifyDefinition(hit.name),
        identity: hit.identity ?? 0,
        evalue: hit.evalue,
        organism: hit.organism || "Unknown",
        definition: hit.name || "",
        accession: hit.accession || "",
        coverage: hit.query_coverage,
        enzyme_id: hit.enzyme_id,
      })),
    [data],
  )

  // ── Category tallies sorted by count desc ───────────────────────────────────
  const categories = useMemo(() => {
    const counts = {}
    for (const c of classified) counts[c.category] = (counts[c.category] || 0) + 1
    return Object.entries(counts)
      .sort((a, b) => {
        if (a[0] === "Other") return 1
        if (b[0] === "Other") return -1
        return b[1] - a[1]
      })
      .map(([name, count]) => ({ name, count }))
  }, [classified])

  const catNames = useMemo(() => categories.map(c => c.name), [categories])

  // ── Layout ──────────────────────────────────────────────────────────────────
  const barAreaHeight = 48
  const margin = { top: 16, right: 20, bottom: 80, left: 50 }
  const innerW = width - margin.left - margin.right
  const dotAreaHeight = height - margin.top - margin.bottom - barAreaHeight - 8
  const innerH = dotAreaHeight

  // ── Scales ──────────────────────────────────────────────────────────────────
  const maxCount = useMemo(() => Math.max(...categories.map(c => c.count), 1), [categories])

  const xScale = useMemo(
    () => d3.scalePoint().domain(catNames).range([0, innerW]).padding(0.5),
    [catNames, innerW],
  )

  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, 105]).range([innerH, 0]),
    [innerH],
  )

  const barScale = useMemo(
    () => d3.scaleLinear().domain([0, maxCount]).range([0, barAreaHeight - 8]),
    [maxCount, barAreaHeight],
  )

  // ── Jitter dots within each column ──────────────────────────────────────────
  const dots = useMemo(() => {
    if (innerW <= 0 || innerH <= 0) return []
    const byCategory = {}
    for (const c of classified) {
      if (!byCategory[c.category]) byCategory[c.category] = []
      byCategory[c.category].push(c)
    }
    const result = []
    for (const cat of catNames) {
      const items = byCategory[cat] || []
      items.sort((a, b) => a.identity - b.identity)
      const baseX = xScale(cat)
      for (let i = 0; i < items.length; i++) {
        const jitter = ((i % 7) - 3) * 2.5
        result.push({
          ...items[i],
          cx: baseX + jitter,
          cy: yScale(items[i].identity),
        })
      }
    }
    return result
  }, [classified, catNames, xScale, yScale, innerW, innerH])

  // ── Tooltip helpers ─────────────────────────────────────────────────────────
  const showTooltip = useCallback((e, d) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      ...d,
    })
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  // ── Ticks ───────────────────────────────────────────────────────────────────
  const yTicks = yScale.ticks(6)

  if (!containerWidth) {
    return <div ref={containerRef} style={{ width: "100%", minHeight: height }} />
  }

  return (
    <div ref={containerRef} className={s.container}>
      <div className={s.svgWrap}>
        <svg width={width} height={height} style={{ display: "block" }}>
          <defs>
            <clipPath id="fa-dot-clip">
              <rect x={0} y={0} width={innerW} height={innerH} />
            </clipPath>
          </defs>

          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* ── Dot area ─────────────────────────────────────────────────────── */}

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
            {catNames.map(cat => (
              <line
                key={cat}
                x1={xScale(cat)}
                x2={xScale(cat)}
                y1={0}
                y2={innerH}
                stroke="#f0f0f0"
                strokeWidth={0.5}
                strokeDasharray="2 4"
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

            {/* Dots */}
            <g clipPath="url(#fa-dot-clip)">
              {dots.map((d, i) => (
                <circle
                  key={i}
                  cx={d.cx}
                  cy={d.cy}
                  r={3.5}
                  fill="#6366f1"
                  stroke="#fff"
                  strokeWidth={0.5}
                  opacity={0.85}
                  style={{ cursor: d.enzyme_id ? "pointer" : "default" }}
                  onClick={() => {
                    if (d.enzyme_id) window.open(`/enzyme/${d.enzyme_id}`, "_blank")
                  }}
                  onMouseEnter={e => showTooltip(e, d)}
                  onMouseMove={e => showTooltip(e, d)}
                  onMouseLeave={hideTooltip}
                />
              ))}
            </g>

            {/* ── Bar area (below dot area) ────────────────────────────────────── */}
            <g transform={`translate(0,${innerH + 8})`}>
              {categories.map(({ name, count }) => {
                const cx = xScale(name)
                const bw = Math.max(innerW / catNames.length * 0.4, 8)
                const bh = barScale(count)
                return (
                  <g key={`bar-${name}`}>
                    <rect
                      x={cx - bw / 2}
                      y={barAreaHeight - 8 - bh}
                      width={bw}
                      height={bh}
                      rx={2}
                      fill={name === "Other" ? "#d1d5db" : "#6366f1"}
                      opacity={0.7}
                    />
                    <text
                      x={cx}
                      y={barAreaHeight - 8 - bh - 3}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#6b7280"
                    >
                      {count}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* X tick labels (below bars) */}
            {catNames.map(cat => (
              <g key={`xl-${cat}`} transform={`translate(${xScale(cat)},${innerH + barAreaHeight + 8})`}>
                <text
                  textAnchor="end"
                  dominantBaseline="hanging"
                  fontSize={10}
                  fill={cat === "Other" ? "#9ca3af" : "#6b7280"}
                  transform="rotate(-40)"
                >
                  {cat.length > 22 ? cat.slice(0, 21) + "\u2026" : cat}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className={s.tooltip}
            style={{
              left: Math.min(tooltip.x + 14, width - 260),
              top: Math.max(tooltip.y - 80, 4),
            }}
          >
            <div className={s.tooltipHeader}>
              {tooltip.category}
            </div>
            <div className={s.tooltipBody}>
              <div className={s.tooltipRow}>
                <span>Organism</span>
                <b><em>{tooltip.organism}</em></b>
              </div>
              <div className={s.tooltipRow}>
                <span>Accession</span>
                <b>{tooltip.accession}</b>
              </div>
              <div className={s.tooltipRow}>
                <span>Identity</span>
                <b>{tooltip.identity?.toFixed(1)}%</b>
              </div>
              <div className={s.tooltipRow}>
                <span>Coverage</span>
                <b>{tooltip.coverage != null ? `${tooltip.coverage}%` : "\u2014"}</b>
              </div>
              <div className={s.tooltipRow}>
                <span>E-value</span>
                <b>{tooltip.evalue === 0 ? "0" : tooltip.evalue?.toExponential(1)}</b>
              </div>
              {tooltip.definition && (
                <div className={s.tooltipDef}>
                  {tooltip.definition.length > 120
                    ? tooltip.definition.slice(0, 119) + "\u2026"
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

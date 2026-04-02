import React, { useState, useRef } from "react"
import * as d3 from "d3"

const QUERY_LENGTH = 290
const BAR_HEIGHT = 10
const BAR_GAP = 4

const SORT_OPTIONS = [
  { key: "bitscore", label: "Bitscore" },
  { key: "evalue", label: "E-value" },
  { key: "identity", label: "% Identity" },
  { key: "position", label: "Position" },
]

function formatEvalue(e) {
  if (e === 0) return "0"
  const exp = Math.floor(Math.log10(e))
  const mantissa = (e / Math.pow(10, exp)).toFixed(2)
  return `${mantissa}e${exp}`
}

// ── Inline tooltip (lives inside the SVG overlay div) ─────────────────────────

function HitTooltip({ data }) {
  if (!data) return null
  const {
    xPos,
    yPos,
    target_id,
    query_start,
    query_end,
    target_start,
    target_end,
    alignment_length,
    percent_identity,
    evalue,
    bitscore,
  } = data

  const rows = [
    ["Query range", `${query_start} – ${query_end}`],
    ["Target range", `${target_start} – ${target_end}`],
    ["Aln length", alignment_length],
    ["% Identity", `${percent_identity.toFixed(1)}%`],
    ["E-value", formatEvalue(evalue)],
    ["Bitscore", bitscore],
  ]

  return (
    <div
      className="absolute pointer-events-none bg-background border border-border rounded-lg px-3 py-2 shadow-md z-10 min-w-[160px] text-xs"
      style={{ left: xPos + 12, top: yPos - 20 }}
    >
      <div className="font-semibold text-foreground mb-1.5">{target_id}</div>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="text-muted-foreground pr-3 pb-0.5">{label}</td>
              <td className="text-foreground text-right tabular-nums">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── SVG color legend ───────────────────────────────────────────────────────────

function ColorLegend({ colorScale, x, y, width, height }) {
  const steps = 50
  const swatchH = height / steps

  return (
    <g>
      {Array.from({ length: steps }, (_, i) => {
        const t = i / (steps - 1)
        const pct = 35 + t * 65
        return (
          <rect
            key={i}
            x={x}
            y={y + i * swatchH}
            width={width}
            height={swatchH + 0.5}
            fill={colorScale(pct)}
          />
        )
      })}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="var(--border)"
        strokeWidth={0.5}
      />
      {[100, 75, 50, 35].map(pct => {
        const t = (pct - 35) / 65
        const yy = y + t * height
        return (
          <g key={pct}>
            <line
              x1={x + width}
              y1={yy}
              x2={x + width + 4}
              y2={yy}
              stroke="var(--muted-foreground)"
              strokeWidth={0.5}
            />
            <text
              x={x + width + 7}
              y={yy}
              fontSize={10}
              fill="var(--muted-foreground)"
              dominantBaseline="central"
            >
              {pct}%
            </text>
          </g>
        )
      })}
      <text
        x={x + width / 2}
        y={y - 10}
        fontSize={10}
        fill="var(--muted-foreground)"
        textAnchor="middle"
      >
        % Identity
      </text>
    </g>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlignmentCoverageMap({ width = 860, data }) {
  const [sortBy, setSortBy] = useState("bitscore")
  const [interactionData, setInteractionData] = useState(null)
  const svgRef = useRef(null)

  const margin = { top: 50, right: 150, bottom: 200, left: 148 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = data.length * (BAR_HEIGHT + BAR_GAP)
  const height = innerHeight + margin.top + margin.bottom

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === "bitscore") return b.bitscore - a.bitscore
    if (sortBy === "evalue") return a.evalue - b.evalue
    if (sortBy === "identity") return b.percent_identity - a.percent_identity
    if (sortBy === "position") return a.query_start - b.query_start
    return 0
  })

  const xScale = d3
    .scaleLinear()
    .domain([1, QUERY_LENGTH])
    .range([0, innerWidth])
  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([35, 100])
  const xTicks = xScale.ticks(7)

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Sort by:</span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={[
              "px-3 py-1 text-xs border rounded transition-colors",
              sortBy === key
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background text-foreground border-border hover:border-border-strong",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <svg ref={svgRef} width={width} height={height} className="block">
        <defs>
          <clipPath id="coverage-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Query reference bar */}
          <g>
            <text
              x={-6}
              y={-14}
              fontSize={11}
              fill="var(--muted-foreground)"
              textAnchor="end"
              dominantBaseline="central"
            >
              Query
            </text>
            <rect
              x={xScale(1)}
              y={-22}
              width={xScale(QUERY_LENGTH) - xScale(1)}
              height={10}
              fill="var(--border-strong)"
              rx={2}
              clipPath="url(#coverage-clip)"
            />
            <text
              x={xScale(QUERY_LENGTH / 2)}
              y={-14}
              fontSize={10}
              fill="var(--muted-foreground)"
              textAnchor="middle"
              dominantBaseline="central"
            >
              1 – {QUERY_LENGTH} aa
            </text>
          </g>

          {/* Bars */}
          <g clipPath="url(#coverage-clip)">
            {sortedData.map((d, i) => {
              const y = i * (BAR_HEIGHT + BAR_GAP)
              const x1 = xScale(d.query_start)
              const x2 = xScale(d.query_end)
              const barW = Math.max(x2 - x1, 1)
              return (
                <g
                  key={d.target_id + i}
                  onMouseMove={e => {
                    const rect = svgRef.current.getBoundingClientRect()
                    setInteractionData({
                      xPos: e.clientX - rect.left,
                      yPos: e.clientY - rect.top,
                      ...d,
                    })
                  }}
                  onMouseLeave={() => setInteractionData(null)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={0}
                    y={y}
                    width={innerWidth}
                    height={BAR_HEIGHT + BAR_GAP}
                    fill={i % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent"}
                  />
                  <rect
                    x={x1}
                    y={y + BAR_GAP / 2}
                    width={barW}
                    height={BAR_HEIGHT}
                    fill={colorScale(d.percent_identity)}
                    rx={2}
                    opacity={0.9}
                  />
                </g>
              )
            })}
          </g>

          {/* Y-axis labels */}
          {sortedData.map((d, i) => (
            <text
              key={d.target_id + "-label-" + i}
              x={-8}
              y={i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT + BAR_GAP) / 2}
              fontSize={10}
              fill="var(--foreground)"
              textAnchor="end"
              dominantBaseline="central"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {d.target_id}
            </text>
          ))}

          {/* X-axis */}
          <g transform={`translate(0, ${innerHeight})`}>
            <line
              x1={0}
              x2={innerWidth}
              y1={0}
              y2={0}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
            {xTicks.map(tick => (
              <g key={tick} transform={`translate(${xScale(tick)}, 0)`}>
                <line
                  y1={0}
                  y2={4}
                  stroke="var(--muted-foreground)"
                  strokeWidth={0.5}
                />
                <text
                  y={14}
                  fontSize={10}
                  fill="var(--muted-foreground)"
                  textAnchor="middle"
                >
                  {tick}
                </text>
              </g>
            ))}
            <text
              x={innerWidth / 2}
              y={36}
              fontSize={11}
              fill="var(--muted-foreground)"
              textAnchor="middle"
            >
              Query position (aa)
            </text>
          </g>

          <ColorLegend
            colorScale={colorScale}
            x={innerWidth + 24}
            y={0}
            width={14}
            height={Math.min(innerHeight, 200)}
          />
        </g>
      </svg>

      {/* Tooltip overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ width, height }}
      >
        <HitTooltip data={interactionData} />
      </div>
    </div>
  )
}

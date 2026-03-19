import React, { useState, useRef } from "react"
import * as d3 from "d3"


const QUERY_LENGTH = 290
const BAR_HEIGHT = 10
const BAR_GAP = 4

const SORT_OPTIONS = [
  { key: "bitscore",    label: "Bitscore" },
  { key: "evalue",      label: "E-value" },
  { key: "identity",    label: "% Identity" },
  { key: "position",    label: "Position" },
]

function formatEvalue(e) {
  if (e === 0) return "0"
  const exp = Math.floor(Math.log10(e))
  const mantissa = (e / Math.pow(10, exp)).toFixed(2)
  return `${mantissa}e${exp}`
}

function Tooltip({ data }) {
  if (!data) return null
  const { xPos, yPos, target_id, query_start, query_end, target_start, target_end,
          alignment_length, percent_identity, evalue, bitscore } = data

  const rows = [
    ["Query range",   `${query_start} – ${query_end}`],
    ["Target range",  `${target_start} – ${target_end}`],
    ["Aln length",    alignment_length],
    ["% Identity",    `${percent_identity.toFixed(1)}%`],
    ["E-value",       formatEvalue(evalue)],
    ["Bitscore",      bitscore],
  ]

  return (
    <div style={{
      position: "absolute",
      left: xPos + 12,
      top: yPos - 20,
      background: "white",
      border: "1px solid #e0e0e0",
      borderRadius: 6,
      padding: "8px 11px",
      fontSize: 12,
      pointerEvents: "none",
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      zIndex: 10,
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 5, fontSize: 12.5, color: "#1a1a1a" }}>
        {target_id}
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ color: "#888", paddingRight: 10, paddingBottom: 2 }}>{label}</td>
              <td style={{ color: "#222", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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
      <rect x={x} y={y} width={width} height={height} fill="none" stroke="#ccc" strokeWidth={0.5} />
      {[100, 75, 50, 35].map(pct => {
        const t = (pct - 35) / 65
        const yy = y + t * height
        return (
          <g key={pct}>
            <line x1={x + width} y1={yy} x2={x + width + 4} y2={yy} stroke="#666" strokeWidth={0.5} />
            <text x={x + width + 7} y={yy} fontSize={10} fill="#555" dominantBaseline="central">{pct}%</text>
          </g>
        )
      })}
      <text
        x={x + width / 2}
        y={y - 10}
        fontSize={10}
        fill="#555"
        textAnchor="middle"
      >
        % Identity
      </text>
    </g>
  )
}

export default function AlignmentCoverageMap({ width = 860, data }) {
  const [sortBy, setSortBy] = useState("bitscore")
  const [interactionData, setInteractionData] = useState(null)

  const svgRef = useRef(null)

  const margin = { top: 50, right: 150, bottom: 200, left: 148 }
  const innerWidth  = width - margin.left - margin.right
  const innerHeight = data.length * (BAR_HEIGHT + BAR_GAP)
  const height      = innerHeight + margin.top + margin.bottom

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === "bitscore")  return b.bitscore - a.bitscore
    if (sortBy === "evalue")    return a.evalue - b.evalue
    if (sortBy === "identity")  return b.percent_identity - a.percent_identity
    if (sortBy === "position")  return a.query_start - b.query_start
    return 0
  })

  const xScale = d3.scaleLinear().domain([1, QUERY_LENGTH]).range([0, innerWidth])

  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([35, 100])

  const xTicks = xScale.ticks(7)

  const btnBase = {
    padding: "4px 12px",
    border: "1px solid #ccc",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#666", marginRight: 2 }}>Sort by:</span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            style={{
              ...btnBase,
              background: sortBy === key ? "#1a73e8" : "#fff",
              color:      sortBy === key ? "#fff"    : "#333",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: "block" }}
      >
        <defs>
          <clipPath id="coverage-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>

          {/* Query reference bar at top */}
          <g>
            <text x={-6} y={-14} fontSize={11} fill="#888" textAnchor="end" dominantBaseline="central">
              Query
            </text>
            <rect
              x={xScale(1)}
              y={-22}
              width={xScale(QUERY_LENGTH) - xScale(1)}
              height={10}
              fill="#d0d0d0"
              rx={2}
              clipPath="url(#coverage-clip)"
            />
            <text x={xScale(QUERY_LENGTH / 2)} y={-14} fontSize={10} fill="#666" textAnchor="middle" dominantBaseline="central">
              1 – {QUERY_LENGTH} aa
            </text>
          </g>

          {/* Horizontal grid lines + bars */}
          <g clipPath="url(#coverage-clip)">
            {sortedData.map((d, i) => {
              const y   = i * (BAR_HEIGHT + BAR_GAP)
              const x1  = xScale(d.query_start)
              const x2  = xScale(d.query_end)
              const barW = Math.max(x2 - x1, 1)
              return (
                <g
                  key={d.target_id + i}
                  onMouseMove={(e) => {
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
                  {/* row stripe */}
                  <rect
                    x={0}
                    y={y}
                    width={innerWidth}
                    height={BAR_HEIGHT + BAR_GAP}
                    fill={i % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent"}
                  />
                  {/* alignment bar */}
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

          {/* Y-axis */}
          {sortedData.map((d, i) => {
            const y = i * (BAR_HEIGHT + BAR_GAP) + (BAR_HEIGHT + BAR_GAP) / 2
            return (
              <text
                key={d.target_id + "-label-" + i}
                x={-8}
                y={y}
                fontSize={10}
                fill="#444"
                textAnchor="end"
                dominantBaseline="central"
                style={{ fontFamily: "monospace" }}
              >
                {d.target_id}
              </text>
            )
          })}

          {/* X-axis */}
          <g transform={`translate(0, ${innerHeight})`}>
            <line x1={0} x2={innerWidth} y1={0} y2={0} stroke="#ccc" strokeWidth={0.5} />
            {xTicks.map(tick => (
              <g key={tick} transform={`translate(${xScale(tick)}, 0)`}>
                <line y1={0} y2={4} stroke="#999" strokeWidth={0.5} />
                <text y={14} fontSize={10} fill="#666" textAnchor="middle">
                  {tick}
                </text>
              </g>
            ))}
            <text
              x={innerWidth / 2}
              y={36}
              fontSize={11}
              fill="#666"
              textAnchor="middle"
            >
              Query position (aa)
            </text>
          </g>

          {/* Color legend */}
          <ColorLegend
            colorScale={colorScale}
            x={innerWidth + 24}
            y={0}
            width={14}
            height={Math.min(innerHeight, 200)}
          />

        </g>
      </svg>

      {/* Tooltip */}
      <div style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none" }}>
        <Tooltip data={interactionData} />
      </div>
    </div>
  )
}

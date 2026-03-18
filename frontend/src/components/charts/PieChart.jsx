import React, { useState } from "react"
import * as d3 from "d3"

export const FamilyPieChart = ({
  familyCounts,
  unknownCount,
  total,
  width = 300,
  height = 300,
}) => {
  const [hovered, setHovered] = useState(null)
  const radius = Math.min(width, height) / 2 - 20

  // Build pieData from pre-computed familyCounts
  const pieData = Object.entries(familyCounts)
    .map(([name, { count }]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  if (unknownCount > 0) {
    pieData.push({ name: "Unknown", count: unknownCount })
  }

  const colorScale = d3
    .scaleOrdinal(d3.schemeTableau10)
    .domain(pieData.map(d => d.name))

  const pie = d3
    .pie()
    .value(d => d.count)
    .sort(null)
  const arc = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius)
  const arcHover = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius + 8)

  const arcs = pie(pieData)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <svg width={width} height={height}>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {arcs.map((d, i) => (
            <path
              key={i}
              d={hovered === i ? arcHover(d) : arc(d)}
              fill={colorScale(d.data.name)}
              stroke="white"
              strokeWidth={1.5}
              style={{ cursor: "pointer", transition: "d 0.15s" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Center label */}
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={20}
            fontWeight={600}
            fill="#333"
            y={-8}
          >
            {pieData.length}
          </text>
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="#999"
            y={12}
          >
            families
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div
        style={{
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: "100%",
        }}
      >
        {pieData.map((d, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: hovered === null || hovered === i ? 1 : 0.4,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: colorScale(d.name),
                flexShrink: 0,
              }}
            />
            <span>{d.name}</span>
            <span
              style={{
                color: "#999",
                marginLeft: "auto",
                paddingLeft: 12,
                whiteSpace: "nowrap",
              }}
            >
              {d.count} ({Math.round((d.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

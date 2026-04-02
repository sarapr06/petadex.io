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

  const pieData = Object.entries(familyCounts)
    .map(([name, { count, family_num }]) => ({ name, count, family_num }))
    .sort((a, b) => b.count - a.count)

  if (unknownCount > 0) {
    pieData.push({ name: "Unknown", count: unknownCount, family_num: null })
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
    <div className="flex flex-col items-center gap-3">
      <svg width={width} height={height}>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {arcs.map((d, i) => (
            <path
              key={i}
              d={hovered === i ? arcHover(d) : arc(d)}
              fill={colorScale(d.data.name)}
              stroke="white"
              strokeWidth={1.5}
              style={{
                cursor: d.data.family_num != null ? "pointer" : "default",
                transition: "d 0.15s",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() =>
                d.data.family_num != null &&
                window.open(`/family/${d.data.family_num}`, "_blank")
              }
            />
          ))}
          {/* Center label */}
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={20}
            fontWeight={600}
            fill="var(--foreground)"
            y={-8}
          >
            {pieData.length}
          </text>
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="var(--muted-foreground)"
            y={12}
          >
            families
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-1 w-full text-xs">
        {pieData.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 transition-opacity"
            style={{
              opacity: hovered === null || hovered === i ? 1 : 0.4,
              cursor: d.family_num != null ? "pointer" : "default",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() =>
              d.family_num != null &&
              window.open(`/family/${d.family_num}`, "_blank")
            }
          >
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: colorScale(d.name) }}
            />
            <span className="text-foreground">{d.name}</span>
            <span className="text-muted-foreground ml-auto pl-3 whitespace-nowrap">
              {d.count} ({Math.round((d.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

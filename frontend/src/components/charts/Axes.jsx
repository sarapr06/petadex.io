import React from "react"

export const Axes = ({ xScale, yScale, width, height }) => {
  const xTicks = xScale.ticks(5)
  const yTicks = yScale.ticks(5)

  return (
    <g>
      <line x1={0} x2={width} y1={height} y2={height} stroke="var(--border)" />
      <line x1={0} x2={0} y1={0} y2={height} stroke="var(--border)" />

      {xTicks.map(tick => (
        <g key={tick} transform={`translate(${xScale(tick)}, ${height})`}>
          <line y2={5} stroke="var(--border)" />
          <text
            y={18}
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {tick}%
          </text>
        </g>
      ))}

      {yTicks.map(tick => (
        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
          <line x2={-5} stroke="var(--border)" />
          <text
            x={-8}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {tick}%
          </text>
        </g>
      ))}

      <text
        x={width / 2}
        y={height + 40}
        textAnchor="middle"
        fontSize={13}
        fill="var(--muted-foreground)"
      >
        Identity (%)
      </text>
      <text
        transform={`translate(-40, ${height / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={13}
        fill="var(--muted-foreground)"
      >
        Coverage (%)
      </text>
    </g>
  )
}

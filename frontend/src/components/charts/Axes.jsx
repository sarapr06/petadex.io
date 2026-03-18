import React from "react"

export const Axes = ({ xScale, yScale, width, height, margin }) => {
  const xTicks = xScale.ticks(5)
  const yTicks = yScale.ticks(5)

  return (
    <g>
      {/* X axis line */}
      <line x1={0} x2={width} y1={height} y2={height} stroke="#ccc" />
      {/* Y axis line */}
      <line x1={0} x2={0} y1={0} y2={height} stroke="#ccc" />

      {/* X ticks */}
      {xTicks.map(tick => (
        <g key={tick} transform={`translate(${xScale(tick)}, ${height})`}>
          <line y2={5} stroke="#ccc" />
          <text y={18} textAnchor="middle" fontSize={11} fill="#888">
            {tick}%
          </text>
        </g>
      ))}

      {/* Y ticks */}
      {yTicks.map(tick => (
        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
          <line x2={-5} stroke="#ccc" />
          <text
            x={-8}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={11}
            fill="#888"
          >
            {tick}%
          </text>
        </g>
      ))}

      {/* Axis labels */}
      <text
        x={width / 2}
        y={height + 40}
        textAnchor="middle"
        fontSize={13}
        fill="#555"
      >
        Identity (%)
      </text>
      <text
        transform={`translate(-40, ${height / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={13}
        fill="#555"
      >
        Coverage (%)
      </text>
    </g>
  )
}

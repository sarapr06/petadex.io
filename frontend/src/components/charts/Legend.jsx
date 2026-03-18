import React from "react"
import * as d3 from "d3"

export const Legend = ({ colorScale, innerWidth, evalueMin, evalueMax }) => {
  const legendWidth = 200
  const legendHeight = 12
  const legendSteps = 100
  const legendScale = d3
    .scaleLog()
    .domain([evalueMin, evalueMax])
    .range([0, legendWidth])

  const legendTicks = d3
    .ticks(Math.log10(evalueMin), Math.log10(evalueMax), 4)
    .map(t => Math.pow(10, t))

  return (
    <g transform={`translate(${innerWidth - legendWidth - 10}, ${-45})`}>
      <text fontSize={11} fill="#555" y={-5}>
        E-value
      </text>
      {/* Gradient bar */}
      {Array.from({ length: legendSteps }, (_, i) => {
        const t = i / legendSteps
        const logMin = Math.log10(evalueMin)
        const logMax = Math.log10(evalueMax)
        const evalueAtT = Math.pow(10, logMin + t * (logMax - logMin))
        return (
          <rect
            key={i}
            x={(i / legendSteps) * legendWidth}
            y={0}
            width={legendWidth / legendSteps + 1}
            height={legendHeight}
            fill={colorScale(evalueAtT)}
          />
        )
      })}
      {/* Tick labels */}
      {legendTicks.map(v => {
        const x = legendScale(v)
        return (
          <g key={v} transform={`translate(${x}, 0)`}>
            <line y1={legendHeight} y2={legendHeight + 4} stroke="#888" />
            <text
              y={legendHeight + 14}
              textAnchor="middle"
              fontSize={10}
              fill="#888"
            >
              {v.toExponential(0)}
            </text>
          </g>
        )
      })}
      {/* Border */}
      <rect
        width={legendWidth}
        height={legendHeight}
        fill="none"
        stroke="#ccc"
        strokeWidth={0.5}
      />
    </g>
  )
}

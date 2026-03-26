import React, { useState, useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Axes } from "./Axes"
import * as styles from "./scatterplot.module.css"
import { Tooltip } from "./Tooltip"

export const Scatterplot = ({ width, height, data }) => {
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity)
  const [zoomMode, setZoomMode] = useState(false)
  const svgRef = useRef(null)
  const zoomRef = useRef(null)

  const margin = { top: 60, right: 100, bottom: 100, left: 60 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const xMin = d3.min(data, d => d.x) - 5
  const xMax = d3.max(data, d => d.x) + 5
  const yMin = d3.min(data, d => d.y) - 5
  const yMax = d3.max(data, d => d.y) + 5

  const sortedData = [...data]

  const [interactionData, setInteractionData] = useState()

  // Base scales
  const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth])
  const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0])

  // Rescaled scales — these shift/stretch with the zoom transform
  const zoomedXScale = zoomTransform.rescaleX(xScale)
  const zoomedYScale = zoomTransform.rescaleY(yScale)

  const sizeScale = d3.scaleSqrt().domain([0, 600]).range([4, 16])

  // Set up D3 zoom behavior
  useEffect(() => {
    const svg = d3.select(svgRef.current)

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .translateExtent([
        [-margin.left, -margin.top],
        [width + margin.right, height + margin.bottom],
      ])
      .on("zoom", (event) => {
        setZoomTransform(event.transform)
      })

    zoomRef.current = zoom
    svg.call(zoom)

    return () => svg.on(".zoom", null)
  }, [width, height, margin.left, margin.top, margin.right, margin.bottom])

  // Enable/disable pointer events on the SVG based on zoom mode
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.style("cursor", zoomMode ? "grab" : "default")
    // When zoom mode is off, disable the zoom interaction
    if (!zoomMode) {
      svg.on(".zoom", null)
    } else if (zoomRef.current) {
      svg.call(zoomRef.current)
    }
  }, [zoomMode])

  const handleResetZoom = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (zoomRef.current) {
      svg.transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }, [])

  const squares = sortedData.map((d, i) => {
    const r = sizeScale(d.size) / 2
    const cx = zoomedXScale(d.x)
    const cy = zoomedYScale(d.y)
    return (
      <g
        key={i}
        style={{ cursor: "pointer" }}
        onClick={() => { if (!zoomMode && d.enzyme_id != null) window.open(`/enzyme/${d.enzyme_id}`, "_blank") }}
        onMouseMove={() =>
          setInteractionData({
            xPos: cx + margin.left,
            yPos: cy + margin.top,
            ...d,
          })
        }
        onMouseLeave={() => setInteractionData(undefined)}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#1a73e8"
          opacity={0.7}
          className={styles.scatterplotSquare}
        />
      </g>
    )
  })

  const annotations = sortedData
    .filter(d => d.annotation)
    .map((d, i) => {
      const size = sizeScale(d.size)
      // Use zoomed scales for annotation positions too
      const x = zoomedXScale(d.x)
      const y = zoomedYScale(d.y)
      const xText = d.annotation === "right" ? x + size / 2 + 5 : x - size / 2 - 5
      const yText = y
      return (
        <g key={i}>
          <rect
            x={x - size / 2}
            y={y - size / 2}
            fill="none"
            strokeWidth={1}
            stroke="black"
            width={size}
            height={size}
          />
          <text
            x={xText}
            y={yText}
            fontSize={12}
            fontWeight={500}
            textAnchor={d.annotation === "right" ? "start" : "end"}
            dominantBaseline="middle"
          >
            {d.name}
          </text>
        </g>
      )
    })

  return (
    <div style={{ position: "relative" }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setZoomMode(z => !z)}
          style={{
            padding: "4px 12px",
            border: "1px solid #ccc",
            borderRadius: 4,
            background: zoomMode ? "#1a73e8" : "#fff",
            color: zoomMode ? "#fff" : "#333",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {zoomMode ? "🔍 Zoom On" : "🔍 Zoom Off"}
        </button>
        <button
          onClick={handleResetZoom}
          style={{
            padding: "4px 12px",
            border: "1px solid #ccc",
            borderRadius: 4,
            background: "#fff",
            color: "#333",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ↺ Reset
        </button>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        shapeRendering="crispEdges"
        // Block mouse tooltip events from firing when panning/zooming
        style={{ userSelect: "none" }}
      >
        {/* Clip path so points don't render outside the plot area */}
        <defs>
          <clipPath id="plot-area">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <Axes
            xScale={zoomedXScale}
            yScale={zoomedYScale}
            width={innerWidth}
            height={innerHeight}
          />
          <g clipPath="url(#plot-area)">
            {squares}
            {annotations}
          </g>
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          width,
          height,
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        <Tooltip interactionData={interactionData} />
      </div>
    </div>
  )
}

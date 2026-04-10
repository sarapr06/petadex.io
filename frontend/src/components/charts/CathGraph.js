import React, { useEffect, useRef } from "react"
import {
  COMPONENT_TO_CATH,
  CATH_GROUPS,
  COMPONENT_SHADE_CSS,
  CATH_BASE_CSS,
} from "../../utils/cathColors"

// Hub-spoke Cytoscape graph: CATH domain nodes → component nodes
const CathGraph = ({ activeComponents }) => {
  const containerRef = useRef(null)
  const cyRef        = useRef(null)

  useEffect(() => {
    if (!containerRef.current || activeComponents.length === 0) return

    let destroyed = false

    async function init() {
      const cytoscape = (await import("cytoscape")).default
      if (destroyed || !containerRef.current) return

      // Determine which CATH domains are represented
      const activeCaths = new Set(
        activeComponents.map(c => COMPONENT_TO_CATH[c]).filter(Boolean)
      )

      const elements = []

      // Domain hub nodes
      for (const cath of activeCaths) {
        elements.push({
          data: { id: `d_${cath}`, label: cath, cath, type: "domain" },
        })
      }

      // Component spoke nodes + edges
      for (const comp of activeComponents) {
        const cath = COMPONENT_TO_CATH[comp]
        if (!cath || !activeCaths.has(cath)) continue
        elements.push({
          data: { id: `c_${comp}`, label: String(comp), comp, cath, type: "component" },
        })
        elements.push({
          data: { id: `e_${cath}_${comp}`, source: `d_${cath}`, target: `c_${comp}` },
        })
      }

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        layout: {
          name: "cose",
          nodeRepulsion: 3000,
          idealEdgeLength: 55,
          edgeElasticity: 0.3,
          gravity: 0.4,
          numIter: 800,
          fit: true,
          padding: 18,
          animate: false,
        },
        style: [
          {
            selector: 'node[type="domain"]',
            style: {
              "background-color": ele => CATH_BASE_CSS[ele.data("cath")] || "#475569",
              "label": "data(label)",
              "color": "#f1f5f9",
              "font-size": "8px",
              "text-valign": "center",
              "text-halign": "center",
              "width": 75,
              "height": 26,
              "shape": "round-rectangle",
              "text-wrap": "wrap",
              "text-max-width": "70px",
              "border-width": 0,
            },
          },
          {
            selector: 'node[type="component"]',
            style: {
              "background-color": ele => COMPONENT_SHADE_CSS[ele.data("comp")] || "#64748b",
              "label": "data(label)",
              "color": "#f1f5f9",
              "font-size": "9px",
              "text-valign": "center",
              "text-halign": "center",
              "width": 26,
              "height": 26,
              "shape": "ellipse",
              "border-width": 0,
            },
          },
          {
            selector: "edge",
            style: {
              "width": 1,
              "line-color": "#334155",
              "curve-style": "bezier",
              "opacity": 0.6,
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-width": 2,
              "border-color": "#38bdf8",
            },
          },
        ],
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        autoungrabify: false,
      })

      if (!destroyed) cyRef.current = cy
      else cy.destroy()
    }

    init()
    return () => {
      destroyed = true
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null }
    }
  }, [activeComponents])

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "280px",
        height: "100%",
        background: "rgba(15,23,42,0.92)",
        borderLeft: "1px solid #1e293b",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #1e293b",
          color: "#94a3b8",
          fontSize: "11px",
          flexShrink: 0,
        }}
      >
        CATH domains · components
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}

export default CathGraph

/**
 * Phylogenetic Tree Viewer — /tree/:familyId
 *
 * Fetches a Newick tree from the backend and renders it as an
 * interactive horizontal dendrogram using d3-hierarchy + React SVG.
 */

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "gatsby"
import { hierarchy } from "d3-hierarchy"
import config from "../../config"
import Layout from "../../components/layout"
import { parseNewick, countLeaves } from "../../components/treePrototype/newickUtils.js"
// Phylogram layout — positions nodes by cumulative branch length (x-axis)
// and evenly-spaced leaf order (y-axis). Replaces d3.cluster() which forces
// all leaves to the same depth (ultrametric/cladogram appearance).
// ---------------------------------------------------------------------------
function buildPhylogram(root, treeW, treeH) {
  // 1. Compute cumulative branch length from root for every node (breadth-first
  //    so parents are always visited before their children).
  root.each(node => {
    const bl = node.data.branchLength != null ? node.data.branchLength : 0
    node.distFromRoot = (node.parent ? node.parent.distFromRoot : 0) + bl
  })

  const maxDist = root.descendants().reduce((m, n) => Math.max(m, n.distFromRoot), 1e-10)

  // 2. Scale horizontal position to [0, treeW]
  root.each(node => {
    node.y = (node.distFromRoot / maxDist) * treeW
  })

  // 3. Collect leaves in pre-order (left-to-right reading order)
  const leaves = []
  root.eachBefore(node => {
    if (!node.children || node.children.length === 0) leaves.push(node)
  })

  // 4. Assign evenly-spaced vertical positions to leaves
  const n = leaves.length
  leaves.forEach((leaf, i) => {
    leaf.x = n <= 1 ? treeH / 2 : (i / (n - 1)) * treeH
  })

  // 5. Internal nodes: vertical midpoint of their children's range (post-order)
  root.eachAfter(node => {
    if (node.children && node.children.length > 0) {
      const childX = node.children.map(c => c.x)
      node.x = (Math.min(...childX) + Math.max(...childX)) / 2
    }
  })

  return root
}

// ---------------------------------------------------------------------------
// Tree SVG renderer
// ---------------------------------------------------------------------------
const LEAF_H = 14      // px per leaf (unzoomed)
const TREE_W = 580     // px for tree structure (left-to-right)
const LABEL_W = 220    // px reserved for leaf labels
const MARGIN = { top: 10, right: 10, bottom: 10, left: 20 }

function DendrogramSVG({ root }) {
  const containerRef = useRef(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const drag = useRef(null)

  const numLeaves = countLeaves(root)
  const treeH = Math.max(numLeaves * LEAF_H, 200)
  const svgW = MARGIN.left + TREE_W + LABEL_W + MARGIN.right
  const svgH = MARGIN.top + treeH + MARGIN.bottom

  // Build phylogram layout
  const layoutRoot = buildPhylogram(hierarchy(root, d => d.children), TREE_W, treeH)
  const nodes = layoutRoot.descendants()
  const links = layoutRoot.links()

  // SVG coordinate helpers: node.y = horizontal (dist from root), node.x = vertical
  const sx = d => MARGIN.left + d.y
  const sy = d => MARGIN.top + d.x

  // Elbow link: vertical segment at parent's x, then horizontal to child.
  // V before H places the "corner" at (parent_x, child_y), which is the
  // standard phylogram look.
  const linkPath = ({ source: p, target: c }) =>
    `M${sx(p)},${sy(p)} V${sy(c)} H${sx(c)}`

  // Pan/zoom handlers
  const onWheel = useCallback(e => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => ({ ...t, k: Math.min(Math.max(t.k * factor, 0.2), 8) }))
  }, [])

  const onMouseDown = useCallback(e => {
    drag.current = { startX: e.clientX - transform.x, startY: e.clientY - transform.y }
  }, [transform])

  const onMouseMove = useCallback(e => {
    const d = drag.current
    if (!d) return
    setTransform(t => ({ ...t, x: e.clientX - d.startX, y: e.clientY - d.startY }))
  }, [])

  const onMouseUp = useCallback(() => { drag.current = null }, [])

  const resetView = () => setTransform({ x: 0, y: 0, k: 1 })

  // Max label length to display
  const MAX_LABEL = 32

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, display: "flex", gap: "0.4rem" }}>
        <button onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.3, 8) }))} style={btnStyle}>+</button>
        <button onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k * 0.77, 0.2) }))} style={btnStyle}>−</button>
        <button onClick={resetView} style={btnStyle}>Reset</button>
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "70vh", minHeight: 400, overflow: "hidden", background: "#fafafa", border: "1px solid #e9ecef", borderRadius: 6, cursor: drag.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <svg
          width={svgW}
          height={svgH}
          style={{ display: "block", transformOrigin: "0 0", transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.k})` }}
        >
          {/* Links */}
          <g stroke="#adb5bd" fill="none" strokeWidth={0.8}>
            {links.map((link, i) => (
              <path key={i} d={linkPath(link)} />
            ))}
          </g>

          {/* Nodes */}
          {nodes.map((node, i) => {
            const isLeaf = !node.children
            const label = node.data.name || ""
            const displayLabel = label.length > MAX_LABEL ? label.slice(0, MAX_LABEL) + "…" : label
            return (
              <g key={i} transform={`translate(${sx(node)},${sy(node)})`}>
                <circle r={isLeaf ? 2.5 : 2} fill={isLeaf ? "#007bff" : "#6c757d"} />
                {isLeaf && displayLabel && (
                  <text
                    x={6}
                    dy="0.32em"
                    fontSize={11}
                    fontFamily="monospace"
                    fill="#343a40"
                    style={{ userSelect: "none" }}
                  >
                    {displayLabel}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "#868e96" }}>
        {numLeaves} leaves · scroll to zoom · drag to pan
      </div>
    </div>
  )
}

const btnStyle = {
  padding: "0.2rem 0.55rem",
  fontSize: "0.85rem",
  background: "white",
  border: "1px solid #dee2e6",
  borderRadius: 4,
  cursor: "pointer",
  lineHeight: 1.4,
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
const TreePage = ({ params }) => {
  const familyId = params?.familyId
  const [nwk, setNwk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!familyId) return
    setLoading(true)
    setError(null)
    fetch(`${config.apiUrl}/search/phylo-tree/${familyId}`)
      .then(r => {
        if (!r.ok) throw new Error(`No tree found for Family ${familyId}`)
        return r.text()
      })
      .then(text => { setNwk(text.trim()); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [familyId])

  let treeRoot = null
  let parseError = null
  if (nwk) {
    try {
      treeRoot = parseNewick(nwk)
    } catch (e) {
      parseError = "Failed to parse Newick format."
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>
            Family {familyId} — Phylogenetic Tree
          </h1>
          <Link
            to={`/search`}
            style={{ fontSize: "0.85rem", color: "#6c757d", textDecoration: "none" }}
          >
            ← Back to search
          </Link>
        </div>

        {loading && (
          <div style={{ color: "#666", padding: "2rem 0" }}>Loading tree…</div>
        )}

        {error && !loading && (
          <div style={{ color: "#721c24", background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 4, padding: "0.75rem 1rem" }}>
            {error}
          </div>
        )}

        {parseError && (
          <div style={{ color: "#721c24", background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 4, padding: "0.75rem 1rem" }}>
            {parseError}
          </div>
        )}

        {treeRoot && !parseError && (
          <DendrogramSVG root={treeRoot} />
        )}

        {nwk && (
          <div style={{ marginTop: "1rem" }}>
            <a
              href={`${config.apiUrl}/search/phylo-tree/${familyId}`}
              download={`family_${familyId}.nwk`}
              style={{ fontSize: "0.85rem", color: "#007bff", textDecoration: "none" }}
            >
              Download .nwk file
            </a>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default TreePage

export const Head = ({ params }) => (
  <title>Family {params?.familyId} Tree — PETadex</title>
)

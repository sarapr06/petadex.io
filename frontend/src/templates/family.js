import React, { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "gatsby"
import { hierarchy } from "d3-hierarchy"
import "../styles/home.css"
import SiteHeader from "../components/SiteHeader"
import Seo from "../components/seo"
import SequenceViewer from "../components/SequenceViewer"
import AtlasMap from "../components/AtlasMap"
import config from "../config"
import { useScrollHeader } from "../hooks/useScrollHeader"
import {
  COMPONENT_TO_CATH,
  COMPONENT_SHADE_CSS,
  CATH_BASE_CSS,
} from "../utils/cathColors"

// ── CATH badge helper ──────────────────────────────────────────────────────

function CathBadge({ components }) {
  if (!components || components.length === 0) return null

  // Group components by CATH domain
  const cathMap = {}
  for (const comp of components) {
    const cath = COMPONENT_TO_CATH[comp] || "Unknown"
    if (!cathMap[cath]) cathMap[cath] = []
    cathMap[cath].push(comp)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {Object.entries(cathMap).map(([cath, comps]) => (
        <div key={cath}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <span style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "3px",
              backgroundColor: CATH_BASE_CSS[cath] || "#475569",
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#2c3e50",
              fontFamily: "monospace",
            }}>
              {cath}
            </span>
          </div>
          <div style={{ paddingLeft: "20px", marginTop: "0.25rem" }}>
            {comps.sort((a, b) => a - b).map(comp => (
              <div key={comp} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.15rem",
              }}>
                <span style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: COMPONENT_SHADE_CSS[comp] || "#94a3b8",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Component {comp}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Newick parser (same as tree/[familyId].js) ─────────────────────────────

function parseNewick(s) {
  const ancestors = []
  let tree = {}
  const tokens = s.split(/\s*(;|\(|\)|,|:)\s*/)
  let prevToken = ""

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim()
    if (!token) continue

    switch (token) {
      case "(": {
        const child = {}
        tree.children = tree.children || []
        tree.children.push(child)
        ancestors.push(tree)
        tree = child
        break
      }
      case ")":
        tree = ancestors.pop()
        break
      case ",": {
        const sibling = {}
        ancestors[ancestors.length - 1].children.push(sibling)
        tree = sibling
        break
      }
      case ":":
        break
      default:
        if (prevToken === "(" || prevToken === "," || prevToken === ")") {
          tree.name = token
        } else if (prevToken === ":") {
          tree.branchLength = parseFloat(token) || 0
        }
    }
    prevToken = token
  }
  return tree
}

function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

// ── Phylogram layout ───────────────────────────────────────────────────────

function buildPhylogram(root, treeW, treeH) {
  root.each(node => {
    const bl = node.data.branchLength != null ? node.data.branchLength : 0
    node.distFromRoot = (node.parent ? node.parent.distFromRoot : 0) + bl
  })
  const maxDist = root.descendants().reduce((m, n) => Math.max(m, n.distFromRoot), 1e-10)
  root.each(node => { node.y = (node.distFromRoot / maxDist) * treeW })
  const leaves = []
  root.eachBefore(node => {
    if (!node.children || node.children.length === 0) leaves.push(node)
  })
  const n = leaves.length
  leaves.forEach((leaf, i) => {
    leaf.x = n <= 1 ? treeH / 2 : (i / (n - 1)) * treeH
  })
  root.eachAfter(node => {
    if (node.children && node.children.length > 0) {
      const childX = node.children.map(c => c.x)
      node.x = (Math.min(...childX) + Math.max(...childX)) / 2
    }
  })
  return root
}

// ── Tree SVG ───────────────────────────────────────────────────────────────

const LEAF_H = 14
const TREE_W = 580
const LABEL_W = 220
const MARGIN = { top: 10, right: 10, bottom: 10, left: 20 }
const treeBtnStyle = {
  padding: "0.2rem 0.55rem",
  fontSize: "0.85rem",
  background: "white",
  border: "1px solid #dee2e6",
  borderRadius: 4,
  cursor: "pointer",
  lineHeight: 1.4,
}

function DendrogramSVG({ root }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const drag = useRef(null)

  const numLeaves = countLeaves(root)
  const treeH = Math.max(numLeaves * LEAF_H, 200)
  const svgW = MARGIN.left + TREE_W + LABEL_W + MARGIN.right
  const svgH = MARGIN.top + treeH + MARGIN.bottom

  const layoutRoot = buildPhylogram(hierarchy(root, d => d.children), TREE_W, treeH)
  const nodes = layoutRoot.descendants()
  const links = layoutRoot.links()

  const sx = d => MARGIN.left + d.y
  const sy = d => MARGIN.top + d.x
  const linkPath = ({ source: p, target: c }) =>
    `M${sx(p)},${sy(p)} V${sy(c)} H${sx(c)}`

  const onWheel = useCallback(e => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => ({ ...t, k: Math.min(Math.max(t.k * factor, 0.2), 8) }))
  }, [])

  const onMouseDown = useCallback(e => {
    drag.current = { startX: e.clientX - transform.x, startY: e.clientY - transform.y }
  }, [transform])

  const onMouseMove = useCallback(e => {
    if (!drag.current) return
    setTransform(t => ({ ...t, x: e.clientX - drag.current.startX, y: e.clientY - drag.current.startY }))
  }, [])

  const onMouseUp = useCallback(() => { drag.current = null }, [])
  const resetView = () => setTransform({ x: 0, y: 0, k: 1 })
  const MAX_LABEL = 32

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, display: "flex", gap: "0.4rem" }}>
        <button onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.3, 8) }))} style={treeBtnStyle}>+</button>
        <button onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k * 0.77, 0.2) }))} style={treeBtnStyle}>−</button>
        <button onClick={resetView} style={treeBtnStyle}>Reset</button>
      </div>
      <div
        style={{ width: "100%", height: "60vh", minHeight: 300, overflow: "hidden", background: "#fafafa", border: "1px solid #e9ecef", borderRadius: 6, cursor: drag.current ? "grabbing" : "grab" }}
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
          <g stroke="#adb5bd" fill="none" strokeWidth={0.8}>
            {links.map((link, i) => <path key={i} d={linkPath(link)} />)}
          </g>
          {nodes.map((node, i) => {
            const isLeaf = !node.children
            const label = node.data.name || ""
            const displayLabel = label.length > MAX_LABEL ? label.slice(0, MAX_LABEL) + "…" : label
            return (
              <g key={i} transform={`translate(${sx(node)},${sy(node)})`}>
                <circle r={isLeaf ? 2.5 : 2} fill={isLeaf ? "#007bff" : "#6c757d"} />
                {isLeaf && displayLabel && (
                  <text x={6} dy="0.32em" fontSize={11} fontFamily="monospace" fill="#343a40" style={{ userSelect: "none" }}>
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

// ── Sequence table ─────────────────────────────────────────────────────────

function MembersTable({ familyId, centroid }) {
  const [viewMode, setViewMode] = useState("centroid") // "centroid" | "members"
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [expandedSeq, setExpandedSeq] = useState(null)

  const loadMembers = useCallback(async (p) => {
    setLoading(true)
    try {
      const res = await fetch(`${config.apiUrl}/family/${familyId}/members?page=${p}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.data || [])
        setPagination(data.pagination)
      }
    } catch (err) {
      console.error("Error loading members:", err)
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    if (viewMode === "members") {
      loadMembers(page)
    }
  }, [viewMode, page, loadMembers])

  const handleToggle = (mode) => {
    setViewMode(mode)
    if (mode === "members") {
      setPage(1)
    }
    setExpandedSeq(null)
  }

  const rows = viewMode === "centroid" && centroid
    ? [{
        enzyme_id: centroid.centroid_enzyme_id,
        genbank_accession_id: centroid.centroid_accession,
        translated_sequence: centroid.centroid_sequence,
        family_pid: null,
        component: centroid.centroid_component,
      }]
    : members

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => handleToggle("centroid")}
          style={{
            padding: "0.4rem 1rem",
            fontSize: "0.85rem",
            borderRadius: "4px",
            border: "1px solid",
            borderColor: viewMode === "centroid" ? "#3b82f6" : "#cbd5e1",
            backgroundColor: viewMode === "centroid" ? "#3b82f6" : "white",
            color: viewMode === "centroid" ? "white" : "#64748b",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Centroid
        </button>
        <button
          onClick={() => handleToggle("members")}
          style={{
            padding: "0.4rem 1rem",
            fontSize: "0.85rem",
            borderRadius: "4px",
            border: "1px solid",
            borderColor: viewMode === "members" ? "#3b82f6" : "#cbd5e1",
            backgroundColor: viewMode === "members" ? "#3b82f6" : "white",
            color: viewMode === "members" ? "white" : "#64748b",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          All Members
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
          Loading members…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
          No members found
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={thStyle}>Accession</th>
                  <th style={thStyle}>Identity</th>
                  <th style={thStyle}>Component</th>
                  <th style={thStyle}>Sequence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isCentroid = row.family_pid === null || row.family_pid === 100
                  const isExpanded = expandedSeq === row.enzyme_id
                  return (
                    <React.Fragment key={row.enzyme_id}>
                      <tr
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: isCentroid ? "#fffbeb" : "white",
                        }}
                      >
                        <td style={tdStyle}>
                          <Link
                            to={`/enzyme/${row.enzyme_id}`}
                            style={{ fontFamily: "monospace", color: "#2c3e50", textDecoration: "none" }}
                          >
                            {row.genbank_accession_id || `Enzyme ${row.enzyme_id}`}
                          </Link>
                          {isCentroid && (
                            <span style={{
                              marginLeft: "0.5rem",
                              padding: "0.1rem 0.35rem",
                              backgroundColor: "#f59e0b",
                              color: "white",
                              borderRadius: "3px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                            }}>
                              CENTROID
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {isCentroid ? "—" : row.family_pid != null ? `${row.family_pid}%` : "—"}
                        </td>
                        <td style={tdStyle}>
                          {row.component != null ? (
                            <span style={{
                              padding: "0.15rem 0.4rem",
                              backgroundColor: COMPONENT_SHADE_CSS[row.component] || "#e0e7ff",
                              color: "white",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}>
                              {row.component}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {row.translated_sequence ? (
                            <button
                              onClick={() => setExpandedSeq(isExpanded ? null : row.enzyme_id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#3b82f6",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                padding: 0,
                              }}
                            >
                              {isExpanded ? "Hide" : `${row.translated_sequence.length} aa`}
                            </button>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && row.translated_sequence && (
                        <tr>
                          <td colSpan={4} style={{ padding: "0.75rem 1rem", backgroundColor: "#f8fafc" }}>
                            <SequenceViewer
                              aminoAcidSequence={row.translated_sequence}
                              nucleotideSequence={null}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {viewMode === "members" && pagination && pagination.totalPages > 1 && (
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              marginTop: "1rem",
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={pageBtnStyle(page <= 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Page {page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasMore}
                style={pageBtnStyle(!pagination.hasMore)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: "left",
  padding: "0.6rem 0.75rem",
  color: "#64748b",
  fontWeight: 600,
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

const tdStyle = {
  padding: "0.5rem 0.75rem",
  verticalAlign: "middle",
}

function pageBtnStyle(disabled) {
  return {
    padding: "0.4rem 0.75rem",
    fontSize: "0.85rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    backgroundColor: disabled ? "#f1f5f9" : "white",
    color: disabled ? "#94a3b8" : "#3b82f6",
    cursor: disabled ? "default" : "pointer",
    fontWeight: 500,
  }
}

// ── Family Metadata ────────────────────────────────────────────────────────

function FamilyMetadata({ familyId }) {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    if (!familyId) return
    fetch(`${config.apiUrl}/family/${familyId}/metadata`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMeta(d))
      .catch(() => {})
  }, [familyId])

  if (!meta) return (
    <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>No atlas metadata available</div>
  )

  const row = (label, value) => value ? (
    <div key={label} style={{
      display: "grid", gridTemplateColumns: "200px 1fr", gap: "1rem",
      padding: "0.75rem 1rem", backgroundColor: "#f9fafb",
      borderRadius: "6px", borderLeft: "3px solid #e5e7eb"
    }}>
      <div style={{ fontWeight: 600, color: "#374151" }}>{label}</div>
      <div style={{ color: "#6b7280", wordBreak: "break-word" }}>{value}</div>
    </div>
  ) : null

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {row("Accession", meta.genbank_accession_id)}
      {row("Definition", meta.definition)}
      {row("Organism", meta.organism)}
      {row("Taxonomy", meta.taxonomy)}
      {row("Country", meta.country)}
      {row("Collection Date", meta.collection_date)}
      {row("Journal", meta.journal)}
      {row("Family Size", meta.family_size?.toLocaleString())}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "1.5rem",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      marginBottom: "1.5rem",
    }}>
      <h2 style={{
        fontSize: "1.25rem",
        marginBottom: "1rem",
        color: "#2c3e50",
        marginTop: 0,
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FamilyTemplate({ pageContext }) {
  useScrollHeader()
  const familyId = pageContext?.familyId || (typeof window !== "undefined" ? window.location.pathname.match(/\/family\/(\d+)/)?.[1] : null)

  const [family, setFamily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Tree state
  const [treeNwk, setTreeNwk] = useState(null)
  const [treeLoading, setTreeLoading] = useState(true)
  const [treeError, setTreeError] = useState(null)

  // Fetch family summary
  useEffect(() => {
    if (!familyId) return
    setLoading(true)
    fetch(`${config.apiUrl}/family/${familyId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Family ${familyId} not found`)
        return r.json()
      })
      .then(data => { setFamily(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [familyId])

  // Fetch tree independently
  useEffect(() => {
    if (!familyId) return
    setTreeLoading(true)
    fetch(`${config.apiUrl}/family/${familyId}/tree`)
      .then(r => {
        if (!r.ok) throw new Error("No tree available")
        return r.text()
      })
      .then(text => { setTreeNwk(text.trim()); setTreeLoading(false) })
      .catch(err => { setTreeError(err.message); setTreeLoading(false) })
  }, [familyId])

  let treeRoot = null
  let parseError = null
  if (treeNwk) {
    try {
      treeRoot = parseNewick(treeNwk)
    } catch {
      parseError = "Failed to parse Newick format."
    }
  }

  if (!familyId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        Invalid family URL
      </div>
    )
  }

  return (
    <>
      <SiteHeader currentPage="enzymes" />

      <main style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "2rem",
      }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link
            to="/enzymes"
            style={{ color: "#3b82f6", textDecoration: "none", fontSize: "0.9rem" }}
          >
            &larr; Back to Enzymes
          </Link>
        </div>

        {/* ── 1. Header ── */}
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
            Loading family…
          </div>
        ) : error ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#dc2626" }}>
            {error}
          </div>
        ) : family && (
          <>
            <div style={{ marginBottom: "2rem" }}>
              <h1 style={{
                fontSize: "2.5rem",
                marginBottom: "0.5rem",
                color: "#2c3e50",
              }}>
                Family {family.family_id}
              </h1>

              <div style={{
                display: "flex",
                gap: "2rem",
                flexWrap: "wrap",
                alignItems: "flex-start",
                marginTop: "1rem",
              }}>
                {/* Stats */}
                <div style={{
                  display: "flex",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                  flex: 1,
                  minWidth: "300px",
                }}>
                  <div style={statBox}>
                    <div style={statLabel}>Centroid</div>
                    <div style={{ fontFamily: "monospace", fontSize: "1rem", color: "#2c3e50" }}>
                      <Link
                        to={`/enzyme/${family.centroid_enzyme_id}`}
                        style={{ color: "#2c3e50", textDecoration: "none", borderBottom: "2px solid #3b82f6" }}
                      >
                        {family.centroid_accession}
                      </Link>
                    </div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>Variants</div>
                    <div style={statValue}>{parseInt(family.variant_count).toLocaleString()}</div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>Components</div>
                    <div style={statValue}>{family.component_count}</div>
                  </div>
                  {family.avg_identity && (
                    <div style={statBox}>
                      <div style={statLabel}>Avg Identity</div>
                      <div style={statValue}>{family.avg_identity}%</div>
                    </div>
                  )}
                </div>

                {/* CATH badges */}
                {family.components && family.components.length > 0 && (
                  <div style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    minWidth: "180px",
                  }}>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.5rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      CATH Domain
                    </div>
                    <CathBadge components={family.components} />
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. Sequence table ── */}
            <Section title="Sequences">
              <MembersTable familyId={familyId} centroid={family} />
            </Section>

            {/* ── 3. Centroid Metadata ── */}
            <Section title="Centroid Metadata">
              <FamilyMetadata familyId={familyId} />
            </Section>

            {/* ── 4. ESM Atlas ── */}
            <Section title="ESM Atlas">
              <AtlasMap familyId={familyId} />
            </Section>

            {/* ── 5. Phylogenetic tree ── */}
            <Section title="Phylogenetic Tree">
              {treeLoading && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                  Loading tree…
                </div>
              )}
              {treeError && !treeLoading && (
                <div style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  color: "#64748b",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                }}>
                  No phylogenetic tree available for this family
                </div>
              )}
              {parseError && (
                <div style={{
                  color: "#721c24",
                  background: "#f8d7da",
                  border: "1px solid #f5c6cb",
                  borderRadius: 4,
                  padding: "0.75rem 1rem",
                }}>
                  {parseError}
                </div>
              )}
              {treeRoot && !parseError && (
                <>
                  <DendrogramSVG root={treeRoot} />
                  <div style={{ marginTop: "0.75rem" }}>
                    <a
                      href={`${config.apiUrl}/family/${familyId}/tree`}
                      download={`family_${familyId}.nwk`}
                      style={{ fontSize: "0.85rem", color: "#3b82f6", textDecoration: "none" }}
                    >
                      Download .nwk file
                    </a>
                  </div>
                </>
              )}
            </Section>
          </>
        )}

        <footer style={{
          marginTop: "3rem",
          textAlign: "center",
          color: "#666",
          fontSize: "0.9rem",
        }}>
          &copy; {new Date().getFullYear()} PETadex.io
        </footer>
      </main>
    </>
  )
}

const statBox = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
}

const statLabel = {
  fontSize: "0.8rem",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  fontWeight: 600,
}

const statValue = {
  fontSize: "1.5rem",
  fontWeight: 600,
  color: "#2c3e50",
}

export const Head = ({ pageContext, params }) => {
  const familyId = pageContext?.familyId || params?.familyId || ""
  return (
    <Seo
      title={`Family ${familyId}`}
      description={`View details for plastic-degrading enzyme family ${familyId} including sequences, UMAP embedding, and phylogenetic tree.`}
    />
  )
}

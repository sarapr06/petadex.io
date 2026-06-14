import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react"
import { Link, navigate } from "gatsby"
import { hierarchy } from "d3-hierarchy"
import Seo from "../components/seo"
import SequenceViewer from "../components/sequence/SequenceViewer"
import LazyPetadexCatalyticDomainsPanel from "../components/petadexDomains/LazyPetadexCatalyticDomainsPanel.jsx"
import AtlasMap from "../components/charts/AtlasMap"
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

  const cathMap = {}
  for (const comp of components) {
    const cath = COMPONENT_TO_CATH[comp] || "Unknown"
    if (!cathMap[cath]) cathMap[cath] = []
    cathMap[cath].push(comp)
  }

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(cathMap).map(([cath, comps]) => (
        <div key={cath}>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: CATH_BASE_CSS[cath] || "#475569" }}
            />
            <span className="text-sm font-semibold text-foreground font-mono">
              {cath}
            </span>
          </div>
          <div className="pl-5 mt-1">
            {comps
              .sort((a, b) => a - b)
              .map(comp => (
                <div key={comp} className="flex items-center gap-2 mb-0.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: COMPONENT_SHADE_CSS[comp] || "#94a3b8",
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
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

// ── Newick parser ──────────────────────────────────────────────────────────

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

// ── Radial phylogram layout ──────────────────────────────────────────────────

function buildRadialTree(root, radius) {
  root.each(node => {
    const bl = node.data.branchLength != null ? node.data.branchLength : 0
    node.distFromRoot = (node.parent ? node.parent.distFromRoot : 0) + bl
  })
  const maxDist = root
    .descendants()
    .reduce((m, n) => Math.max(m, n.distFromRoot), 1e-10)
  root.each(node => {
    node.radius = (node.distFromRoot / maxDist) * radius
  })

  const leaves = []
  root.eachBefore(node => {
    if (!node.children || node.children.length === 0) leaves.push(node)
  })
  const n = leaves.length
  const gap = (12 * Math.PI) / 180 // gap at the top so first/last leaf don't collide
  const span = 2 * Math.PI - gap
  leaves.forEach((leaf, i) => {
    leaf.angle =
      n <= 1 ? -Math.PI / 2 : -Math.PI / 2 + gap / 2 + (i / (n - 1)) * span
  })
  root.eachAfter(node => {
    if (node.children && node.children.length > 0) {
      const a = node.children.map(c => c.angle)
      node.angle = (Math.min(...a) + Math.max(...a)) / 2
    }
  })
  return root
}

// ── Tree SVG ───────────────────────────────────────────────────────────────

const LEAF_ARC = 10 // px of circumference allotted per leaf
const LABEL_SPACE = 150 // room beyond the outer ring for labels
const MIN_RADIUS = 160
const MAX_LABEL = 32

function DendrogramSVG({ root }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const transformRef = useRef(transform)
  transformRef.current = transform

  const containerRef = useRef(null)
  const fittedRef = useRef(false)

  const { numLeaves, center, svgSize, nodes, links } = useMemo(() => {
    const leafCount = countLeaves(root)
    const radius = Math.max((leafCount * LEAF_ARC) / (2 * Math.PI), MIN_RADIUS)
    const c = radius + LABEL_SPACE
    const layoutRoot = buildRadialTree(hierarchy(root, d => d.children), radius)
    return {
      numLeaves: leafCount,
      center: c,
      svgSize: 2 * c,
      nodes: layoutRoot.descendants(),
      links: layoutRoot.links(),
    }
  }, [root])

  // Show labels when zoomed in enough that circumferential spacing exceeds one text line height
  const showLabels = numLeaves < 40 || transform.k * LEAF_ARC > 14
  const [hoveredNode, setHoveredNode] = useState(null)

  const px = d => center + d.radius * Math.cos(d.angle)
  const py = d => center + d.radius * Math.sin(d.angle)
  const linkPath = ({ source: p, target: c }) => {
    const r = p.radius
    const x0 = center + r * Math.cos(p.angle)
    const y0 = center + r * Math.sin(p.angle)
    const x1 = center + r * Math.cos(c.angle)
    const y1 = center + r * Math.sin(c.angle)
    const x2 = center + c.radius * Math.cos(c.angle)
    const y2 = center + c.radius * Math.sin(c.angle)
    const largeArc = Math.abs(c.angle - p.angle) > Math.PI ? 1 : 0
    const sweep = c.angle > p.angle ? 1 : 0
    return `M${x0},${y0}A${r},${r} 0 ${largeArc} ${sweep} ${x1},${y1}L${x2},${y2}`
  }

  // Zoom toward a point (cx, cy) given in container coordinates, keeping the
  // content under that point fixed.
  const zoomBy = useCallback((factor, cx, cy) => {
    setTransform(t => {
      const k = Math.min(Math.max(t.k * factor, 0.2), 8)
      const ratio = k / t.k
      return {
        k,
        x: cx - (cx - t.x) * ratio,
        y: cy - (cy - t.y) * ratio,
      }
    })
  }, [])

  const zoomFromCenter = useCallback(
    factor => {
      const el = containerRef.current
      if (!el) return
      zoomBy(factor, el.clientWidth / 2, el.clientHeight / 2)
    },
    [zoomBy],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const onWheel = e => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoomBy])

  const onMouseDown = useCallback(e => {
    const startX = e.clientX - transformRef.current.x
    const startY = e.clientY - transformRef.current.y

    const onMove = ev => {
      setTransform(t => ({
        ...t,
        x: ev.clientX - startX,
        y: ev.clientY - startY,
      }))
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [])

  const fitToContainer = useCallback(() => {
    const el = containerRef.current
    if (!el) return null
    const W = el.clientWidth
    const H = el.clientHeight
    if (!W || !H) return null
    const k = Math.min(W / svgSize, H / svgSize)
    return { k, x: (W - svgSize * k) / 2, y: (H - svgSize * k) / 2 }
  }, [svgSize])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => {
      if (fittedRef.current) return
      const fit = fitToContainer()
      if (fit) {
        setTransform(fit)
        fittedRef.current = true
        ro.disconnect()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fitToContainer])

  const resetView = () => setTransform(fitToContainer() || { x: 0, y: 0, k: 1 })

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1.5">
        {[
          {
            label: "+",
            action: () => zoomFromCenter(1.3),
          },
          {
            label: "−",
            action: () => zoomFromCenter(0.77),
          },
          { label: "Reset", action: resetView },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="btn btn-secondary px-2 py-0.5 text-sm rounded"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden bg-surface-raised border border-border rounded-md cursor-grab"
        style={{ height: "60vh", minHeight: 300 }}
        onMouseDown={onMouseDown}
      >
        <svg
          width={svgSize}
          height={svgSize}
          style={{
            display: "block",
            transformOrigin: "0 0",
            transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.k})`,
          }}
        >
          <g stroke="var(--border-strong)" fill="none" strokeWidth={0.8}>
            {links.map((link, i) => (
              <path key={i} d={linkPath(link)} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {nodes.map((node, i) => {
            const isLeaf = !node.children
            const label = node.data.name || ""
            const displayLabel =
              label.length > MAX_LABEL ? label.slice(0, MAX_LABEL) + "…" : label
            const x = px(node)
            const y = py(node)
            if (!isLeaf) {
              return (
                <g key={i} transform={`translate(${x},${y})`}>
                  <circle r={2 / transform.k} fill="var(--muted-foreground)" />
                </g>
              )
            }
            const onLeft = Math.cos(node.angle) < 0
            const deg = (node.angle * 180) / Math.PI
            const rot = onLeft ? deg + 180 : deg
            const enzymeId = /^\d+$/.test(label) ? label : null
            const isHovered = hoveredNode === label
            const dotR = (isHovered ? 4 : 2.5) / transform.k
            return (
              <g
                key={i}
                transform={`translate(${x},${y}) rotate(${rot})`}
                onClick={enzymeId ? () => window.open(`/enzyme/${enzymeId}`, "_blank") : undefined}
                onMouseEnter={() => setHoveredNode(label)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: enzymeId ? "pointer" : "default" }}
              >
                {/* Invisible hit target */}
                <circle r={8 / transform.k} fill="transparent" />
                <circle r={dotR} fill={isHovered ? "var(--accent-hover, var(--accent))" : "var(--accent)"} />
                {(showLabels || isHovered) && displayLabel && (
                  <text
                    x={(onLeft ? -6 : 6) / transform.k}
                    dy="0.32em"
                    textAnchor={onLeft ? "end" : "start"}
                    fontSize={11 / transform.k}
                    fontFamily="monospace"
                    fill={isHovered ? "var(--accent)" : "var(--foreground)"}
                    fontWeight={isHovered ? "bold" : "normal"}
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

      <p className="mt-1.5 text-xs text-muted-foreground">
        {numLeaves} leaves · scroll to zoom · drag to pan · click leaf to open enzyme
      </p>
    </div>
  )
}

// ── Members Table ──────────────────────────────────────────────────────────

function MembersTable({ familyId, centroid }) {
  const [viewMode, setViewMode] = useState("centroid")
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [expandedSeq, setExpandedSeq] = useState(null)

  const loadMembers = useCallback(
    async p => {
      setLoading(true)
      try {
        const res = await fetch(
          `${config.apiUrl}/family/${familyId}/members?page=${p}&limit=50`,
        )
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
    },
    [familyId],
  )

  useEffect(() => {
    if (viewMode === "members") loadMembers(page)
  }, [viewMode, page, loadMembers])

  const handleToggle = mode => {
    setViewMode(mode)
    if (mode === "members") setPage(1)
    setExpandedSeq(null)
  }

  const rows =
    viewMode === "centroid" && centroid
      ? [
          {
            enzyme_id: centroid.centroid_enzyme_id,
            genbank_accession_id: centroid.centroid_accession,
            translated_sequence: centroid.centroid_sequence,
            family_pid: null,
            component: centroid.centroid_component,
          },
        ]
      : members

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-2 mb-4">
        {["centroid", "members"].map(mode => (
          <button
            key={mode}
            onClick={() => handleToggle(mode)}
            className={`btn text-sm px-4 py-1.5 rounded ${
              viewMode === mode
                ? "bg-accent text-accent-foreground border-accent"
                : "btn-secondary"
            }`}
          >
            {mode === "centroid" ? "Centroid" : "All Members"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          Loading members…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No members found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border-strong">
                  {["ID", "Accession", "Identity", "Component", "Sequence"].map(h => (
                    <th key={h} className="text-left px-3 py-2 label">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const isCentroid =
                    row.family_pid === null || row.family_pid === 100
                  const isExpanded = expandedSeq === row.enzyme_id
                  return (
                    <React.Fragment key={row.enzyme_id}>
                      <tr
                        className={`border-b border-border ${
                          isCentroid ? "bg-warning/10" : "bg-card"
                        }`}
                      >
                        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                          {row.enzyme_id}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={`/enzyme/${row.enzyme_id}`}
                            className="font-mono text-foreground hover:text-accent"
                          >
                            {row.genbank_accession_id ||
                              `Enzyme ${row.enzyme_id}`}
                          </Link>
                          {isCentroid && (
                            <span className="ml-2 badge bg-warning text-warning-foreground border-warning/30 text-2xs font-bold uppercase">
                              Centroid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {isCentroid
                            ? "—"
                            : row.family_pid != null
                              ? `${row.family_pid}%`
                              : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {row.component != null ? (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                              style={{
                                backgroundColor:
                                  COMPONENT_SHADE_CSS[row.component] ||
                                  "#e0e7ff",
                              }}
                            >
                              {row.component}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.translated_sequence ? (
                            <button
                              onClick={() =>
                                setExpandedSeq(
                                  isExpanded ? null : row.enzyme_id,
                                )
                              }
                              className="text-accent text-xs hover:text-accent-hover bg-transparent border-none cursor-pointer p-0"
                            >
                              {isExpanded
                                ? "Hide"
                                : `${row.translated_sequence.length} aa`}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && row.translated_sequence && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-3 bg-surface-sunken space-y-4"
                          >
                            <LazyPetadexCatalyticDomainsPanel
                              enzymeId={row.enzyme_id}
                              accession={row.genbank_accession_id}
                              sequence={row.translated_sequence}
                              compact
                            />
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
          {viewMode === "members" &&
            pagination &&
            pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`btn text-sm px-3 py-1.5 rounded ${
                    page <= 1
                      ? "btn-secondary opacity-50 cursor-default"
                      : "btn-secondary"
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {pagination.totalPages} ({pagination.total}{" "}
                  total)
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination.hasMore}
                  className={`btn text-sm px-3 py-1.5 rounded ${
                    !pagination.hasMore
                      ? "btn-secondary opacity-50 cursor-default"
                      : "btn-secondary"
                  }`}
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

// ── Family Metadata ────────────────────────────────────────────────────────

function FamilyMetadata({ familyId }) {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    if (!familyId) return
    fetch(`${config.apiUrl}/family/${familyId}/metadata`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setMeta(d))
      .catch(() => {})
  }, [familyId])

  if (!meta)
    return (
      <div className="text-muted-foreground text-sm">
        No atlas metadata available
      </div>
    )

  const row = (label, value) =>
    value ? (
      <div
        key={label}
        className="grid gap-4 px-4 py-3 bg-surface-raised rounded-md border-l-4 border-border-strong"
        style={{ gridTemplateColumns: "200px 1fr" }}
      >
        <div className="font-semibold text-foreground">{label}</div>
        <div className="text-muted-foreground break-words">{value}</div>
      </div>
    ) : null

  return (
    <div className="grid gap-3">
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
    <div className="card p-6 mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-4 mt-0">
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FamilyTemplate({ pageContext }) {
  useScrollHeader()
  const familyId =
    pageContext?.familyId ||
    (typeof window !== "undefined"
      ? window.location.pathname.match(/\/family\/(\d+)/)?.[1]
      : null)

  const [family, setFamily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [treeNwk, setTreeNwk] = useState(null)
  const [treeLoading, setTreeLoading] = useState(true)
  const [treeError, setTreeError] = useState(null)

  useEffect(() => {
    if (!familyId) return
    setLoading(true)
    fetch(`${config.apiUrl}/family/${familyId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Family ${familyId} not found`)
        return r.json()
      })
      .then(data => {
        setFamily(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [familyId])

  useEffect(() => {
    if (!familyId) return
    setTreeLoading(true)
    fetch(`${config.apiUrl}/family/${familyId}/tree`)
      .then(r => {
        if (!r.ok) throw new Error("No tree available")
        return r.text()
      })
      .then(text => {
        setTreeNwk(text.trim())
        setTreeLoading(false)
      })
      .catch(err => {
        setTreeError(err.message)
        setTreeLoading(false)
      })
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
      <div className="py-8 text-center text-muted-foreground">
        Invalid family URL
      </div>
    )
  }

  return (
    <>
      <section className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-4">
          <Link
            to="/enzymes"
            className="text-accent text-sm hover:text-accent-hover"
          >
            &larr; Back to Enzymes
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading family…
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : (
          family && (
            <>
              {/* ── Header ── */}
              <div className="mb-8">
                <h1 className="text-5xl font-semibold text-foreground mb-2">
                  Family {family.family_id}
                </h1>

                <div className="flex gap-8 flex-wrap items-start mt-4">
                  {/* Stats */}
                  <div className="flex gap-6 flex-wrap flex-1 min-w-[300px]">
                    {/* Centroid */}
                    <div className="flex flex-col gap-1">
                      <div className="label">Centroid</div>
                      <div className="font-mono text-base text-foreground">
                        <Link
                          to={`/enzyme/${family.centroid_enzyme_id}`}
                          className="text-foreground border-b-2 border-accent hover:text-accent"
                        >
                          {family.centroid_accession}
                        </Link>
                      </div>
                    </div>

                    {[
                      {
                        label: "Variants",
                        value: parseInt(family.variant_count).toLocaleString(),
                      },
                      { label: "Components", value: family.component_count },
                      ...(family.avg_identity
                        ? [
                            {
                              label: "Avg Identity",
                              value: `${family.avg_identity}%`,
                            },
                          ]
                        : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <div className="label">{label}</div>
                        <div className="text-2xl font-semibold text-foreground">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CATH badges */}
                  {family.components && family.components.length > 0 && (
                    <div className="px-4 py-3 bg-surface-raised rounded-lg border border-border min-w-[180px]">
                      <div className="label mb-2">CATH Domain</div>
                      <CathBadge components={family.components} />
                    </div>
                  )}
                </div>
              </div>

              <Section title="Sequences">
                <MembersTable familyId={familyId} centroid={family} />
              </Section>

              <Section title="Centroid Metadata">
                <FamilyMetadata familyId={familyId} />
              </Section>

              <Section title="ESM Atlas">
                <AtlasMap familyId={familyId} />
              </Section>

              <Section title="Phylogenetic Tree">
                {treeLoading && (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading tree…
                  </div>
                )}
                {treeError && !treeLoading && (
                  <div className="py-6 text-center text-muted-foreground bg-surface-raised rounded-md">
                    No phylogenetic tree available for this family
                  </div>
                )}
                {parseError && (
                  <div className="px-4 py-3 bg-destructive/10 text-destructive border border-destructive/30 rounded">
                    {parseError}
                  </div>
                )}
                {treeRoot && !parseError && (
                  <>
                    <DendrogramSVG root={treeRoot} />
                    <div className="mt-3">
                      <a
                        href={`${config.apiUrl}/family/${familyId}/tree`}
                        download={`family_${familyId}.nwk`}
                        className="text-sm text-accent hover:text-accent-hover"
                      >
                        Download .nwk file
                      </a>
                    </div>
                  </>
                )}
              </Section>
            </>
          )
        )}
      </section>
    </>
  )
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

/**
 * Temporary route for phylogenetic tree library comparison (remove when done).
 * URL: /trees-prototype/
 */
import React, { useCallback, useMemo, useState } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import ReactD3TreePanel from "../components/treePrototype/ReactD3TreePanel.jsx"
import ServerSvgTreePanel from "../components/treePrototype/ServerSvgTreePanel.jsx"
import ITOLTreePanel from "../components/treePrototype/ITOLTreePanel.jsx"
import TreePrototypeNotes from "../components/treePrototype/TreePrototypeNotes.jsx"
import { MOCK_TREES, mockTreeById } from "../components/treePrototype/mockNewick.js"
import { countTips, parseNewick } from "../components/treePrototype/newickUtils.js"
import {
  useFamilySummary,
  useFamilyTree,
} from "../components/treePrototype/useFamilyTree.js"
import { useFamilyTreeRender } from "../components/treePrototype/useFamilyTreeRender.js"
import { useItolTreeUpload } from "../components/treePrototype/useItolTreeUpload.js"

/** @typedef {"live" | "mock"} TreeDataSource */
/** @typedef {"react-d3-tree" | "ete" | "biopython" | "itol"} TreeViewerEngine */

const VIEWER_TABS = [
  { id: "react-d3-tree", label: "React D3 Tree" },
  { id: "ete", label: "ETE3" },
  { id: "biopython", label: "Biopython" },
  { id: "itol", label: "iTOL" },
]

const TreesPrototypePage = () => {
  /** @type {[TreeDataSource, React.Dispatch<React.SetStateAction<TreeDataSource>>]} */
  const [dataSource, setDataSource] = useState("mock")
  const [familyId, setFamilyId] = useState(1)
  const [mockId, setMockId] = useState(MOCK_TREES[0].id)
  /** @type {[TreeViewerEngine, React.Dispatch<React.SetStateAction<TreeViewerEngine>>]} */
  const [viewer, setViewer] = useState("react-d3-tree")
  /** @type {["rectangular" | "radial", React.Dispatch<React.SetStateAction<"rectangular" | "radial">>>} */
  const [eteLayout, setEteLayout] = useState("rectangular")
  const [tipCount, setTipCount] = useState(null)
  const [engineMetrics, setEngineMetrics] = useState(
    /** @type {Record<string, { tipCount?: number, renderMs?: number, error?: string }>} */ ({}),
  )

  const isLive = dataSource === "live"
  const liveTree = useFamilyTree(familyId, isLive)
  const familyMeta = useFamilySummary(familyId, isLive)

  const mockSpec = useMemo(() => mockTreeById(mockId), [mockId])
  const activeNewick = isLive ? liveTree.newick : mockSpec.newick

  const eteRender = useFamilyTreeRender(familyId, "ete", viewer === "ete" && Boolean(activeNewick?.trim()), {
    newick: activeNewick,
    eteLayout,
  })
  const bioRender = useFamilyTreeRender(
    familyId,
    "biopython",
    viewer === "biopython" && Boolean(activeNewick?.trim()),
    { newick: activeNewick },
  )

  const itolTreeName = isLive
    ? `petadex_family_${familyId}`
    : `petadex_mock_${mockId}`

  const itolUpload = useItolTreeUpload(
    viewer === "itol" && Boolean(activeNewick?.trim()),
    activeNewick,
    {
      treeName: itolTreeName,
      familyId: isLive ? familyId : undefined,
    },
  )

  const parsedTipCount = useMemo(() => {
    if (!activeNewick?.trim()) return null
    try {
      return countTips(parseNewick(activeNewick.trim()))
    } catch {
      return null
    }
  }, [activeNewick])

  const handleTreeReady = useCallback(
    info => {
      setTipCount(info.tipCount)
      setEngineMetrics(prev => ({
        ...prev,
        "react-d3-tree": { ...prev["react-d3-tree"], tipCount: info.tipCount },
      }))
    },
    [],
  )

  const viewerKey = isLive
    ? `live-${familyId}-${viewer}-${viewer === "ete" ? eteLayout : ""}-${activeNewick.length}`
    : `mock-${mockId}-${viewer}-${viewer === "ete" ? eteLayout : ""}`

  return (
    <div className="py-10 md:py-14">
      <Container size="wide">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground mb-8">
          <strong className="font-semibold">Temporary prototype.</strong> Comparing four
          phylogenetic tree renderers side-by-side. Bookmark{" "}
          <code className="text-xs bg-muted px-1 rounded">/trees-prototype/</code> to return.
        </div>

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Trees (library comparison)
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Same Newick data, four engines:{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://bkrem.github.io/react-d3-tree/"
              target="_blank"
              rel="noreferrer noopener"
            >
              react-d3-tree
            </a>{" "}
            (browser),{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://etetoolkit.org/treeview/"
              target="_blank"
              rel="noreferrer noopener"
            >
              ETE3
            </a>{" "}
            (Python SVG),{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://biopython.org/wiki/Phylo"
              target="_blank"
              rel="noreferrer noopener"
            >
              Biopython Phylo
            </a>{" "}
            (Python SVG),{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://itol.embl.de/itol.cgi"
              target="_blank"
              rel="noreferrer noopener"
            >
              iTOL
            </a>{" "}
            (interactive, hosted).
          </p>
        </header>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-4 mb-6 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-foreground mb-2">
              Data source
            </legend>
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tree-data-source"
                  className="mt-0.5"
                  checked={dataSource === "mock"}
                  onChange={() => setDataSource("mock")}
                />
                <span>
                  <strong className="text-foreground">Mock demo tree</strong> — bundled
                  Newick; ETE/Biopython via local API, iTOL via batch upload.
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tree-data-source"
                  className="mt-0.5"
                  checked={dataSource === "live"}
                  onChange={() => setDataSource("live")}
                />
                <span>
                  <strong className="text-foreground">Live (S3 via API)</strong> — needs
                  backend + AWS credentials; fetches{" "}
                  <code className="text-xs bg-muted px-1 rounded">
                    search-phylo-trees/family_N.nwk
                  </code>
                </span>
              </label>
            </div>
          </fieldset>

          {isLive ? (
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 border-t border-border pt-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">Family ID</span>
                <input
                  type="number"
                  min={1}
                  className="input w-32 font-mono text-sm"
                  value={familyId}
                  onChange={e => setFamilyId(Number(e.target.value) || 1)}
                />
              </label>
              {liveTree.loading || familyMeta.loading ? (
                <span className="text-xs text-amber-600 dark:text-amber-400 pb-2">
                  Loading tree…
                </span>
              ) : null}
            </div>
          ) : (
            <div className="border-t border-border pt-4">
              <label className="flex flex-col gap-1 max-w-md">
                <span className="text-sm font-medium text-foreground">Mock tree</span>
                <select
                  className="input font-mono text-sm"
                  value={mockId}
                  onChange={e => setMockId(e.target.value)}
                >
                  {MOCK_TREES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <span className="text-sm font-medium text-foreground block mb-2">Viewer</span>
            <div className="flex flex-wrap gap-2">
              {VIEWER_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewer(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewer === tab.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {viewer === "ete" ? (
            <div className="border-t border-border pt-4">
              <span className="text-sm font-medium text-foreground block mb-2">
                ETE3 layout
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEteLayout("rectangular")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    eteLayout === "rectangular"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Rectangular
                </button>
                <button
                  type="button"
                  onClick={() => setEteLayout("radial")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    eteLayout === "radial"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Radial
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          {isLive && liveTree.loading && !activeNewick?.trim() ? (
            <div className="min-h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
              Fetching Newick from API…
            </div>
          ) : isLive && liveTree.error && !activeNewick?.trim() ? (
            <div className="min-h-[280px] rounded-lg border border-destructive/40 bg-destructive/10 flex items-center justify-center text-sm text-destructive px-4 text-center">
              {liveTree.error}
            </div>
          ) : viewer === "react-d3-tree" ? (
            <ReactD3TreePanel
              key={viewerKey}
              newick={activeNewick}
              onTreeReady={handleTreeReady}
            />
          ) : viewer === "ete" ? (
            <ServerSvgTreePanel
              key={viewerKey}
              engineLabel={`ETE3 (${eteLayout})`}
              loading={eteRender.loading}
              error={eteRender.error}
              svg={eteRender.svg}
              renderMs={eteRender.renderMs}
            />
          ) : viewer === "biopython" ? (
            <ServerSvgTreePanel
              key={viewerKey}
              engineLabel="Biopython Phylo"
              loading={bioRender.loading}
              error={bioRender.error}
              svg={bioRender.svg}
              renderMs={bioRender.renderMs}
            />
          ) : (
            <ITOLTreePanel
              key={viewerKey}
              loading={itolUpload.loading}
              error={itolUpload.error}
              viewerUrl={itolUpload.viewerUrl}
              treeId={itolUpload.treeId}
              uploadMs={itolUpload.uploadMs}
            />
          )}
        </div>

        <div className="mt-8">
          <TreePrototypeNotes
            source={dataSource}
            mockLabel={mockSpec.label}
            familyId={isLive ? familyId : undefined}
            tipCount={tipCount ?? parsedTipCount}
            newick={activeNewick}
            loadError={isLive ? liveTree.error : null}
            familySummary={familyMeta.summary}
            activeViewer={viewer}
            engineMetrics={engineMetrics}
            serverRenderMs={
              viewer === "ete"
                ? eteRender.renderMs
                : viewer === "biopython"
                  ? bioRender.renderMs
                  : viewer === "itol"
                    ? itolUpload.uploadMs
                    : null
            }
            serverRenderError={
              isLive && liveTree.error
                ? null
                : viewer === "ete"
                  ? eteRender.error
                  : viewer === "biopython"
                    ? bioRender.error
                    : viewer === "itol"
                      ? itolUpload.error
                      : null
            }
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground max-w-3xl">
          ETE3/Biopython require a Python venv on the API host:{" "}
          <code className="font-mono">
            cd backend && python3 -m venv .venv-trees && .venv-trees/bin/pip install -r
            scripts/requirements-trees.txt
          </code>{" "}
          iTOL requires <code className="font-mono">ITOL_UPLOAD_ID</code> in{" "}
          <code className="font-mono">backend/.env</code>. Trees live in S3 at{" "}
          <code className="font-mono">search-phylo-trees/family_N.nwk</code>.
        </p>
      </Container>
    </div>
  )
}

export default TreesPrototypePage

export const Head = () => (
  <Seo
    title="Trees prototype"
    description="Compare react-d3-tree, ETE3, Biopython, and iTOL for Petadex family phylogenies."
  />
)

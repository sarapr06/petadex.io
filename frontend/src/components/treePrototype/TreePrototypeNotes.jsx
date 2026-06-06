import React from "react"
import config from "../../config"

/**
 * @param {{
 *   source: "mock" | "live",
 *   mockLabel?: string,
 *   familyId?: number,
 *   tipCount?: number | null,
 *   newick?: string,
 *   loadError?: string | null,
 *   familySummary?: object | null,
 *   activeViewer?: "react-d3-tree" | "ete" | "biopython" | "itol",
 *   engineMetrics?: Record<string, { tipCount?: number, renderMs?: number }>,
 *   serverRenderMs?: number | null,
 *   serverRenderError?: string | null,
 * }} props
 */
export default function TreePrototypeNotes({
  source,
  mockLabel,
  familyId,
  tipCount,
  newick,
  loadError,
  familySummary,
  activeViewer = "react-d3-tree",
  engineMetrics = {},
  serverRenderMs,
  serverRenderError,
}) {
  const lines = []

  if (source === "mock") {
    lines.push(`Mock Newick bundled in the frontend (${mockLabel || "demo"}).`)
    lines.push("ETE3, Biopython, and iTOL use the local API in mock mode (iTOL uploads to itol.embl.de).")
  } else {
    lines.push(
      `Live tree for family ${familyId ?? "—"} from S3 via ${config.apiUrl}/family/${familyId}/tree.`,
    )
    if (familySummary?.centroid_accession) {
      lines.push(
        `Family metadata: centroid ${familySummary.centroid_accession}, ${familySummary.variant_count ?? "?"} variants, ${familySummary.component_count ?? "?"} components.`,
      )
    }
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-1">
        <p>{loadError}</p>
        <p className="text-muted-foreground">
          Try another family ID or switch to mock demo mode. Trees must exist at{" "}
          <code className="font-mono">search-phylo-trees/family_N.nwk</code> in the results bucket.
        </p>
      </div>
    )
  }

  if (tipCount != null) {
    lines.push(`${tipCount} tip${tipCount === 1 ? "" : "s"} in the current Newick.`)
  }

  if (activeViewer === "ete" && serverRenderMs != null && !serverRenderError) {
    lines.push(`ETE3 server render: ${serverRenderMs} ms.`)
  }
  if (activeViewer === "biopython" && serverRenderMs != null && !serverRenderError) {
    lines.push(`Biopython server render: ${serverRenderMs} ms.`)
  }
  if (activeViewer === "itol" && serverRenderMs != null && !serverRenderError) {
    lines.push(`iTOL upload: ${serverRenderMs} ms.`)
  }

  const downloadUrl =
    source === "live" && familyId
      ? `${config.apiUrl}/family/${familyId}/tree`
      : null

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground space-y-3">
      {lines.map((t, i) => (
        <p key={i} className="m-0">{t}</p>
      ))}

      <div className="flex flex-wrap gap-3">
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download={`family_${familyId}.nwk`}
            className="text-accent underline-offset-4 hover:underline"
          >
            Download .nwk
          </a>
        ) : null}
        {source === "live" && familyId ? (
          <a
            href={`/tree/${familyId}`}
            className="text-accent underline-offset-4 hover:underline"
          >
            Compare with built-in dendrogram viewer
          </a>
        ) : null}
      </div>

      <div className="border-t border-border pt-3 space-y-1">
        <p className="font-medium text-foreground m-0">Preliminary recommendation</p>
        <p className="m-0">
          <strong className="text-foreground">react-d3-tree</strong> if you need interactive
          exploration inside the React app (best UX, weakest phylo layout).
        </p>
        <p className="m-0">
          <strong className="text-foreground">ETE3</strong> if publication-quality phylo visuals
          matter and static or server-rendered SVG is acceptable.
        </p>
        <p className="m-0">
          <strong className="text-foreground">Biopython</strong> as a lightweight Python baseline
          when you already run bio pipelines, but less polished than ETE for display.
        </p>
        <p className="m-0">
          <strong className="text-foreground">iTOL</strong> for the best interactive phylo UX
          (collapse, layouts, export). tree data is uploaded to EMBL iTOL servers.
        </p>
        <p className="m-0 opacity-80">
          Note: the existing{" "}
          <a href="/tree/1" className="text-accent underline-offset-4 hover:underline">
            /tree/:familyId
          </a>{" "}
          dendrogram already supports branch-length phylograms with zero extra deps.
        </p>
        {engineMetrics["react-d3-tree"]?.tipCount != null ? (
          <p className="m-0 opacity-70 font-mono text-[10px]">
            react-d3-tree last render: {engineMetrics["react-d3-tree"].tipCount} tips
          </p>
        ) : null}
      </div>

      {newick ? (
        <p className="font-mono text-[10px] opacity-70 truncate max-w-full m-0 pt-1 border-t border-border">
          {newick.slice(0, 96)}
          {newick.length > 96 ? "…" : ""}
        </p>
      ) : null}
    </div>
  )
}

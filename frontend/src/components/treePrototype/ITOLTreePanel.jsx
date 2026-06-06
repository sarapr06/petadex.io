import React from "react"

/** iTOL external.cgi always renders the site navbar; crop it in the embed. */
const ITOL_TOP_NAV_HEIGHT = 30
const ITOL_VIEWER_HEIGHT = 520

/**
 * Interactive iTOL viewer embedded via iframe (tree hosted on itol.embl.de).
 * @param {{
 *   loading: boolean,
 *   error: string | null,
 *   viewerUrl: string | null,
 *   treeId: string | null,
 *   uploadMs: number | null,
 * }} props
 */
export default function ITOLTreePanel({
  loading,
  error,
  viewerUrl,
  treeId,
  uploadMs,
}) {
  if (loading) {
    return (
      <div className="min-h-[280px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        Uploading tree to iTOL…
      </div>
    )
  }

  if (error) {
    const isConfigError = /ITOL_UPLOAD_ID|batch upload/i.test(error)
    const isSubscriptionError = /subscription|API key/i.test(error)

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-2">
        <p className="font-medium">iTOL upload failed</p>
        <p className="text-xs">{error}</p>
        {isSubscriptionError ? (
          <p className="text-xs text-muted-foreground">
            iTOL batch upload may require a paid subscription. Check{" "}
            <a
              href="https://itol.embl.de/infoReg.cgi"
              className="text-accent underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              iTOL registration / subscription
            </a>
            , or use{" "}
            <a
              href="https://itol.embl.de/upload.cgi"
              className="text-accent underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              anonymous upload
            </a>{" "}
            (1-day retention) and paste your Newick manually.
          </p>
        ) : isConfigError ? (
          <p className="text-xs text-muted-foreground">
            Enable batch upload in{" "}
            <a
              href="https://itol.embl.de/"
              className="text-accent underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              iTOL account settings
            </a>
            , then set <code className="font-mono">ITOL_UPLOAD_ID</code> and{" "}
            <code className="font-mono">ITOL_PROJECT_NAME</code> in{" "}
            <code className="font-mono">backend/.env</code>.
          </p>
        ) : null}
      </div>
    )
  }

  if (!viewerUrl) {
    return (
      <div className="min-h-[200px] rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        No iTOL viewer URL to display.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <p className="text-xs text-muted-foreground m-0">
          Interactive viewer hosted by{" "}
          <a
            href="https://itol.embl.de/itol.cgi"
            className="text-accent underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            iTOL
          </a>
          . Newick is uploaded to EMBL servers.
          {uploadMs != null ? ` Uploaded in ${uploadMs} ms.` : null}
          {treeId ? ` Tree ID: ${treeId}.` : null}
        </p>
        <a
          href={viewerUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs font-medium text-accent underline-offset-4 hover:underline shrink-0"
        >
          Open full viewer on iTOL
        </a>
      </div>

      <div
        className="relative overflow-hidden bg-white"
        style={{ height: ITOL_VIEWER_HEIGHT }}
      >
        <iframe
          title="iTOL interactive phylogenetic tree"
          src={viewerUrl}
          className="absolute left-0 w-full border-0 block bg-white"
          style={{
            top: -ITOL_TOP_NAV_HEIGHT,
            height: ITOL_VIEWER_HEIGHT + ITOL_TOP_NAV_HEIGHT,
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
      </div>
    </div>
  )
}

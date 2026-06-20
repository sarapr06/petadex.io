import React from "react"
import { Link } from "gatsby"
import { CATH_BASE_CSS } from "../../utils/cathColors"
import { buildCathDomainStructureLinks } from "../../utils/cathStructureLinks"

/**
 * @param {object} props
 * @param {{
 *   profileHmm: string,
 *   cathId: string,
 *   displayName: string,
 *   sourceLabel: string,
 *   lastUpdated: string,
 *   summary: string,
 *   moreInformation?: string,
 *   moreInformationFigure?: { imageSrc: string, caption: string, alt?: string },
 *   legendSegments?: { label: string, cathId: string }[],
 *   pdbIds?: string[],
 *   resourceLinks?: { label: string, url: string }[],
 *   component?: number|null,
 * }} props.domain
 */
const CathDomainVisualizationPanel = ({ domain }) => {
  const segments = domain.legendSegments?.length
    ? domain.legendSegments
    : [{ label: "Assigned CATH domain", cathId: domain.cathId }]

  const structureLinks = buildCathDomainStructureLinks(domain)
  const embedPdbId =
    Array.isArray(domain.pdbIds) && domain.pdbIds.length ? String(domain.pdbIds[0]).toUpperCase() : null
  const embedUrl =
    embedPdbId && /^[0-9][A-Z0-9]{3}$/.test(embedPdbId)
      ? `https://molstar.org/viewer/?pdb=${embedPdbId}`
      : null

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden mt-6">
      <div className="p-5 md:p-6 border-b border-border bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              {domain.profileHmm}
              <span className="text-muted-foreground/70"> · </span>
              {domain.cathId}
            </p>
            <h2 className="text-xl md:text-2xl font-semibold text-primary m-0">{domain.displayName}</h2>
          </div>
          <div className="text-sm text-muted-foreground shrink-0 sm:text-right">
            <div className="font-medium text-foreground/90">Source</div>
            <div>{domain.sourceLabel}</div>
            {domain.familyCount != null && (
              <div className="mt-0.5">Families in atlas: {Number(domain.familyCount).toLocaleString()}</div>
            )}
            <div className="mt-1">Updated {domain.lastUpdated}</div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-3 mb-0 leading-relaxed max-w-4xl">{domain.summary}</p>
        {domain.moreInformation && (
          <div className="mt-4 max-w-4xl rounded-lg border border-border bg-background/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 m-0">
              More information
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap m-0">
              {domain.moreInformation}
            </p>
            {domain.moreInformationFigure?.imageSrc && (
              <figure className="mt-4 m-0">
                <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
                  <img
                    src={domain.moreInformationFigure.imageSrc}
                    alt={domain.moreInformationFigure.alt || domain.moreInformationFigure.caption}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </div>
                {domain.moreInformationFigure.caption && (
                  <figcaption className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {domain.moreInformationFigure.caption}
                  </figcaption>
                )}
              </figure>
            )}
          </div>
        )}
      </div>

      <div className="p-5 md:p-6">
        {structureLinks.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-muted/15 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 m-0">
              PETadex links
            </p>
            <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
              {structureLinks.map(({ label, url, internal }) =>
                internal ? (
                  <li key={url}>
                    <Link
                      to={url}
                      className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
            <ul className="text-xs text-muted-foreground mt-3 mb-0 leading-relaxed pl-4 space-y-1 list-disc">
              <li>External papers, databases, and structure sources are listed in References below.</li>
              <li>Use these links for PETadex-native navigation (atlas and filtered enzyme views).</li>
            </ul>
          </div>
        )}

        {embedUrl ? (
          <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/20">
              <p className="text-sm font-medium text-foreground m-0">In-page 3D embed (Mol*): {embedPdbId}</p>
            </div>
            <iframe
              title={`Molstar viewer ${embedPdbId}`}
              src={embedUrl}
              className="w-full h-[420px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div
            className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 text-center min-h-[120px] px-4 py-6"
            aria-label="Structure visualization note"
          >
            <p className="text-sm font-medium text-foreground mb-1 m-0">In-page 3D embed</p>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed m-0">
              No representative PDB is mapped for this domain yet. Add a PDB id in the catalog to enable
              embedded Mol* viewing.
            </p>
          </div>
        )}

        {segments.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              CATH legend (UMAP coloring)
            </p>
            <ul className="flex flex-wrap gap-3 m-0 p-0 list-none">
              {segments.map(seg => (
                <li
                  key={`${seg.cathId}-${seg.label}`}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span
                    className="h-3 w-3 rounded-sm shrink-0 border border-border"
                    style={{ backgroundColor: CATH_BASE_CSS[seg.cathId] || "#64748b" }}
                    aria-hidden
                  />
                  <span>{seg.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">({seg.cathId})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default CathDomainVisualizationPanel

import React from "react"
import { CATH_BASE_CSS } from "../../utils/cathColors"

/**
 * @param {object} props
 * @param {{ profileHmm: string, cathId: string, displayName: string, sourceLabel: string, lastUpdated: string, summary: string, legendSegments?: { label: string, cathId: string }[] }} props.domain
 */
const CathDomainVisualizationPanel = ({ domain }) => {
  const segments = domain.legendSegments?.length
    ? domain.legendSegments
    : [{ label: "Assigned CATH domain", cathId: domain.cathId }]

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
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
          <div className="text-sm text-muted-foreground shrink-0 text-right">
            <div>{domain.sourceLabel}</div>
            {domain.familyCount != null && (
              <div className="mt-0.5">Families in atlas: {Number(domain.familyCount).toLocaleString()}</div>
            )}
            <div>Updated {domain.lastUpdated}</div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-3 mb-0 leading-relaxed">{domain.summary}</p>
      </div>

      <div className="p-5 md:p-6">
        <div
          className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/35 bg-muted/20 text-center min-h-[420px] px-6"
          aria-label="Structure visualization placeholder"
        >
          <p className="text-sm font-medium text-foreground mb-2">Domain / structure view (placeholder)</p>
          <p className="text-sm text-muted-foreground max-w-lg leading-relaxed m-0">
            Molstar, 3Dmol, or a domain schematic will render here from curated inputs (PDB accession,
            chain, residue ranges, highlight sets). No live structure is loaded in this skeleton.
          </p>
        </div>

        {segments.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Legend (illustrative)
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

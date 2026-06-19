import React, { useMemo } from "react"
import FeatureViewerPanel from "../proteinViewerPrototype/FeatureViewerPanel.jsx"
import { featureViewerDefsFromLogicalTracks } from "../proteinViewerPrototype/mockProteinData.js"
import { usePetadexDomains } from "./usePetadexDomains.js"

/**
 * InterPro-style domain strip for Petadex catalytic ORFs (sara_* SQL tables).
 *
 * @param {{
 *   orfId?: number | null,
 *   enzymeId?: number | null,
 *   accession?: string | null,
 *   sequence?: string | null,
 *   className?: string,
 *   compact?: boolean,
 * }} props
 */
export default function PetadexCatalyticDomainsPanel({
  orfId,
  enzymeId,
  accession,
  sequence: sequenceOverride,
  className = "",
  compact = false,
}) {
  const domains = usePetadexDomains({
    orfId,
    enzymeId,
    accession,
    enabled: Boolean(orfId || enzymeId || accession),
  })

  const displaySequence = sequenceOverride?.trim() || domains.sequence

  const rectTrackDefs = useMemo(
    () => featureViewerDefsFromLogicalTracks(domains.logicalTracks),
    [domains.logicalTracks],
  )

  const trackDefsKey = useMemo(
    () => JSON.stringify(domains.logicalTracks),
    [domains.logicalTracks],
  )

  const viewerKey = `petadex-domains-${domains.orfId ?? accession ?? enzymeId ?? "none"}`

  if (!orfId && !enzymeId && !accession) {
    return null
  }

  if (domains.loading) {
    return (
      <div className={`text-sm text-muted-foreground py-4 ${className}`}>
        Loading Petadex catalytic domains…
      </div>
    )
  }

  if (domains.error) {
    return (
      <div
        className={`rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive ${className}`}
      >
        Could not load catalytic domains: {domains.error}
      </div>
    )
  }

  if (!domains.hasAnnotations) {
    return (
      <div
        className={`rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground ${className}`}
      >
        {domains.notFound
          ? "This sequence is not in the Petadex catalytic-ORF set, so no domain scan is available."
          : "No catalytic domains were detected for this sequence by the PAZy HMM scan."}
      </div>
    )
  }

  if (!displaySequence?.length) {
    return (
      <div className={`text-sm text-muted-foreground py-2 ${className}`}>
        Annotations found but sequence unavailable.
      </div>
    )
  }

  const annotationSummary = [
    domains.meta?.domainCount ? `${domains.meta.domainCount} domain` : null,
    domains.meta?.motifCount ? `${domains.meta.motifCount} motif` : null,
    domains.meta?.signalCount ? `${domains.meta.signalCount} signal` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className={`space-y-3 ${className}`}>
      {!compact ? (
        <div>
          <h3 className="text-lg font-semibold text-foreground m-0">
            Petadex catalytic domains
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-0">
            {domains.orfId != null ? (
              <>
                ORF id <span className="font-mono text-foreground">{domains.orfId}</span>
                {" · "}
              </>
            ) : null}
            {annotationSummary || "HMM hits from petadex_catalytic_domains"}
          </p>
        </div>
      ) : null}

      <FeatureViewerPanel
        key={`${viewerKey}-${trackDefsKey}`}
        sequence={displaySequence}
        rectTrackDefs={rectTrackDefs}
        enrichmentLoading={false}
      />
    </div>
  )
}

import React from "react"

/**
 * @param {{
 *   pack: {
 *     resolvedAccession?: string | null,
 *     resolveMethod?: string,
 *     resolveDetail?: string,
 *     usingMockTracks?: boolean,
 *     usingMockPlddt?: boolean,
 *     plddtScores?: number[] | null,
 *     uniProtMessage?: string | null,
 *     alphaFoldMessage?: string | null,
 *   },
 *   isDemo?: boolean,
 * }} props
 */
export default function EnrichmentNotes({ pack, isDemo = false }) {
  const lines = []

  if (pack.resolveMethod === "manual" && pack.resolvedAccession) {
    lines.push(`UniProt for enrichment: ${pack.resolvedAccession} (manual override).`)
  } else if (pack.resolveMethod === "idmapping" && pack.resolvedAccession) {
    lines.push(`UniProt for enrichment: ${pack.resolvedAccession} (auto-mapped from Petadex).`)
  } else if (pack.resolveMethod === "direct" && pack.resolvedAccession) {
    lines.push(
      `UniProt for enrichment: ${pack.resolvedAccession} (Petadex accession is UniProt).`,
    )
  } else if (pack.resolveMethod === "cache" && pack.resolvedAccession) {
    lines.push(`UniProt for enrichment: ${pack.resolvedAccession} (cached mapping).`)
  } else if (pack.resolveMethod === "manual-invalid") {
    lines.push(`UniProt override invalid: ${pack.resolveDetail}`)
  } else if (pack.resolveMethod === "failed" || pack.resolveMethod === "none") {
    if (isDemo) {
      lines.push("Built-in demo — mock annotation bars (no Petadex accession to map).")
    } else {
      lines.push(
        `Auto-mapping found no UniProt accession — ${pack.resolveDetail || "mock bars only"}.`,
      )
    }
  } else if (pack.resolveMethod === "error") {
    lines.push(`Enrichment error — ${pack.resolveDetail}`)
  }

  if (pack.usingMockTracks && pack.resolvedAccession) {
    lines.push(
      "No UniProt features matched — showing scaled mock rectangles (same as demo proportions).",
    )
  } else if (pack.usingMockTracks && !pack.resolvedAccession && !isDemo) {
    lines.push("Showing mock annotation bars (scaled to sequence length).")
  }

  if (pack.uniProtMessage) lines.push(pack.uniProtMessage)
  if (pack.alphaFoldMessage) lines.push(pack.alphaFoldMessage)
  if (pack.usingMockPlddt) {
    lines.push("pLDDT strip uses synthetic demo scores (not from AlphaFold).")
  } else if (pack.plddtScores?.length) {
    lines.push("pLDDT from AlphaFold confidence (length matches Petadex sequence).")
  }

  if (!lines.length) return null

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
      {lines.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </div>
  )
}

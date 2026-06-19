import React from "react"

/**
 * @param {{
 *   meta?: {
 *     domainCount?: number,
 *     motifCount?: number,
 *     signalCount?: number,
 *     tables?: string[],
 *   } | null,
 *   syntheticSequence?: boolean,
 *   error?: string | null,
 * }} props
 */
export default function SaraViewerNotes({ meta, syntheticSequence = false, error }) {
  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        {error}
      </div>
    )
  }

  if (!meta) return null

  const lines = [
    "Annotations from Petadex SQL (catalytic domain pipeline).",
    syntheticSequence
      ? `Sequence is a placeholder (${meta.domainCount ?? 0} domain, ${meta.motifCount ?? 0} motif, ${meta.signalCount ?? 0} signal rows for this orf_id).`
      : `Using enzyme sequence from database (${meta.domainCount ?? 0} domain, ${meta.motifCount ?? 0} motif, ${meta.signalCount ?? 0} signal rows).`,
  ]

  if (meta.tables?.length) {
    lines.push(`Tables: ${meta.tables.join(", ")}.`)
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
      {lines.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </div>
  )
}

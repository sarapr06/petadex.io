import React, { useMemo, useState } from "react"
import { TEMPLATE_LENGTH } from "./mockProteinData.js"

/** Sentinel value for built-in demo sequence (no API). */
export const DEMO_OPTION_VALUE = "__demo__"

/**
 * Choose an accession from the FASTA list or the built-in demo strip.
 */
export default function ProteinSelector({
  idPrefix,
  label,
  value,
  onChange,
  accessions,
  listLoading,
  listError,
  disabled,
}) {
  const [filter, setFilter] = useState("")

  const filtered = useMemo(() => {
    if (!accessions?.length) return []
    const q = filter.trim().toLowerCase()
    if (!q) return accessions.slice(0, 400)
    return accessions
      .filter(row => row.accession?.toLowerCase().includes(q))
      .slice(0, 400)
  }, [accessions, filter])

  const selectId = `${idPrefix}-select`
  const filterId = `${idPrefix}-filter`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={selectId}
        className="input w-full max-w-full font-mono text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || listLoading}
      >
        <option value={DEMO_OPTION_VALUE}>
          Built-in demo ({TEMPLATE_LENGTH} aa)
        </option>
        {filtered.map(row => (
          <option key={row.accession} value={row.accession}>
            {row.accession}
          </option>
        ))}
      </select>
      <div className="flex flex-col gap-1">
        <label htmlFor={filterId} className="text-xs text-muted-foreground">
          Filter accessions
        </label>
        <input
          id={filterId}
          type="search"
          className="input w-full text-sm"
          placeholder="Type to narrow list…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          disabled={disabled || listLoading || !accessions?.length}
          autoComplete="off"
        />
      </div>
      {listLoading ? (
        <p className="text-xs text-muted-foreground">Loading accession list…</p>
      ) : null}
      {listError ? (
        <p className="text-xs text-destructive">
          Could not load accessions ({listError}). Demo sequence still works.
        </p>
      ) : null}
      {!listLoading && accessions?.length ? (
        <p className="text-xs text-muted-foreground">
          Showing up to {filtered.length} matches · total {accessions.length} in database
        </p>
      ) : null}
    </div>
  )
}

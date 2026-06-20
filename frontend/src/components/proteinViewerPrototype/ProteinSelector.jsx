import React, { useMemo, useState } from "react"
import { TEMPLATE_LENGTH } from "./mockProteinData.js"
import {
  DEMO_MOCK_FALLBACK_ACCESSION,
  DEMO_REAL_UNIPROT_ACCESSIONS,
} from "./demoProteinAccessions.js"

/** Sentinel value for built-in demo sequence (no API). */
export const DEMO_OPTION_VALUE = "__demo__"

const REAL_ACCESSION_SET = new Set(DEMO_REAL_UNIPROT_ACCESSIONS)

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
  demoMode = false,
  mockFallbackAccession = DEMO_MOCK_FALLBACK_ACCESSION,
}) {
  const [filter, setFilter] = useState("")

  const { realRows, mockRow, flatRows } = useMemo(() => {
    if (!accessions?.length) {
      return { realRows: [], mockRow: null, flatRows: [] }
    }
    const q = filter.trim().toLowerCase()
    const matches = q
      ? accessions.filter(row => row.accession?.toLowerCase().includes(q))
      : accessions.slice(0, 400)
    const realRows = matches
      .filter(row => REAL_ACCESSION_SET.has(row.accession))
      .sort(
        (a, b) =>
          DEMO_REAL_UNIPROT_ACCESSIONS.indexOf(a.accession) -
          DEMO_REAL_UNIPROT_ACCESSIONS.indexOf(b.accession),
      )
    const mockRow =
      matches.find(row => row.accession === mockFallbackAccession) ?? null
    return { realRows, mockRow, flatRows: matches }
  }, [accessions, filter, mockFallbackAccession])

  const selectId = `${idPrefix}-select`
  const filterId = `${idPrefix}-filter`

  const optionCount = demoMode
    ? realRows.length + (mockRow ? 1 : 0)
    : 1 + flatRows.length

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
        {!demoMode ? (
          <option value={DEMO_OPTION_VALUE}>
            Built-in demo ({TEMPLATE_LENGTH} aa)
          </option>
        ) : null}
        {demoMode ? (
          <>
            <optgroup label="Real UniProt annotations">
              {realRows.map(row => (
                <option key={row.accession} value={row.accession}>
                  {row.accession}
                </option>
              ))}
            </optgroup>
            {mockRow ? (
              <optgroup label="Mock fallback example">
                <option value={mockRow.accession}>
                  {mockRow.accession} — uses placeholder bars
                </option>
              </optgroup>
            ) : null}
          </>
        ) : (
          flatRows.map(row => (
            <option key={row.accession} value={row.accession}>
              {row.accession}
            </option>
          ))
        )}
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
          {demoMode ? (
            <>
              Demo mode: {optionCount} proteins ({DEMO_REAL_UNIPROT_ACCESSIONS.length}{" "}
              real UniProt · 1 mock fallback)
            </>
          ) : (
            <>
              Showing up to {optionCount} matches · total {accessions.length} in
              database
            </>
          )}
        </p>
      ) : null}
    </div>
  )
}

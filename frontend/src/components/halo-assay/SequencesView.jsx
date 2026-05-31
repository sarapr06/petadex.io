import React, { useEffect, useMemo, useState } from "react"
import config from "../../config"
import SequenceList from "../sequence/SequenceList"
import TopPerformersLeaderboard from "./TopPerformersLeaderboard"

const SequencesView = () => {
  const [sequences, setSequences] = useState([])
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${config.apiUrl}/fastaa`)
        if (!res.ok) throw new Error(`Status ${res.status}`)
        setSequences(await res.json())
      } catch (err) {
        setError(err.toString())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!searchInput) return sequences
    const q = searchInput.toLowerCase()
    return sequences.filter(seq => seq.accession.toLowerCase().includes(q))
  }, [sequences, searchInput])

  const withMetadata = filtered.filter(s => s.in_gene_metadata === true)
  const withoutMetadata = filtered.filter(s => s.in_gene_metadata !== true)

  const totalWithMeta = sequences.filter(s => s.in_gene_metadata === true).length
  const totalWithSra = sequences.filter(s => s.in_sra_metadata === true).length

  return (
    <div className="space-y-10">
      {/* Stats + leaderboard row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="card p-6">
          <h3 className="text-lg font-bold text-primary mb-1">Catalog</h3>
          <p className="text-sm text-muted-foreground mb-5">
            PETase sequences in the database
          </p>

          <div className="space-y-4">
            <Stat
              label="Total sequences"
              value={sequences.length}
              loading={loading}
            />
            <Stat
              label="Synthesized & tested"
              value={totalWithMeta}
              total={sequences.length}
              loading={loading}
              color="#059669"
            />
            <Stat
              label="With geographic origin"
              value={totalWithSra}
              total={sequences.length}
              loading={loading}
              color="#3b82f6"
            />
          </div>
        </div>

        <TopPerformersLeaderboard />
      </div>

      {/* Search */}
      <div>
        <label className="block">
          <span className="label mb-2">Search the catalog</span>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by accession (e.g., P80146.3, WP_054022242.1)"
            className="input w-full"
          />
        </label>
        <p
          className={`mt-2 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {loading
            ? "Loading sequence data…"
            : error
              ? "Error loading sequences"
              : searchInput
                ? `${filtered.length} matching sequence${filtered.length !== 1 ? "s" : ""}`
                : `Showing all ${sequences.length} sequences`}
        </p>
      </div>

      {/* Lists */}
      {loading ? (
        <p className="text-muted-foreground italic py-4">Loading sequences…</p>
      ) : error ? (
        <p className="text-destructive py-4">Error loading sequences: {error}</p>
      ) : (
        <div>
          <SequenceList
            title="Sequences with Experimental Data"
            sequenceList={withMetadata}
          />
          <SequenceList
            title="Sequences without Experimental Data"
            sequenceList={withoutMetadata}
          />
        </div>
      )}
    </div>
  )
}

const Stat = ({ label, value, total, loading, color = "var(--sem-text-primary)" }) => {
  const pct = total ? (value / total) * 100 : null
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-secondary-foreground">{label}</span>
        <span className="text-xl font-bold tabular-nums" style={{ color }}>
          {loading ? "—" : value.toLocaleString()}
        </span>
      </div>
      {pct != null && !loading && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  )
}

export default SequencesView

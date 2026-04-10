import React, { useState, useEffect } from "react"
import FeaturedPETases from "../components/FeaturedPETases"
import SequenceList from "../components/sequence/SequenceList"
import Seo from "../components/seo"
import config from "../config"
import { useScrollHeader } from "../hooks/useScrollHeader"
import Container from "../components/common/Container"

const FastaaPage = () => {
  useScrollHeader()
  const [sequences, setSequences] = useState([])
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const endpoint = `${config.apiUrl}/fastaa`

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error(`Status ${res.status}`)
        setSequences(await res.json())
      } catch (err) {
        setError(err.toString())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [endpoint])

  const filteredSequences = searchInput
    ? sequences.filter(seq =>
      seq.accession.toLowerCase().includes(searchInput.toLowerCase())
    )
    : sequences

  const sequencesWithMetadata = filteredSequences.filter(seq => seq.in_gene_metadata === true)
  const sequencesWithoutMetadata = filteredSequences.filter(seq => seq.in_gene_metadata !== true)

  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-24 text-center">
        <Container size="sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            A Database for PETases
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Search and browse plastic-degrading enzymes
          </p>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by accession number (e.g., P80146.3)"
            className="input mt-6"
          />
          <p className={`mt-3 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>
            {loading ? (
              <span className="italic">Loading sequence data…</span>
            ) : error ? (
              "Error loading sequences"
            ) : searchInput ? (
              `Found ${filteredSequences.length} matching sequence${filteredSequences.length !== 1 ? "s" : ""}`
            ) : (
              `Total: ${sequences.length} — ${sequencesWithMetadata.length} with experimental data, ${sequencesWithoutMetadata.length} without`
            )}
          </p>
        </Container>
      </section>

      {/* Featured */}
      {!searchInput && (
        <section className="bg-surface-raised border-y border py-12">
          <Container>
            <FeaturedPETases sequences={sequences} loading={loading} />
          </Container>
        </section>
      )}

      {/* Sequence lists */}
      <section className="py-16 md:py-20">
        <Container>
          {loading ? (
            <p className="text-muted-foreground italic py-4">Loading sequences…</p>
          ) : error ? (
            <p className="text-destructive py-4">Error loading sequences: {error}</p>
          ) : (
            <>
              <SequenceList
                title="Sequences with Experimental Data"
                sequenceList={sequencesWithMetadata}
              />
              <SequenceList
                title="Sequences without Experimental Data"
                sequenceList={sequencesWithoutMetadata}
              />
            </>
          )}
        </Container>
      </section>
    </>
  )
}

export default FastaaPage

export const Head = () => (
  <Seo
    title="Protein Sequences"
    description="Browse and search plastic-degrading enzyme sequences"
  />
)

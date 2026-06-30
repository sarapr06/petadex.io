// frontend/src/components/corpus/CatalyticDomainsPanel.jsx
//
// Catalytic-domain evidence for a corpus ORF, from the corpus-keyed route
// GET /api/orf/{orfId}/domains (petadex_catalytic_domains + pazy_hmms). This is a
// FACTUAL, deterministic HMM match — framed as EVIDENCE with coordinates, never
// as a function claim ("is a PETase"). See the framing discipline in "01 -
// Per-Sequence Annotation Plan" and "03 - Frontend Wiring".
//
// NOTE: this intentionally does NOT use the curated LazyPetadexCatalyticDomainsPanel
// / /api/petadex-domains route — that route resolves the integer id against the
// enzyme_fastaa namespace (a different protein for the same integer) and serves a
// mismatched sequence. This panel is keyed purely on the corpus orf_id.
import React, { useEffect, useState } from "react"
import config from "../../config"

function Domain({ d }) {
  const residues = Array.isArray(d.catalytic_residues)
    ? d.catalytic_residues.filter(Boolean)
    : []
  const states = Array.isArray(d.catalytic_match_states)
    ? d.catalytic_match_states.filter(Boolean)
    : []

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-foreground m-0">
          {d.domain || "PAZy HMM domain"}
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          residues {d.domain_start}–{d.domain_end}
        </span>
      </div>

      <p className="text-sm text-secondary-foreground mt-2 mb-0">
        Matched PAZy HMM{" "}
        <span className="font-mono text-foreground">{d.pazy_hmm_id}</span> over
        residues {d.domain_start}–{d.domain_end}.
        {residues.length > 0 && (
          <>
            {" "}
            Catalytic residues{" "}
            <span className="font-mono text-foreground">
              {residues.join(", ")}
            </span>{" "}
            present
            {states.length > 0 && (
              <>
                {" "}
                (HMM match states{" "}
                <span className="font-mono">{states.join(", ")}</span>)
              </>
            )}
            .
          </>
        )}
      </p>

      {d.evidence_type && (
        <p className="text-xs text-muted-foreground mt-2 mb-0">
          Evidence: {d.evidence_type}
          {d.date_performed
            ? ` · ${String(d.date_performed).slice(0, 10)}`
            : ""}
        </p>
      )}
    </div>
  )
}

/**
 * @param {{ orfId: number | string | null }} props
 */
export default function CatalyticDomainsPanel({ orfId }) {
  const [domains, setDomains] = useState([])
  const [status, setStatus] = useState("idle") // idle | loading | ready | empty | error

  useEffect(() => {
    if (orfId == null || orfId === "") {
      setStatus("idle")
      return
    }

    let cancelled = false
    setStatus("loading")

    fetch(`${config.apiUrl}/orf/${encodeURIComponent(String(orfId))}/domains`)
      .then(async res => {
        if (cancelled) return
        if (!res.ok) {
          setStatus("error")
          return
        }
        const data = await res.json()
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setDomains(list)
        setStatus(list.length ? "ready" : "empty")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [orfId])

  // Render nothing while loading/idle (avoids layout flash on the common
  // no-domains case).
  if (status === "idle" || status === "loading") return null

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-semibold text-foreground m-0">
          Catalytic domains
        </h2>
        <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
          Factual · HMM evidence
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Deterministic PAZy HMM matches with coordinates — shown as evidence, not
        a function assignment.
      </p>

      {status === "ready" && (
        <div className="space-y-3">
          {domains.map((d, i) => (
            <Domain key={`${d.pazy_hmm_id}-${i}`} d={d} />
          ))}
        </div>
      )}

      {status === "empty" && (
        <p className="text-sm text-muted-foreground m-0">
          No PAZy catalytic-HMM match is recorded for this ORF.
        </p>
      )}

      {status === "error" && (
        <p className="text-sm text-muted-foreground m-0">
          Catalytic-domain evidence could not be loaded.
        </p>
      )}
    </section>
  )
}

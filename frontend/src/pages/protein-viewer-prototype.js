/**
 * Temporary route for protein feature viewer prototype (remove when done).
 * URL: /protein-viewer-prototype/
 */
import React, { useCallback, useEffect, useMemo, useState } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import {
  DEMO_SEQUENCE,
  featureViewerDefsFromLogicalTracks,
} from "../components/proteinViewerPrototype/mockProteinData.js"
import FeatureViewerPanel from "../components/proteinViewerPrototype/FeatureViewerPanel.jsx"
import ProteinSelector, {
  DEMO_OPTION_VALUE,
} from "../components/proteinViewerPrototype/ProteinSelector.jsx"
import EnrichmentNotes from "../components/proteinViewerPrototype/enrichment/EnrichmentNotes.jsx"
import { useProteinEnrichment } from "../components/proteinViewerPrototype/enrichment/useProteinEnrichment.js"
import {
  DEMO_MODE_ACCESSIONS,
  DEMO_REAL_UNIPROT_ACCESSIONS,
  isDemoModeAccession,
} from "../components/proteinViewerPrototype/demoProteinAccessions.js"
import {
  featureViewerPlddtDef,
} from "../components/proteinViewerPrototype/plddtConfidence.js"
import PlddtLegend from "../components/proteinViewerPrototype/PlddtLegend.jsx"
import SaraViewerNotes from "../components/proteinViewerPrototype/sara/SaraViewerNotes.jsx"
import { useSaraViewer } from "../components/proteinViewerPrototype/sara/useSaraViewer.js"

const DEMO_MODE_DEFAULT_ACCESSION = DEMO_REAL_UNIPROT_ACCESSIONS[0]

/** @typedef {"fastaa_uniprot" | "sara_orf"} AnnotationSource */

const ProteinViewerPrototypePage = () => {
  const [accessions, setAccessions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [demoMode, setDemoMode] = useState(true)
  /** @type {[AnnotationSource, React.Dispatch<React.SetStateAction<AnnotationSource>>]} */
  const [annotationSource, setAnnotationSource] = useState("fastaa_uniprot")

  const [choice, setChoice] = useState(DEMO_MODE_DEFAULT_ACCESSION)
  const [seq, setSeq] = useState("")
  const [seqLoading, setSeqLoading] = useState(true)
  const [seqError, setSeqError] = useState(null)

  const [orfId, setOrfId] = useState(1)
  const sara = useSaraViewer(orfId, annotationSource === "sara_orf")

  const selectorAccessions = useMemo(() => {
    if (!demoMode) return accessions
    const byAcc = new Map(
      accessions.map(row => [row.accession, row]),
    )
    return DEMO_MODE_ACCESSIONS.map(acc => byAcc.get(acc)).filter(Boolean)
  }, [accessions, demoMode])

  const handleDemoModeChange = useCallback(
    enabled => {
      setDemoMode(enabled)
      if (!enabled) return
      setChoice(c => {
        if (c === DEMO_OPTION_VALUE || isDemoModeAccession(c)) return c
        return DEMO_MODE_DEFAULT_ACCESSION
      })
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    fetch(`${config.apiUrl}/fastaa`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(rows => {
        if (!cancelled) setAccessions(Array.isArray(rows) ? rows : [])
      })
      .catch(err => {
        if (!cancelled) setListError(err.message || String(err))
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (annotationSource !== "fastaa_uniprot") return
    if (choice === DEMO_OPTION_VALUE) {
      setSeq(DEMO_SEQUENCE)
      setSeqError(null)
      setSeqLoading(false)
      return
    }
    setSeqLoading(true)
    setSeqError(null)
    setSeq("")
    let cancelled = false
    fetch(`${config.apiUrl}/fastaa/${encodeURIComponent(choice)}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(
            r.status === 404 ? `Not found: ${choice}` : `HTTP ${r.status}`,
          )
        }
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        const s = data.sequence
        if (typeof s !== "string" || !s.length) {
          throw new Error("Empty or invalid sequence in API response")
        }
        setSeq(s)
      })
      .catch(err => {
        if (!cancelled) {
          setSeqError(err.message || String(err))
          setSeq("")
        }
      })
      .finally(() => {
        if (!cancelled) setSeqLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [choice, annotationSource])

  const enrich = useProteinEnrichment({
    petadexAccession:
      annotationSource === "fastaa_uniprot" && choice !== DEMO_OPTION_VALUE
        ? choice
        : "",
    sequence: annotationSource === "fastaa_uniprot" ? seq : "",
    sequenceLoading:
      annotationSource === "fastaa_uniprot" ? seqLoading : true,
    isDemo:
      annotationSource === "fastaa_uniprot" && choice === DEMO_OPTION_VALUE,
    autoMap: true,
  })

  const isSara = annotationSource === "sara_orf"
  const displaySeq = isSara ? (sara.error ? "" : sara.sequence) : seqError ? "" : seq
  const displayLoading = isSara ? sara.loading : seqLoading
  const displayError = isSara ? sara.error : seqError

  const rectDefs = useMemo(() => {
    const tracks = isSara ? sara.logicalTracks : enrich.logicalTracks
    const base = featureViewerDefsFromLogicalTracks(tracks).filter(
      d => d.id !== "plddt",
    )
    if (isSara || !enrich.plddtScores?.length) return base
    return [featureViewerPlddtDef(enrich.plddtScores), ...base]
  }, [isSara, sara.logicalTracks, enrich.logicalTracks, enrich.plddtScores])

  const showPlddt = !isSara && (enrich.plddtScores?.length ?? 0) > 0
  const viewerKey = isSara ? `sara-${orfId}` : `fv-${choice}`

  return (
    <div className="py-10 md:py-14">
      <Container size="wide">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground mb-8">
          <strong className="font-semibold">Temporary prototype.</strong> neXtProt-style
          feature-viewer for domain and site tracks. Not linked from the main nav; bookmark{" "}
          <code className="text-xs bg-muted px-1 rounded">/protein-viewer-prototype/</code> to
          return.
        </div>

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Protein feature strip (prototype)
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            <strong className="text-foreground">feature-viewer</strong> (SIB / neXtProt) with
            annotation tracks from Petadex + UniProt, or from Drylab SQL tables keyed by{" "}
            <code className="text-xs bg-muted px-1 rounded">orf_id</code>.
          </p>
        </header>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-4 mb-10 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-foreground mb-2">
              Annotation source
            </legend>
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="annotation-source"
                  className="mt-0.5"
                  checked={annotationSource === "fastaa_uniprot"}
                  onChange={() => setAnnotationSource("fastaa_uniprot")}
                />
                <span>
                  <strong className="text-foreground">Petadex + UniProt</strong> — sequence from{" "}
                  <code className="text-xs bg-muted px-1 rounded">/fastaa</code>, features via
                  UniProt ID mapping and AlphaFold pLDDT when available.
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="annotation-source"
                  className="mt-0.5"
                  checked={annotationSource === "sara_orf"}
                  onChange={() => setAnnotationSource("sara_orf")}
                />
                <span>
                  <strong className="text-foreground">Drylab SQL (orf_id)</strong> —{" "}
                  <code className="text-xs bg-muted px-1 rounded">sara_domains</code>,{" "}
                  <code className="text-xs bg-muted px-1 rounded">sara_important_motfis</code>,{" "}
                  <code className="text-xs bg-muted px-1 rounded">sara_signal_sequences</code>.
                </span>
              </label>
            </div>
          </fieldset>

          {annotationSource === "fastaa_uniprot" ? (
            <label className="flex items-start gap-3 cursor-pointer border-t border-border pt-4">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={demoMode}
                onChange={e => handleDemoModeChange(e.target.checked)}
              />
              <span className="text-sm text-foreground">
                <strong>Demo mode</strong> — show curated proteins only (
                {DEMO_REAL_UNIPROT_ACCESSIONS.length} with real UniProt tracks + 1 mock
                fallback)
              </span>
            </label>
          ) : null}
        </div>

        <section className="flex flex-col gap-3 max-w-5xl">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              feature-viewer (SIB / neXtProt)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              <a
                className="text-accent underline-offset-4 hover:underline"
                href="https://github.com/calipho-sib/feature-viewer"
                target="_blank"
                rel="noreferrer noopener"
              >
                calipho-sib/feature-viewer
              </a>
              {" · "}
              <a
                className="text-accent underline-offset-4 hover:underline"
                href="http://calipho-sib.github.io/feature-viewer/examples/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Examples
              </a>
            </p>
          </div>

          {isSara ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="orf-id-select"
                className="text-sm font-medium text-foreground"
              >
                ORF id
              </label>
              <select
                id="orf-id-select"
                className="input w-full max-w-xs font-mono text-sm"
                value={orfId}
                onChange={e => setOrfId(Number(e.target.value))}
                disabled={sara.orfListLoading}
              >
                {(sara.orfIds.length ? sara.orfIds : [1]).map(id => (
                  <option key={id} value={id}>
                    orf_id {id}
                  </option>
                ))}
              </select>
              {sara.orfListError ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ORF list: {sara.orfListError} (using orf_id 1)
                </p>
              ) : null}
            </div>
          ) : (
            <ProteinSelector
              idPrefix="fv"
              label="Protein"
              value={choice}
              onChange={setChoice}
              accessions={selectorAccessions}
              listLoading={listLoading}
              listError={listError}
              demoMode={demoMode}
            />
          )}

          {isSara ? (
            <p className="text-xs font-mono text-muted-foreground">
              Showing: <span className="text-foreground">orf_id {orfId}</span> ·{" "}
              {displayLoading ? (
                <span className="text-amber-600 dark:text-amber-400">loading…</span>
              ) : displayError ? (
                <span className="text-destructive">{displayError}</span>
              ) : (
                <span>{displaySeq.length} aa (synthetic)</span>
              )}
            </p>
          ) : choice !== DEMO_OPTION_VALUE ? (
            <p className="text-xs font-mono text-muted-foreground">
              Showing: <span className="text-foreground">{choice}</span> ·{" "}
              {displayLoading ? (
                <span className="text-amber-600 dark:text-amber-400">loading…</span>
              ) : displayError ? (
                <span className="text-destructive">{displayError}</span>
              ) : (
                <span>{displaySeq.length} aa</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Built-in demo · {DEMO_SEQUENCE.length} aa — mock bars (no Petadex accession to map).
            </p>
          )}

          {isSara ? (
            <SaraViewerNotes meta={sara.meta} error={sara.error} />
          ) : (
            <EnrichmentNotes
              pack={enrich}
              isDemo={choice === DEMO_OPTION_VALUE}
            />
          )}

          {showPlddt ? <PlddtLegend className="mb-1" /> : null}

          <FeatureViewerPanel
            key={viewerKey}
            sequence={displaySeq}
            rectTrackDefs={rectDefs}
            enrichmentLoading={isSara ? sara.loading : enrich.loading}
          />
        </section>
      </Container>
    </div>
  )
}

export default ProteinViewerPrototypePage

export const Head = () => (
  <Seo
    title="Protein viewer prototype"
    description="neXtProt feature-viewer prototype with Petadex UniProt or Drylab SQL annotations."
  />
)

/**
 * Temporary route for comparing protein feature viewers (remove when done).
 * URL: /protein-viewer-prototype/
 */
import React, { useCallback, useEffect, useMemo, useState } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import {
  DEMO_SEQUENCE,
  featureViewerDefsFromLogicalTracks,
  nightingalePayloadFromLogicalTracks,
} from "../components/proteinViewerPrototype/mockProteinData.js"
import NightingaleProteinPanel from "../components/proteinViewerPrototype/NightingaleProteinPanel.jsx"
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
  logicalTracksWithPlddt,
} from "../components/proteinViewerPrototype/plddtConfidence.js"
import PlddtLegend from "../components/proteinViewerPrototype/PlddtLegend.jsx"

const DEMO_MODE_DEFAULT_ACCESSION = DEMO_REAL_UNIPROT_ACCESSIONS[0]

const ProteinViewerPrototypePage = () => {
  const [accessions, setAccessions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [demoMode, setDemoMode] = useState(true)

  const [ngChoice, setNgChoice] = useState(DEMO_MODE_DEFAULT_ACCESSION)
  const [fvChoice, setFvChoice] = useState(DEMO_MODE_DEFAULT_ACCESSION)
  const [ngSeq, setNgSeq] = useState("")
  const [fvSeq, setFvSeq] = useState("")
  const [ngLoading, setNgLoading] = useState(true)
  const [fvLoading, setFvLoading] = useState(true)
  const [ngError, setNgError] = useState(null)
  const [fvError, setFvError] = useState(null)

  const selectorAccessions = useMemo(() => {
    if (!demoMode) return accessions
    const allow = new Set(DEMO_MODE_ACCESSIONS)
    const byAcc = new Map(
      accessions.map(row => [row.accession, row]),
    )
    return DEMO_MODE_ACCESSIONS.map(acc => byAcc.get(acc)).filter(Boolean)
  }, [accessions, demoMode])

  const handleDemoModeChange = useCallback(
    enabled => {
      setDemoMode(enabled)
      if (!enabled) return
      const resetIfNeeded = choice => {
        if (choice === DEMO_OPTION_VALUE || isDemoModeAccession(choice)) {
          return choice
        }
        return DEMO_MODE_DEFAULT_ACCESSION
      }
      setNgChoice(c => resetIfNeeded(c))
      setFvChoice(c => resetIfNeeded(c))
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
    if (ngChoice === DEMO_OPTION_VALUE) {
      setNgSeq(DEMO_SEQUENCE)
      setNgError(null)
      setNgLoading(false)
      return
    }
    setNgLoading(true)
    setNgError(null)
    setNgSeq("")
    let cancelled = false
    fetch(`${config.apiUrl}/fastaa/${encodeURIComponent(ngChoice)}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(
            r.status === 404 ? `Not found: ${ngChoice}` : `HTTP ${r.status}`,
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
        setNgSeq(s)
      })
      .catch(err => {
        if (!cancelled) {
          setNgError(err.message || String(err))
          setNgSeq("")
        }
      })
      .finally(() => {
        if (!cancelled) setNgLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ngChoice])

  useEffect(() => {
    if (fvChoice === DEMO_OPTION_VALUE) {
      setFvSeq(DEMO_SEQUENCE)
      setFvError(null)
      setFvLoading(false)
      return
    }
    setFvLoading(true)
    setFvError(null)
    setFvSeq("")
    let cancelled = false
    fetch(`${config.apiUrl}/fastaa/${encodeURIComponent(fvChoice)}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(
            r.status === 404 ? `Not found: ${fvChoice}` : `HTTP ${r.status}`,
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
        setFvSeq(s)
      })
      .catch(err => {
        if (!cancelled) {
          setFvError(err.message || String(err))
          setFvSeq("")
        }
      })
      .finally(() => {
        if (!cancelled) setFvLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fvChoice])

  const ngEnrich = useProteinEnrichment({
    petadexAccession: ngChoice === DEMO_OPTION_VALUE ? "" : ngChoice,
    sequence: ngSeq,
    sequenceLoading: ngLoading,
    isDemo: ngChoice === DEMO_OPTION_VALUE,
    autoMap: true,
  })

  const fvEnrich = useProteinEnrichment({
    petadexAccession: fvChoice === DEMO_OPTION_VALUE ? "" : fvChoice,
    sequence: fvSeq,
    sequenceLoading: fvLoading,
    isDemo: fvChoice === DEMO_OPTION_VALUE,
    autoMap: true,
  })

  const ngTracksForView = useMemo(
    () => logicalTracksWithPlddt(ngEnrich.logicalTracks, ngEnrich.plddtScores),
    [ngEnrich.logicalTracks, ngEnrich.plddtScores],
  )

  const ngTrackPayloads = useMemo(
    () => nightingalePayloadFromLogicalTracks(ngTracksForView),
    [ngTracksForView],
  )

  const fvRectDefs = useMemo(() => {
    const base = featureViewerDefsFromLogicalTracks(fvEnrich.logicalTracks).filter(
      d => d.id !== "plddt",
    )
    if (!fvEnrich.plddtScores?.length) return base
    return [featureViewerPlddtDef(fvEnrich.plddtScores), ...base]
  }, [fvEnrich.logicalTracks, fvEnrich.plddtScores])

  const showNgPlddt = (ngEnrich.plddtScores?.length ?? 0) > 0
  const showFvPlddt = (fvEnrich.plddtScores?.length ?? 0) > 0

  return (
    <div className="py-10 md:py-14">
      <Container size="wide">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground mb-8">
          <strong className="font-semibold">Temporary prototype.</strong> This page is for
          comparing libraries only and will be removed. Not linked from the main nav; bookmark{" "}
          <code className="text-xs bg-muted px-1 rounded">/protein-viewer-prototype/</code> to
          return.
        </div>

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Protein feature strip (prototype)
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            <strong className="text-foreground">Sequence</strong> always comes from Petadex (
            <code className="text-xs bg-muted px-1 rounded">{config.apiUrl}/fastaa</code>
            ). For each selected protein, <strong className="text-foreground">annotations</strong>{" "}
            auto-map the Petadex accession to UniProt when possible (
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://www.uniprot.org/help/id_mapping"
              target="_blank"
              rel="noreferrer noopener"
            >
              UniProt ID mapping
            </a>
            ), then load{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://rest.uniprot.org/"
              target="_blank"
              rel="noreferrer noopener"
            >
              UniProt features
            </a>{" "}
            and{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://alphafold.ebi.ac.uk/"
              target="_blank"
              rel="noreferrer noopener"
            >
              AlphaFold
            </a>{" "}
            pLDDT. If mapping or features fail, scaled mock bars are shown instead.
          </p>
        </header>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 mb-10">
          <label className="flex items-start gap-3 cursor-pointer">
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
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8 items-start">
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Nightingale (EBI web components)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                <a
                  className="text-accent underline-offset-4 hover:underline"
                  href="https://github.com/ebi-webcomponents/nightingale"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ebi-webcomponents/nightingale
                </a>
                {" · "}
                <a
                  className="text-accent underline-offset-4 hover:underline"
                  href="https://ebi-webcomponents.github.io/nightingale/"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Docs / Storybook
                </a>
              </p>
              <ul className="mt-3 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>
                  Thin pLDDT colour gradient under the sequence when scores match sequence length.
                </li>
                <li>
                  Tracks below: Families/regions · Domains/repeats · Motifs/sites — from UniProt
                  when auto-mapping succeeds; otherwise scaled mock bars.
                </li>
              </ul>
            </div>

            <ProteinSelector
              idPrefix="ng"
              label="Protein for Nightingale"
              value={ngChoice}
              onChange={setNgChoice}
              accessions={selectorAccessions}
              listLoading={listLoading}
              listError={listError}
              demoMode={demoMode}
            />

            {ngChoice !== DEMO_OPTION_VALUE ? (
              <p className="text-xs font-mono text-muted-foreground">
                Showing: <span className="text-foreground">{ngChoice}</span> ·{" "}
                {ngLoading ? (
                  <span className="text-amber-600 dark:text-amber-400">loading…</span>
                ) : ngError ? (
                  <span className="text-destructive">{ngError}</span>
                ) : (
                  <span>{ngSeq.length} aa</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Built-in demo · {DEMO_SEQUENCE.length} aa — mock bars (no Petadex accession to map).
              </p>
            )}

            <EnrichmentNotes
              pack={ngEnrich}
              isDemo={ngChoice === DEMO_OPTION_VALUE}
            />

            {showNgPlddt ? (
              <PlddtLegend className="mb-1" />
            ) : null}

            <NightingaleProteinPanel
              key={`ng-${ngChoice}`}
              sequence={ngError ? "" : ngSeq}
              trackPayloads={ngTrackPayloads}
              enrichmentLoading={ngEnrich.loading}
            />
          </section>

          <section className="flex flex-col gap-3">
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
              <ul className="mt-3 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>
                  Same pLDDT strip and UniProt tracks as Nightingale (coloured confidence bands).
                </li>
                <li>Overview ruler + zoom toolbar above the tracks (no in-panel brush zoom).</li>
              </ul>
            </div>

            <ProteinSelector
              idPrefix="fv"
              label="Protein for feature-viewer"
              value={fvChoice}
              onChange={setFvChoice}
              accessions={selectorAccessions}
              listLoading={listLoading}
              listError={listError}
              demoMode={demoMode}
            />

            {fvChoice !== DEMO_OPTION_VALUE ? (
              <p className="text-xs font-mono text-muted-foreground">
                Showing: <span className="text-foreground">{fvChoice}</span> ·{" "}
                {fvLoading ? (
                  <span className="text-amber-600 dark:text-amber-400">loading…</span>
                ) : fvError ? (
                  <span className="text-destructive">{fvError}</span>
                ) : (
                  <span>{fvSeq.length} aa</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Built-in demo · {DEMO_SEQUENCE.length} aa — mock bars (no Petadex accession to map).
              </p>
            )}

            <EnrichmentNotes
              pack={fvEnrich}
              isDemo={fvChoice === DEMO_OPTION_VALUE}
            />

            {showFvPlddt ? (
              <PlddtLegend className="mb-1" />
            ) : null}

            <FeatureViewerPanel
              key={`fv-${fvChoice}`}
              sequence={fvError ? "" : fvSeq}
              rectTrackDefs={fvRectDefs}
              enrichmentLoading={fvEnrich.loading}
            />
          </section>
        </div>
      </Container>
    </div>
  )
}

export default ProteinViewerPrototypePage

export const Head = () => (
  <Seo
    title="Protein viewer prototype"
    description="Temporary comparison of Nightingale vs feature-viewer for protein annotations."
  />
)

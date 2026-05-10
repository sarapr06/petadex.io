/**
 * Temporary route for comparing protein feature viewers (remove when done).
 * URL: /protein-viewer-prototype/
 */
import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import {
  DEMO_SEQUENCE,
  featureViewerDefsFromLogicalTracks,
  logicalTracksForSequenceLength,
  nightingalePayloadFromLogicalTracks,
} from "../components/proteinViewerPrototype/mockProteinData.js"
import NightingaleProteinPanel from "../components/proteinViewerPrototype/NightingaleProteinPanel.jsx"
import FeatureViewerPanel from "../components/proteinViewerPrototype/FeatureViewerPanel.jsx"
import ProteinSelector, {
  DEMO_OPTION_VALUE,
} from "../components/proteinViewerPrototype/ProteinSelector.jsx"
import { resolveEnrichmentAccession } from "../components/proteinViewerPrototype/enrichment/resolveUniProt.js"
import {
  loadEnrichmentPayload,
  logicalTracksHaveFeatures,
} from "../components/proteinViewerPrototype/enrichment/interproAlphaFoldData.js"

const DISPLAY_MODE_STORAGE_KEY = "petadex-protein-viewer-display-mode"

function initialDisplayMode() {
  if (typeof window === "undefined") return "summary"
  const v = window.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY)
  return v === "full" ? "full" : "summary"
}

const ProteinViewerPrototypePage = () => {
  const [accessions, setAccessions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [displayMode, setDisplayMode] = useState(initialDisplayMode)

  const [ngChoice, setNgChoice] = useState(DEMO_OPTION_VALUE)
  const [fvChoice, setFvChoice] = useState(DEMO_OPTION_VALUE)
  const [ngSeq, setNgSeq] = useState(DEMO_SEQUENCE)
  const [fvSeq, setFvSeq] = useState(DEMO_SEQUENCE)
  const [ngLoading, setNgLoading] = useState(false)
  const [fvLoading, setFvLoading] = useState(false)
  const [ngError, setNgError] = useState(null)
  const [fvError, setFvError] = useState(null)

  const [ngManualUniProt, setNgManualUniProt] = useState("")
  const [fvManualUniProt, setFvManualUniProt] = useState("")
  const [ngAutoMap, setNgAutoMap] = useState(false)
  const [fvAutoMap, setFvAutoMap] = useState(false)

  const deferredNgManual = useDeferredValue(ngManualUniProt.trim())
  const deferredFvManual = useDeferredValue(fvManualUniProt.trim())

  const [ngEnrich, setNgEnrich] = useState({
    loading: false,
    logicalTracks: logicalTracksForSequenceLength(DEMO_SEQUENCE.length),
    lineData: null,
    resolvedAccession: null,
    resolveMethod: "",
    resolveDetail: "",
    alphaFoldMessage: null,
    uniProtMessage: null,
    usingMockTracks: true,
  })

  const [fvEnrich, setFvEnrich] = useState({
    loading: false,
    logicalTracks: logicalTracksForSequenceLength(DEMO_SEQUENCE.length),
    lineData: null,
    resolvedAccession: null,
    resolveMethod: "",
    resolveDetail: "",
    alphaFoldMessage: null,
    uniProtMessage: null,
    usingMockTracks: true,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, displayMode)
  }, [displayMode])

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

  useEffect(() => {
    let cancelled = false
    if (!ngSeq.length || ngLoading) return

    setNgEnrich(prev => ({ ...prev, loading: true }))

    ;(async () => {
      const mock = logicalTracksForSequenceLength(ngSeq.length)
      try {
        const resolve = await resolveEnrichmentAccession({
          petadexAccession:
            ngChoice === DEMO_OPTION_VALUE ? "" : ngChoice,
          manualUniProtInput: deferredNgManual,
          autoMap: ngAutoMap,
        })

        const payload = resolve.accession
          ? await loadEnrichmentPayload({
              uniProtAccession: resolve.accession,
              sequenceLength: ngSeq.length,
              displayMode,
            })
          : {
              uniProtUsed: null,
              logicalTracks: [],
              lineData: null,
              alphaFoldMessage: null,
              uniProtMessage: null,
            }

        const hasReal = logicalTracksHaveFeatures(payload.logicalTracks)
        const logical = hasReal ? payload.logicalTracks : mock

        if (!cancelled) {
          setNgEnrich({
            loading: false,
            logicalTracks: logical,
            lineData: payload.lineData,
            resolvedAccession: resolve.accession,
            resolveMethod: resolve.method,
            resolveDetail: resolve.detail,
            alphaFoldMessage: payload.alphaFoldMessage,
            uniProtMessage: payload.uniProtMessage,
            usingMockTracks: !hasReal,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setNgEnrich({
            loading: false,
            logicalTracks: mock,
            lineData: null,
            resolvedAccession: null,
            resolveMethod: "error",
            resolveDetail: e?.message || String(e),
            alphaFoldMessage: null,
            uniProtMessage: null,
            usingMockTracks: true,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    ngSeq,
    ngLoading,
    ngChoice,
    deferredNgManual,
    ngAutoMap,
    displayMode,
  ])

  useEffect(() => {
    let cancelled = false
    if (!fvSeq.length || fvLoading) return

    setFvEnrich(prev => ({ ...prev, loading: true }))

    ;(async () => {
      const mock = logicalTracksForSequenceLength(fvSeq.length)
      try {
        const resolve = await resolveEnrichmentAccession({
          petadexAccession:
            fvChoice === DEMO_OPTION_VALUE ? "" : fvChoice,
          manualUniProtInput: deferredFvManual,
          autoMap: fvAutoMap,
        })

        const payload = resolve.accession
          ? await loadEnrichmentPayload({
              uniProtAccession: resolve.accession,
              sequenceLength: fvSeq.length,
              displayMode,
            })
          : {
              uniProtUsed: null,
              logicalTracks: [],
              lineData: null,
              alphaFoldMessage: null,
              uniProtMessage: null,
            }

        const hasReal = logicalTracksHaveFeatures(payload.logicalTracks)
        const logical = hasReal ? payload.logicalTracks : mock

        if (!cancelled) {
          setFvEnrich({
            loading: false,
            logicalTracks: logical,
            lineData: payload.lineData,
            resolvedAccession: resolve.accession,
            resolveMethod: resolve.method,
            resolveDetail: resolve.detail,
            alphaFoldMessage: payload.alphaFoldMessage,
            uniProtMessage: payload.uniProtMessage,
            usingMockTracks: !hasReal,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setFvEnrich({
            loading: false,
            logicalTracks: mock,
            lineData: null,
            resolvedAccession: null,
            resolveMethod: "error",
            resolveDetail: e?.message || String(e),
            alphaFoldMessage: null,
            uniProtMessage: null,
            usingMockTracks: true,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    fvSeq,
    fvLoading,
    fvChoice,
    deferredFvManual,
    fvAutoMap,
    displayMode,
  ])

  const ngTrackPayloads = useMemo(
    () => nightingalePayloadFromLogicalTracks(ngEnrich.logicalTracks),
    [ngEnrich.logicalTracks],
  )

  const fvRectDefs = useMemo(
    () => featureViewerDefsFromLogicalTracks(fvEnrich.logicalTracks),
    [fvEnrich.logicalTracks],
  )

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
            ). <strong className="text-foreground">Annotations</strong> below optionally use a{" "}
            <strong className="text-foreground">UniProt accession</strong> you enter, or a
            best-effort GenBank→UniProt mapping (
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://www.uniprot.org/help/id_mapping"
              target="_blank"
              rel="noreferrer noopener"
            >
              UniProt ID mapping
            </a>
            ), then{" "}
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
            pLDDT — without touching global Petadex IDs. UX reference:{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://interpro-documentation.readthedocs.io/en/latest/protein_viewer.html"
              target="_blank"
              rel="noreferrer noopener"
            >
              InterPro protein viewer (docs)
            </a>
            , example protein{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://www.ebi.ac.uk/interpro/protein/UniProt/A0A002/#table"
              target="_blank"
              rel="noreferrer noopener"
            >
              A0A002
            </a>
            . InterPro-N-only display modes from those docs are{" "}
            <strong className="text-foreground">not</strong> reproduced here unless we later add
            InterPro-N-specific data.
          </p>
        </header>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 mb-10 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">Feature display</span>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${
                displayMode === "summary"
                  ? "bg-accent text-accent-foreground"
                  : "bg-background hover:bg-muted"
              }`}
              onClick={() => setDisplayMode("summary")}
            >
              Summary
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm border-l border-border ${
                displayMode === "full"
                  ? "bg-accent text-accent-foreground"
                  : "bg-background hover:bg-muted"
              }`}
              onClick={() => setDisplayMode("full")}
            >
              Full
            </button>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Summary trims long UniProt feature lists (longest segments first). Preference is saved
            in localStorage for this page.
          </p>
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
                  Tracks (after pLDDT): Families/regions · Domains/repeats · Motifs/sites — from
                  UniProt when mapping succeeds; otherwise scaled mock bars.
                </li>
                <li>pLDDT line requires AlphaFold confidence length to match the Petadex sequence.</li>
              </ul>
            </div>

            <ProteinSelector
              idPrefix="ng"
              label="Protein for Nightingale"
              value={ngChoice}
              onChange={setNgChoice}
              accessions={accessions}
              listLoading={listLoading}
              listError={listError}
            />

            <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2">
              <label className="text-xs font-medium text-foreground" htmlFor="ng-uniprot-override">
                UniProt accession for tracks / pLDDT (optional)
              </label>
              <input
                id="ng-uniprot-override"
                className="input w-full font-mono text-sm"
                placeholder="e.g. A0A002 — overrides mapping when set"
                value={ngManualUniProt}
                onChange={e => setNgManualUniProt(e.target.value)}
                autoComplete="off"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={ngAutoMap}
                  onChange={e => setNgAutoMap(e.target.checked)}
                />
                Try UniProt ID mapping from the Petadex accession when the field above is empty
              </label>
            </div>

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
                Demo sequence · {DEMO_SEQUENCE.length} aa — enter UniProt above for real tracks.
              </p>
            )}

            <EnrichmentNotes pack={ngEnrich} />

            <NightingaleProteinPanel
              key={`ng-${ngChoice}`}
              sequence={ngError ? "" : ngSeq}
              trackPayloads={ngTrackPayloads}
              linegraphData={ngEnrich.lineData}
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
                <li>Same enrichment inputs as Nightingale; rects + optional pLDDT line.</li>
                <li>D3 brush zoom + toolbar (no Nightingale navigation zoom).</li>
              </ul>
            </div>

            <ProteinSelector
              idPrefix="fv"
              label="Protein for feature-viewer"
              value={fvChoice}
              onChange={setFvChoice}
              accessions={accessions}
              listLoading={listLoading}
              listError={listError}
            />

            <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2">
              <label className="text-xs font-medium text-foreground" htmlFor="fv-uniprot-override">
                UniProt accession for tracks / pLDDT (optional)
              </label>
              <input
                id="fv-uniprot-override"
                className="input w-full font-mono text-sm"
                placeholder="e.g. A0A002 — overrides mapping when set"
                value={fvManualUniProt}
                onChange={e => setFvManualUniProt(e.target.value)}
                autoComplete="off"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={fvAutoMap}
                  onChange={e => setFvAutoMap(e.target.checked)}
                />
                Try UniProt ID mapping from the Petadex accession when the field above is empty
              </label>
            </div>

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
                Demo sequence · {DEMO_SEQUENCE.length} aa — enter UniProt above for real tracks.
              </p>
            )}

            <EnrichmentNotes pack={fvEnrich} />

            <FeatureViewerPanel
              key={`fv-${fvChoice}`}
              sequence={fvError ? "" : fvSeq}
              rectTrackDefs={fvRectDefs}
              lineData={fvEnrich.lineData}
              enrichmentLoading={fvEnrich.loading}
            />
          </section>
        </div>
      </Container>
    </div>
  )
}

function EnrichmentNotes({ pack }) {
  const lines = []
  if (pack.resolveMethod === "manual" && pack.resolvedAccession) {
    lines.push(`UniProt for enrichment: ${pack.resolvedAccession} (manual).`)
  } else if (pack.resolveMethod === "idmapping" && pack.resolvedAccession) {
    lines.push(`UniProt for enrichment: ${pack.resolvedAccession} (ID mapping).`)
  } else if (pack.resolveMethod === "direct" && pack.resolvedAccession) {
    lines.push(`UniProt for enrichment: ${pack.resolvedAccession} (accession looks like UniProt).`)
  } else if (pack.resolveMethod === "cache" && pack.resolvedAccession) {
    lines.push(`UniProt for enrichment: ${pack.resolvedAccession} (cached mapping).`)
  } else if (pack.resolveMethod === "off") {
    lines.push("Enrichment off: enable mapping or enter UniProt.")
  } else if (pack.resolveMethod === "manual-invalid") {
    lines.push(`UniProt field invalid: ${pack.resolveDetail}`)
  } else if (pack.resolveMethod === "failed" || pack.resolveMethod === "none") {
    lines.push(`No UniProt mapping — ${pack.resolveDetail || "mock bars only"}.`)
  } else if (pack.resolveMethod === "error") {
    lines.push(`Enrichment error — ${pack.resolveDetail}`)
  }

  if (pack.usingMockTracks && pack.resolvedAccession) {
    lines.push(
      "No UniProt features matched — showing scaled mock rectangles (same as demo proportions).",
    )
  } else if (pack.usingMockTracks && !pack.resolvedAccession) {
    lines.push("Showing mock annotation bars (scaled to sequence length).")
  }

  if (pack.uniProtMessage) lines.push(pack.uniProtMessage)
  if (pack.alphaFoldMessage) lines.push(pack.alphaFoldMessage)

  if (!lines.length) return null

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
      {lines.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
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

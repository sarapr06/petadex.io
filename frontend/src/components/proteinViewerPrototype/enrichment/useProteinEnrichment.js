import { useDeferredValue, useEffect, useState } from "react"
import { logicalTracksForSequenceLength } from "../mockProteinData.js"
import { mockPlddtScores } from "../plddtConfidence.js"
import { resolveEnrichmentAccession } from "./resolveUniProt.js"
import {
  loadEnrichmentPayload,
  logicalTracksHaveFeatures,
} from "./interproAlphaFoldData.js"

/**
 * @param {number} sequenceLength
 * @param {boolean} isDemo
 */
function emptyEnrichmentState(sequenceLength, isDemo) {
  const len = Math.max(1, sequenceLength || 1)
  return {
    loading: false,
    logicalTracks: logicalTracksForSequenceLength(len),
    lineData: null,
    plddtScores: isDemo ? mockPlddtScores(len) : null,
    resolvedAccession: null,
    resolveMethod: "",
    resolveDetail: "",
    alphaFoldMessage: null,
    uniProtMessage: null,
    usingMockTracks: true,
    usingMockPlddt: isDemo,
  }
}

/**
 * Resolve UniProt accession (always-on ID mapping when Petadex accession is set),
 * load UniProt feature tracks + AlphaFold pLDDT, fall back to scaled mock tracks.
 *
 * @param {{
 *   petadexAccession: string,
 *   sequence: string,
 *   sequenceLoading: boolean,
 *   manualUniProtInput?: string,
 *   isDemo?: boolean,
 *   autoMap?: boolean,
 * }} opts
 */
export function useProteinEnrichment({
  petadexAccession,
  sequence,
  sequenceLoading,
  manualUniProtInput = "",
  isDemo = false,
  autoMap = true,
}) {
  const deferredManual = useDeferredValue((manualUniProtInput || "").trim())
  const [enrich, setEnrich] = useState(() =>
    emptyEnrichmentState(sequence?.length ?? 1, isDemo),
  )

  useEffect(() => {
    let cancelled = false

    if (sequenceLoading || !sequence?.length) {
      if (!sequenceLoading && !sequence?.length) {
        setEnrich(prev => ({ ...prev, loading: false }))
      }
      return
    }

    setEnrich(prev => ({ ...prev, loading: true }))

    ;(async () => {
      const mock = logicalTracksForSequenceLength(sequence.length)
      try {
        const resolve = await resolveEnrichmentAccession({
          petadexAccession: petadexAccession || "",
          manualUniProtInput: deferredManual,
          autoMap,
        })

        const payload = resolve.accession
          ? await loadEnrichmentPayload({
              uniProtAccession: resolve.accession,
              sequenceLength: sequence.length,
            })
          : {
              uniProtUsed: null,
              logicalTracks: [],
              lineData: null,
              plddtScores: null,
              alphaFoldMessage: null,
              uniProtMessage: null,
            }

        const hasReal = logicalTracksHaveFeatures(payload.logicalTracks)
        const logical = hasReal ? payload.logicalTracks : mock
        const mockPlddt = !payload.plddtScores?.length && isDemo
        const plddtScores = payload.plddtScores?.length
          ? payload.plddtScores
          : mockPlddt
            ? mockPlddtScores(sequence.length)
            : null

        if (!cancelled) {
          setEnrich({
            loading: false,
            logicalTracks: logical,
            lineData: payload.lineData,
            plddtScores,
            resolvedAccession: resolve.accession,
            resolveMethod: resolve.method,
            resolveDetail: resolve.detail,
            alphaFoldMessage: payload.alphaFoldMessage,
            uniProtMessage: payload.uniProtMessage,
            usingMockTracks: !hasReal,
            usingMockPlddt: mockPlddt,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setEnrich({
            loading: false,
            logicalTracks: mock,
            lineData: null,
            plddtScores: isDemo ? mockPlddtScores(sequence.length) : null,
            resolvedAccession: null,
            resolveMethod: "error",
            resolveDetail: e?.message || String(e),
            alphaFoldMessage: null,
            uniProtMessage: null,
            usingMockTracks: true,
            usingMockPlddt: isDemo,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    sequence,
    sequenceLoading,
    petadexAccession,
    deferredManual,
    autoMap,
    isDemo,
  ])

  return enrich
}

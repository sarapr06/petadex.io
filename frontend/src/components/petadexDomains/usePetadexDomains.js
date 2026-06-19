import { useEffect, useState } from "react"
import config from "../../config"

const EMPTY_LOGICAL_TRACKS = []

/**
 * @typedef {{
 *   orfId: number,
 *   sequence: string,
 *   sequenceLength: number,
 *   syntheticSequence?: boolean,
 *   sequenceSource?: string,
 *   logicalTracks: Array<{
 *     id: string,
 *     title: string,
 *     features: Array<{ label: string, start: number, end: number, color: string }>,
 *   }>,
 *   meta?: {
 *     domainCount?: number,
 *     motifCount?: number,
 *     signalCount?: number,
 *     tables?: string[],
 *   },
 * }} PetadexDomainsPayload
 */

/**
 * Load Petadex catalytic-domain tracks from petadex_catalytic_domains (+ signal).
 *
 * @param {{
 *   orfId?: number | null,
 *   enzymeId?: number | null,
 *   accession?: string | null,
 *   enabled?: boolean,
 * }} options
 */
export function usePetadexDomains({
  orfId,
  enzymeId,
  accession,
  enabled = true,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(/** @type {PetadexDomainsPayload | null} */ (null))
  /** True when the API resolved no ORF/sequence at all (HTTP 404). */
  const [notFound, setNotFound] = useState(false)

  const resolvedId = orfId ?? enzymeId ?? null
  const acc = String(accession || "").trim()

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setPayload(null)
      setNotFound(false)
      return
    }

    const hasId = Number.isInteger(resolvedId) && resolvedId > 0
    if (!hasId && !acc) {
      setLoading(false)
      setError(null)
      setPayload(null)
      setNotFound(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPayload(null)
    setNotFound(false)

    const url = hasId
      ? `${config.apiUrl}/petadex-domains/${encodeURIComponent(String(resolvedId))}`
      : `${config.apiUrl}/petadex-domains/by-accession/${encodeURIComponent(acc)}`

    fetch(url)
      .then(async r => {
        if (r.status === 404) {
          return { notFound: true, data: null }
        }
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`)
        }
        return { notFound: false, data: await r.json() }
      })
      .then(({ notFound: nf, data }) => {
        if (cancelled) return
        setNotFound(nf)
        setPayload(data)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || String(err))
          setPayload(null)
          setNotFound(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, resolvedId, acc])

  const logicalTracks = payload?.logicalTracks ?? EMPTY_LOGICAL_TRACKS

  return {
    loading,
    error,
    notFound,
    orfId: payload?.orfId ?? (hasResolvedId(resolvedId) ? resolvedId : null),
    sequence: payload?.sequence ?? "",
    sequenceLength: payload?.sequenceLength ?? 0,
    logicalTracks,
    meta: payload?.meta ?? null,
    syntheticSequence: false,
    sequenceSource: payload?.sequenceSource ?? 'enzyme_fastaa',
    hasAnnotations: logicalTracks.length > 0,
  }
}

/** @param {unknown} id */
function hasResolvedId(id) {
  return Number.isInteger(id) && Number(id) > 0
}

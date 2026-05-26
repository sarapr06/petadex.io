import { useEffect, useState } from "react"
import config from "../../../config"

/**
 * @typedef {{
 *   orfId: number,
 *   sequence: string,
 *   sequenceLength: number,
 *   syntheticSequence?: boolean,
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
 * }} SaraViewerPayload
 */

/**
 * Load Drylab sara_* annotation tables for one orf_id.
 *
 * @param {number} orfId
 * @param {boolean} enabled
 */
export function useSaraViewer(orfId, enabled) {
  const [orfIds, setOrfIds] = useState([1])
  const [orfListLoading, setOrfListLoading] = useState(false)
  const [orfListError, setOrfListError] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sequence, setSequence] = useState("")
  const [logicalTracks, setLogicalTracks] = useState([])
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setOrfListLoading(true)
    setOrfListError(null)
    fetch(`${config.apiUrl}/sara-viewer`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        const ids = Array.isArray(data?.orfIds) ? data.orfIds : [1]
        setOrfIds(ids.length ? ids : [1])
      })
      .catch(err => {
        if (!cancelled) {
          setOrfListError(err.message || String(err))
          setOrfIds([1])
        }
      })
      .finally(() => {
        if (!cancelled) setOrfListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setSequence("")
      setLogicalTracks([])
      setMeta(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setSequence("")
    setLogicalTracks([])
    setMeta(null)

    fetch(`${config.apiUrl}/sara-viewer/${encodeURIComponent(String(orfId))}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(
            r.status === 404 ? `Not found: orf_id ${orfId}` : `HTTP ${r.status}`,
          )
        }
        return r.json()
      })
      .then((/** @type {SaraViewerPayload} */ data) => {
        if (cancelled) return
        const s = data.sequence
        if (typeof s !== "string" || !s.length) {
          throw new Error("Empty or invalid sequence in API response")
        }
        setSequence(s)
        setLogicalTracks(Array.isArray(data.logicalTracks) ? data.logicalTracks : [])
        setMeta(data.meta ?? null)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || String(err))
          setSequence("")
          setLogicalTracks([])
          setMeta(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, orfId])

  return {
    orfIds,
    orfListLoading,
    orfListError,
    loading,
    error,
    sequence,
    logicalTracks,
    meta,
  }
}

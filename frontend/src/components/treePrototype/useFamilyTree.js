import { useEffect, useState } from "react"
import config from "../../config"

/** @param {unknown} err @param {string} url */
function formatFetchError(err, url) {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg === "Failed to fetch" || err instanceof TypeError) {
    return `Cannot reach API at ${url}. Start the backend: cd backend && npm run dev`
  }
  return msg
}

/**
 * @typedef {{
 *   family_id: number,
 *   centroid_accession?: string,
 *   variant_count?: number,
 *   component_count?: number,
 *   avg_identity?: number,
 * }} FamilySummary
 */

/**
 * Fetch Newick text for a family from S3 via the backend proxy.
 * @param {number} familyId
 * @param {boolean} enabled
 */
export function useFamilyTree(familyId, enabled) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newick, setNewick] = useState("")

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setNewick("")
      return
    }

    const id = Number(familyId)
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false)
      setError("Enter a valid family ID (positive integer).")
      setNewick("")
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setNewick("")

    const url = `${config.apiUrl}/family/${id}/tree`

    fetch(url)
      .then(async r => {
        if (!r.ok) {
          const body = await r.text()
          let msg = `HTTP ${r.status}`
          try {
            const j = JSON.parse(body)
            if (j.error) msg = j.error
          } catch {
            if (body) msg = body.slice(0, 200)
          }
          throw new Error(msg)
        }
        return r.text()
      })
      .then(text => {
        if (cancelled) return
        const trimmed = text.trim()
        if (!trimmed) throw new Error("Empty tree response from API")
        setNewick(trimmed)
      })
      .catch(err => {
        if (!cancelled) {
          setError(formatFetchError(err, url))
          setNewick("")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [familyId, enabled])

  return { loading, error, newick }
}

/**
 * @param {number} familyId
 * @param {boolean} enabled
 */
export function useFamilySummary(familyId, enabled) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(/** @type {FamilySummary | null} */ (null))

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setSummary(null)
      return
    }

    const id = Number(familyId)
    if (!Number.isFinite(id) || id <= 0) {
      setSummary(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${config.apiUrl}/family/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? `Family ${id} not found` : `HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        setSummary(data)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || String(err))
          setSummary(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [familyId, enabled])

  return { loading, error, summary }
}

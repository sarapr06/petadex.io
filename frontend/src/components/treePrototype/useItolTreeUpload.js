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
 * Upload Newick to iTOL via backend proxy; returns interactive viewer URL.
 * @param {boolean} enabled
 * @param {string} newick
 * @param {{ treeName?: string, familyId?: number }} [options]
 */
export function useItolTreeUpload(enabled, newick, options = {}) {
  const { treeName, familyId } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [treeId, setTreeId] = useState(null)
  const [viewerUrl, setViewerUrl] = useState(null)
  const [uploadMs, setUploadMs] = useState(null)

  useEffect(() => {
    if (!enabled || !newick?.trim()) {
      setLoading(false)
      setError(null)
      setTreeId(null)
      setViewerUrl(null)
      setUploadMs(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setTreeId(null)
    setViewerUrl(null)
    setUploadMs(null)

    const url = `${config.apiUrl}/family/tree/itol-upload`
    const body = {
      newick: newick.trim(),
      ...(treeName ? { treeName } : {}),
      ...(familyId != null && Number.isFinite(Number(familyId)) ? { familyId: Number(familyId) } : {}),
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async r => {
        const uploadMsHeader = r.headers.get("X-Upload-Ms")
        if (uploadMsHeader) {
          const ms = Number(uploadMsHeader)
          if (Number.isFinite(ms)) setUploadMs(ms)
        }
        const payload = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(typeof payload.error === "string" ? payload.error : `HTTP ${r.status}`)
        }
        return payload
      })
      .then(data => {
        if (cancelled) return
        if (!data.viewerUrl || !data.treeId) {
          throw new Error("Invalid iTOL upload response from API")
        }
        setTreeId(String(data.treeId))
        setViewerUrl(String(data.viewerUrl))
        if (data.uploadMs != null) setUploadMs(Number(data.uploadMs))
      })
      .catch(err => {
        if (!cancelled) {
          setError(formatFetchError(err, url))
          setTreeId(null)
          setViewerUrl(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, newick, treeName, familyId])

  return { loading, error, treeId, viewerUrl, uploadMs }
}

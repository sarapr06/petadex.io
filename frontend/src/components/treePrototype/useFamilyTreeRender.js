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
 * Fetch server-rendered SVG for a family tree (ETE3 or Biopython).
 * @param {number} familyId
 * @param {"ete" | "biopython"} engine
 * @param {boolean} enabled
 * @param {{ newick?: string, eteLayout?: "rectangular" | "radial" }} [options]
 */
export function useFamilyTreeRender(familyId, engine, enabled, options = {}) {
  const { newick: newickOverride, eteLayout = "rectangular" } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [svg, setSvg] = useState("")
  const [renderMs, setRenderMs] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setSvg("")
      setRenderMs(null)
      return
    }

    const id = Number(familyId)
    const usePost = Boolean(newickOverride?.trim())

    if (!usePost && (!Number.isFinite(id) || id <= 0)) {
      setLoading(false)
      setError("Enter a valid family ID (positive integer).")
      setSvg("")
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setSvg("")
    setRenderMs(null)

    const url = usePost
      ? `${config.apiUrl}/family/tree/render-prototype`
      : `${config.apiUrl}/family/${id}/tree/render?engine=${engine}&format=svg${
          engine === "ete" ? `&eteLayout=${encodeURIComponent(eteLayout)}` : ""
        }`

    const request = usePost
      ? fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newick: newickOverride.trim(),
            engine,
            ...(engine === "ete" ? { eteLayout } : {}),
          }),
        })
      : fetch(url)

    request
      .then(async r => {
        const renderMsHeader = r.headers.get("X-Render-Ms")
        if (renderMsHeader) {
          const ms = Number(renderMsHeader)
          if (Number.isFinite(ms)) setRenderMs(ms)
        }
        if (!r.ok) {
          const body = await r.text()
          let msg = `HTTP ${r.status}`
          try {
            const j = JSON.parse(body)
            if (j.error) msg = j.error
          } catch {
            if (body) msg = body.slice(0, 300)
          }
          throw new Error(msg)
        }
        return r.text()
      })
      .then(text => {
        if (cancelled) return
        if (!text.trim()) throw new Error("Empty SVG response from API")
        setSvg(text.trim())
      })
      .catch(err => {
        if (!cancelled) {
          setError(formatFetchError(err, url))
          setSvg("")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [familyId, engine, enabled, newickOverride, eteLayout])

  return { loading, error, svg, renderMs }
}

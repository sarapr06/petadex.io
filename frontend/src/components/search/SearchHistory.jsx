import React, { useState, useEffect, useCallback } from "react"
import config from "../../config"
import { getStoredJobIds } from "../../utils/session"

const formatDate = timestamp => {
  const diffMs = Date.now() - new Date(timestamp)
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(timestamp).toLocaleDateString()
}

const SearchHistory = ({ onSelectSearch, currentJobId, newSearchCount }) => {
  const [searches, setSearches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const searchApiUrl = process.env.GATSBY_SEARCH_API_URL || config.apiUrl

  const fetchHistory = useCallback(async () => {
    const jobIds = getStoredJobIds()
    if (!jobIds.length) {
      setSearches([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `${searchApiUrl}/search/history?job_ids=${jobIds.join(",")}&limit=20`,
      )
      if (!res.ok) throw new Error("Failed to fetch search history")
      const data = await res.json()
      setSearches(data.searches || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      setSearches([])
    } finally {
      setLoading(false)
    }
  }, [searchApiUrl])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    if (newSearchCount === 0) return
    const t = setTimeout(fetchHistory, 1000)
    return () => clearTimeout(t)
  }, [newSearchCount, fetchHistory])

  // Render nothing until we know there's something to show
  if ((loading && searches.length === 0) || error || searches.length === 0) {
    return null
  }

  const displayed = expanded ? searches : searches.slice(0, 5)

  return (
    <div className="mt-8 bg-surface-raised border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Searches
        </h3>
        <button
          onClick={fetchHistory}
          className="text-xs text-muted-foreground hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0"
        >
          Refresh
        </button>
      </div>

      {/* List */}
      <ul className="space-y-1.5 list-none p-0 m-0">
        {displayed.map(search => {
          const isActive = currentJobId === search.session_id
          return (
            <li
              key={search.job_id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSearch(search.session_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectSearch(search.session_id)
                }
              }}
              className={[
                "flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                isActive
                  ? "border-accent bg-accent-subtle"
                  : "border-border bg-background hover:border-accent hover:bg-accent-subtle/50",
              ].join(" ")}
            >
              {/* Left — time + length */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-muted-foreground">
                  {formatDate(search.timestamp)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {search.query_length
                    ? `${search.query_length} aa`
                    : "Unknown length"}
                </span>
              </div>

              {/* Right — hit count + top hit */}
              <div className="text-right shrink-0 ml-4">
                <div className="text-xs font-semibold text-foreground">
                  {search.num_results} hits
                </div>
                {search.top_hit && (
                  <div className="text-2xs text-muted-foreground font-mono">
                    {search.top_hit.target_id} (
                    {search.top_hit.percent_identity?.toFixed(1)}%)
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Show more / less */}
      {searches.length > 5 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 w-full py-2 text-xs text-muted-foreground border border-dashed border-border rounded-lg hover:border-accent hover:text-accent transition-colors bg-transparent cursor-pointer"
        >
          {expanded ? "Show less" : `Show ${searches.length - 5} more`}
        </button>
      )}
    </div>
  )
}

export default SearchHistory

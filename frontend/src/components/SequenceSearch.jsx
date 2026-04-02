/**
 * SequenceSearch Component – src/components/SequenceSearch.jsx
 *
 * Input form only. On submit navigates to /results?job={sessionId}
 * All polling and result rendering lives in pages/results.js.
 */
import React, { useState } from "react"
import { navigate } from "gatsby"
import config from "../config"
import ExampleCards from "./ExampleCards"
import SearchHistory from "./SearchHistory"
import { cleanSequence } from "../utils/lib"

const EXAMPLE_SEQUENCES = {
  isPETase: `>IsPETase (WP_054022242.1)
MNFPRASRLMQAAVLGGLMAVSAAATAQTNPYARGPNPTAASLEASAGPFTVRSFTVSRPSGYGAGTVYYPTNAGGTVGAIAIVPGYTARQSSIKWWGPRLASHGFVVITIDTNSTLDQPSSRSSQQMAALRQVASLNGTSSSPIYGKVDTARMGVMGWSMGGGGSLISAANNPSLKAAAPQAPWDSSTNFSSVTVPTLIFACENDSIAPVNSSALPIYDSMSRNAKQFLEINGGSHSCANSGNSNQALIGKKGVAWMKRFMDNDTRYSTFACENPNSTRVSDFRTANCS`,
}

const SequenceSearch = () => {
  const [sequence, setSequence] = useState("")
  const [maxResults, setMaxResults] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const searchApiUrl = process.env.GATSBY_SEARCH_API_URL || config.apiUrl

  const submitSearch = async () => {
    const clean = cleanSequence(sequence)
    if (!clean || clean.length < 10) {
      setError(
        "Please enter a valid protein sequence (at least 10 amino acids).",
      )
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch(`${searchApiUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence, max_results: maxResults }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`)
      }

      navigate(`/results?job=${data.session_id}`)
    } catch (err) {
      setError(err.message || "Failed to submit search. Please try again.")
      setSubmitting(false)
    }
  }

  const loadExample = name => {
    setSequence(EXAMPLE_SEQUENCES[name])
    setError(null)
  }

  const isSearchDisabled =
    submitting || sequence.replace(/^>.*\n?/gm, "").trim().length < 10

  return (
    <div className="w-full space-y-4">
      <ExampleCards
        onSelectExample={sid => window.open(`/results?job=${sid}`, "_blank")}
        disabled={submitting}
      />

      {/* Textarea */}
      <div className="space-y-1.5">
        <textarea
          className={[
            "w-full min-h-[150px] resize-y",
            "font-mono text-sm text-foreground",
            "bg-background border border-input rounded-lg px-3 py-2.5",
            "placeholder:text-muted-foreground",
            "transition-colors duration-fast",
            "focus:outline-none focus:border-ring",
            submitting ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
          style={{
            boxShadow: "none",
          }}
          onFocus={e => {
            e.currentTarget.style.boxShadow = `0 0 0 3px oklch(from var(--ring) l c h / 0.2)`
            e.currentTarget.style.borderColor = "var(--ring)"
          }}
          onBlur={e => {
            e.currentTarget.style.boxShadow = "none"
            e.currentTarget.style.borderColor = "var(--input)"
          }}
          placeholder={">Header (optional)\nPASTE_SEQUENCE_HERE..."}
          value={sequence}
          onChange={e => {
            const val = e.target.value
            setSequence(val.startsWith(">") ? val : `>${val}`)
            setError(null)
          }}
          disabled={submitting}
        />

        {/* Load example */}
        <p className="text-sm text-muted-foreground">
          Load example:{" "}
          <button
            onClick={() => loadExample("isPETase")}
            className="text-accent hover:text-accent-hover hover:underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer text-sm font-medium transition-colors"
          >
            IsPETase
          </button>
        </p>
      </div>

      {/* Options row */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-foreground">
          Max results:
          <select
            value={maxResults}
            onChange={e => setMaxResults(parseInt(e.target.value, 10))}
            disabled={submitting}
            className="bg-background border border-input text-foreground text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-ring disabled:opacity-60 transition-colors"
          >
            {[10, 25, 50, 100, 250].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Submit */}
      <button
        onClick={submitSearch}
        disabled={isSearchDisabled}
        className={[
          "btn btn-primary min-w-[120px] justify-center",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {submitting && (
          <span className="w-4 h-4 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" />
        )}
        {submitting ? "Submitting…" : "Search"}
      </button>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          {error}
        </div>
      )}

      <SearchHistory
        onSelectSearch={sid => window.open(`/results?job=${sid}`, "_blank")}
        currentJobId={null}
        newSearchCount={0}
      />
    </div>
  )
}

export default SequenceSearch

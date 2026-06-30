// frontend/src/components/sequence/BareIdRedirect.jsx
//
// Fallback for /sequence/{id} where {id} is NOT a plain curated accession. Two
// shapes reach here (the page route guards on them):
//
//   1. Composite corpus header — a pipe-delimited DIAMOND subject id
//      (orf_id|genbank|library|contig|start|end|types), e.g.
//      "1|WP_054022242.1|||||". The orf_id is the first field and is
//      deterministic, so we redirect straight to /sequence/orf/{orf_id} with no
//      resolver round-trip. (These come from older shared/bookmarked search-result
//      links; current links already point at the canonical route.)
//
//   2. Bare all-digit id — an ambiguous prefix-less ORF id. Per "03 - Frontend
//      Wiring" (Route layer) it's classified via GET /api/resolve, then
//      redirected to its canonical prefixed URL. resolve stays OFF the hot path:
//      the prefixed corpus route (/sequence/orf/:id) never calls it.
//
// Curated accessions contain letters/dots and are NOT routed here, so the curated
// path stays completely undisturbed.
import React, { useEffect, useState } from "react"
import { navigate } from "gatsby"
import Container from "../common/Container"
import config from "../../config"
import { parseCorpusTargetId } from "../../utils/lib"

/**
 * @param {{ id: string }} props
 */
export default function BareIdRedirect({ id }) {
  const [status, setStatus] = useState("resolving") // resolving | notfound | error
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    const raw = String(id || "").trim()
    if (!raw) {
      setStatus("notfound")
      return
    }

    // ── Composite corpus header → deterministic orf_id, redirect directly. ──
    if (raw.includes("|")) {
      const parsed = parseCorpusTargetId(raw)
      if (parsed?.orfId) {
        navigate(`/sequence/orf/${encodeURIComponent(parsed.orfId)}`, {
          replace: true,
        })
        return
      }
      // No usable orf_id but an external accession is present → curated path.
      if (parsed?.accession) {
        navigate(`/sequence/${encodeURIComponent(parsed.accession)}`, {
          replace: true,
        })
        return
      }
      setStatus("notfound")
      return
    }

    // ── Bare all-digit id → classify via the resolver. ──
    let cancelled = false

    fetch(
      `${config.apiUrl}/resolve?q=${encodeURIComponent(raw)}&limit=1&offset=0`
    )
      .then(async res => {
        if (cancelled) return
        if (!res.ok) {
          setStatus("error")
          setErrorMsg(`Resolver error (${res.status})`)
          return
        }
        const data = await res.json()
        if (cancelled) return

        // A bare numeric id classifies as an ORF — send it to the canonical
        // corpus sequence page. `replace` so the bare URL doesn't linger in
        // history (back button skips the redirect hop).
        if (
          data.result_kind === "single" &&
          data.match_type === "orf_id" &&
          data.orf_id != null
        ) {
          navigate(`/sequence/orf/${data.orf_id}`, { replace: true })
          return
        }

        // Library ids fan out to many ORFs — hand off to the resolver/search UX
        // rather than guessing a single sequence page.
        if (data.result_kind === "list" && data.library_id) {
          navigate(`/search?q=${encodeURIComponent(data.library_id)}`, {
            replace: true,
          })
          return
        }

        // The bare id might simply be the orf_id even if the resolver has no
        // index row for it — fall back to the canonical corpus route, which
        // surfaces its own "ORF not found" if the ORF truly doesn't exist.
        navigate(`/sequence/orf/${encodeURIComponent(raw)}`, { replace: true })
      })
      .catch(err => {
        if (cancelled) return
        console.error("Bare-id resolve error:", err)
        // Network/resolver failure shouldn't strand a valid orf_id — try the
        // canonical corpus route directly.
        navigate(`/sequence/orf/${encodeURIComponent(raw)}`, { replace: true })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <Container className="py-20">
      {status === "resolving" && (
        <p className="text-muted-foreground italic">
          Resolving sequence <span className="font-mono">{id}</span>…
        </p>
      )}
      {status === "notfound" && (
        <>
          <h1 className="text-2xl font-bold text-primary">
            Sequence not found
          </h1>
          <p className="text-muted-foreground mt-2">
            No corpus or curated sequence resolved for id{" "}
            <span className="font-mono">{id}</span>.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground mt-2">{errorMsg}</p>
        </>
      )}
    </Container>
  )
}

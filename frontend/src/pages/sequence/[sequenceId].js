// src/pages/sequence/[sequenceId].js
//
// Curated/accession path (/sequence/:sequenceId). UNCHANGED behaviour for real
// accessions (which contain letters/dots, no pipes) — they render the curated
// template exactly as before.
//
// Added: a non-disruptive fallback for ids that are NOT curated accessions:
//   - a composite corpus header (pipe-delimited DIAMOND subject id, e.g.
//     "1|WP_054022242.1|||||" from older shared search-result links), or
//   - a prefix-less all-digit ORF id.
// Both are handed to BareIdRedirect, which redirects to the canonical prefixed
// URL (/sequence/orf/:id). See "03 - Frontend Wiring".
import React from "react"
import SequenceTemplate from "../../templates/sequence"
import BareIdRedirect from "../../components/sequence/BareIdRedirect"

// Anything that isn't a plain curated accession: a composite corpus header
// (contains "|") or a bare all-digit ORF id.
const needsRedirect = value => {
  const raw = String(value || "").trim()
  return raw.includes("|") || /^\d+$/.test(raw)
}

export default function SequencePage({ params }) {
  if (needsRedirect(params.sequenceId)) {
    return <BareIdRedirect id={String(params.sequenceId).trim()} />
  }
  return <SequenceTemplate pageContext={{ sequenceId: params.sequenceId }} />
}

export { Head } from "../../templates/sequence"

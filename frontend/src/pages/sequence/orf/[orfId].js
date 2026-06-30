// src/pages/sequence/orf/[orfId].js
//
// Client-only dynamic route /sequence/orf/:orfId — the corpus (307M-ORF) path.
// Discriminated from the curated/accession path (/sequence/:sequenceId) at the
// URL so the template never has to guess (see "03 - Frontend Wiring", Route
// layer). Forwards { orfId, kind: "corpus" } into the corpus template.
import React from "react"
import CorpusSequenceTemplate from "../../../templates/corpusSequence"

export default function CorpusSequencePage({ params }) {
  return (
    <CorpusSequenceTemplate
      pageContext={{ orfId: params.orfId, kind: "corpus" }}
    />
  )
}

export { Head } from "../../../templates/corpusSequence"

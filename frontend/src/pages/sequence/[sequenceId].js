import React from "react"
import SequenceTemplate from "../../templates/sequence"

export default function SequencePage({ params }) {
  return <SequenceTemplate pageContext={{ sequenceId: params.sequenceId }} />
}

export { Head } from "../../templates/sequence"

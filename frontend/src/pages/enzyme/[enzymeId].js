import React from "react"
import EnzymeTemplate from "../../templates/enzyme"

export default function EnzymePage({ params }) {
  return <EnzymeTemplate pageContext={{ enzymeId: params.enzymeId }} />
}

export { Head } from "../../templates/enzyme"

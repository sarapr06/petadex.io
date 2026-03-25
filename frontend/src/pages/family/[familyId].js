import React from "react"
import FamilyTemplate from "../../templates/family"

export default function FamilyPage({ params }) {
  return <FamilyTemplate pageContext={{ familyId: params.familyId }} />
}

export { Head } from "../../templates/family"

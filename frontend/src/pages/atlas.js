import React from "react"
import Seo from "../components/seo"
import AtlasMap from "../components/charts/AtlasMap"
import { parseAtlasQuery } from "../utils/atlasFocus"

const AtlasPage = ({ location }) => {
  const { focusComponent, focusCathDomain } = parseAtlasQuery(location?.search)

  return (
    <div style={{ position: "fixed", top: 64, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
      <AtlasMap
        fullscreen
        focusComponent={focusComponent}
        focusCathDomain={focusCathDomain}
      />
    </div>
  )
}

export default AtlasPage

export const Head = ({ location }) => {
  const { focusComponent, focusCathDomain } = parseAtlasQuery(location?.search)
  const focused =
    focusComponent != null
      ? `component ${focusComponent}`
      : focusCathDomain
        ? `CATH ${focusCathDomain}`
        : null

  return (
    <Seo
      title={focused ? `Family Atlas — ${focused}` : "Family Atlas"}
      description="UMAP embedding of plastic-degrading enzyme families"
    />
  )
}

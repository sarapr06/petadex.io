import React from "react"
import Seo from "../components/seo"
import AtlasMap from "../components/charts/AtlasMap"

const AtlasPage = () => (
  <div style={{ position: "fixed", top: 64, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
    <AtlasMap fullscreen />
  </div>
)

export default AtlasPage

export const Head = () => (
  <Seo
    title="Family Atlas"
    description="UMAP embedding of plastic-degrading enzyme families"
  />
)

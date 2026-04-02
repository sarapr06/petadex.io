import React from "react"
import Seo from "../components/seo"
import AtlasMap from "../components/AtlasMap"
import { useScrollHeader } from "../hooks/useScrollHeader"

const AtlasPage = () => {
  useScrollHeader()

  return (
    <section className="max-w-[1400px] mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-semibold text-primary mb-1">Family Atlas</h1>
        <p className="text-secondary text-lg">
          UMAP embedding of plastic-degrading enzyme families
        </p>
      </div>
      <AtlasMap />
    </section>
  )
}

export default AtlasPage

export const Head = () => (
  <Seo
    title="Family Atlas"
    description="UMAP embedding of plastic-degrading enzyme families"
  />
)

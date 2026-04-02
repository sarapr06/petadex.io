import React from "react"
import Seo from "../components/seo"
import MetadataMap from "../components/MetadataMap"
import { useScrollHeader } from "../hooks/useScrollHeader"

const MetadataPage = () => {
  useScrollHeader()

  return (
    <section className="max-w-[1200px] mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-primary mb-1">Sample Metadata</h1>
        <p className="text-secondary text-lg">
          Geographic distribution of plastic-degrading enzyme discovery sites
        </p>
      </div>
      <MetadataMap />
    </section>
  )
}

export default MetadataPage

export const Head = () => (
  <Seo
    title="Sample Metadata"
    description="Explore the geographic distribution of plastic-degrading enzyme samples on an interactive map"
  />
)

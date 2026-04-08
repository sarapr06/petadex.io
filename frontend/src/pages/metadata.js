import React from "react"
import Seo from "../components/seo"
import MetadataMap from "../components/MetadataMap"
import { useScrollHeader } from "../hooks/useScrollHeader"
import Container from '../components/Container'

const MetadataPage = () => {
  useScrollHeader()

  return (
    <section className="py-16 md:py-20">
      <Container>
        <h1 className="text-4xl font-semibold text-primary mb-2">Sample Metadata</h1>
        <p className="text-secondary-foreground text-lg mb-4">
          Geographic distribution of plastic-degrading enzyme discovery sites
        </p>
        <MetadataMap />
      </Container>
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

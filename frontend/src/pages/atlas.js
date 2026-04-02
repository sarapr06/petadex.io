import React from "react"
import Seo from "../components/seo"
import AtlasMap from "../components/AtlasMap"
import { useScrollHeader } from "../hooks/useScrollHeader"
import Container from '../components/Container'

const AtlasPage = () => {
  useScrollHeader()

  return (
    <section className="py-20 md:py-24">
      <Container>
        <h1 className="text-4xl font-semibold text-primary mb-1">Family Atlas</h1>
        <p className="text-secondary-foreground text-lg">
          UMAP embedding of plastic-degrading enzyme families
        </p>
        <AtlasMap />
      </Container>

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

import React from "react"
import "../styles/home.css"
import SiteHeader from "../components/SiteHeader"
import Seo from "../components/seo"
import AtlasMap from "../components/AtlasMap"
import { useScrollHeader } from "../hooks/useScrollHeader"

const AtlasPage = () => {
  useScrollHeader()

  return (
    <>

      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "2rem",
          paddingTop: "2rem",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", color: "#2c3e50" }}>
            Family Atlas
          </h1>
          <p style={{ color: "#666", fontSize: "1.1rem" }}>
            UMAP embedding of plastic-degrading enzyme families
          </p>
        </div>

        <AtlasMap />
      </section>
    </>
  )
}

export default AtlasPage

export const Head = () => (
  <Seo
    title="Family Atlas"
    description="UMAP embedding of plastic-degrading enzyme families"
  />
)

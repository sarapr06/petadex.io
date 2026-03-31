import React from "react";
import Seo from "../components/seo";
import MetadataMap from "../components/MetadataMap";
import { useScrollHeader } from "../hooks/useScrollHeader";

const MetadataPage = () => {
  useScrollHeader();

  return (
    <>

      <section style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "2rem",
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2.5rem",
            marginBottom: "0.5rem",
            color: "#2c3e50",
          }}>
            Sample Metadata
          </h1>
          <p style={{
            color: "#666",
            fontSize: "1.1rem",
            marginBottom: "1.5rem",
          }}>
            Geographic distribution of plastic-degrading enzyme discovery sites
          </p>
        </div>

        <MetadataMap />
      </section>
    </>
  );
};

export default MetadataPage;

export const Head = () => (
  <Seo
    title="Sample Metadata"
    description="Explore the geographic distribution of plastic-degrading enzyme samples on an interactive map"
  />
);

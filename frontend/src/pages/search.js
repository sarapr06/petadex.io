import React from "react";
import "../styles/home.css";
import SiteHeader from "../components/SiteHeader";
import SequenceSearch from "../components/SequenceSearch";
import Seo from "../components/seo";
import { useScrollHeader } from "../hooks/useScrollHeader";

const SearchPage = () => {
  useScrollHeader();

  return (
    <>
      <SiteHeader />

      <main style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "2rem"
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2.5rem",
            marginBottom: "0.5rem",
            color: "#2c3e50"
          }}>Sequence Search</h1>
          <p style={{
            color: "#666",
            fontSize: "1.1rem",
            marginBottom: "1.5rem"
          }}>
            Find similar plastic-degrading enzymes using MMseqs2 sequence similarity search
          </p>
        </div>

        <SequenceSearch />

        <section style={{
          marginTop: "3rem",
          padding: "1.5rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px"
        }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#2c3e50" }}>
            About the Search
          </h2>
          <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "1rem" }}>
            This tool uses <a href="https://github.com/soedinglab/MMseqs2" target="_blank" rel="noopener noreferrer" style={{ color: "#007bff" }}>MMseqs2</a> to
            search your query sequence against our curated database of plastic-degrading enzymes.
            The search identifies proteins with similar sequences, which may share functional properties.
          </p>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#2c3e50" }}>
            Understanding Results
          </h3>
          <ul style={{ color: "#666", lineHeight: "1.8", paddingLeft: "1.5rem" }}>
            <li><strong>Identity:</strong> Percentage of identical amino acids in the alignment</li>
            <li><strong>E-value:</strong> Expected number of false positives; lower is more significant</li>
            <li><strong>Coverage:</strong> Percentage of your query sequence that aligned</li>
          </ul>
        </section>
      </main>
    </>
  );
};

export default SearchPage;

export const Head = () => (
  <Seo
    title="Sequence Search"
    description="Search for similar plastic-degrading enzymes using protein sequence similarity"
  />
);

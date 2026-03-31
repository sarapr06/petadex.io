import React from "react";
import SiteHeader from "../components/SiteHeader";
import SequenceSearch from "../components/SequenceSearch";
import Seo from "../components/seo";
import { useScrollHeader } from "../hooks/useScrollHeader";

const SearchPage = () => {
  useScrollHeader();

  return (
    <>
      <section className="ui-section-hero">
        <div className="ui-layout-container">
          <h1>Sequence Search</h1>
          <p className="ui-text-intro">
            Find similar plastic-degrading enzymes using MMseqs2 sequence similarity search
          </p>
          <SequenceSearch />
        </div>
      </section>
      <section className='ui-section-close'>
        <div className="ui-layout-container">
          <h2>
            About the Search
          </h2>
          <p className="ui-text-intro">
            This tool uses <a href="https://github.com/soedinglab/MMseqs2" target="_blank" rel="noopener noreferrer" style={{ color: "#007bff" }}>MMseqs2</a> to
            search your query sequence against our curated database of plastic-degrading enzymes.
            The search identifies proteins with similar sequences, which may share functional properties.
          </p>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#2c3e50" }}>
            Understanding Results
          </h3>
          <ul className='ui-component-list'>
              <li className='ui-component-list--item'><strong>Identity:</strong> Percentage of identical amino acids in the alignment</li>
              <li className='ui-component-list--item'><strong>E-value:</strong> Expected number of false positives; lower is more significant</li>
              <li className='ui-component-list--item'><strong>Coverage:</strong> Percentage of your query sequence that aligned</li>
          </ul>
        </div>
      </section>

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

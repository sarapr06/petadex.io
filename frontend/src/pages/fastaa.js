import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import SequenceViewer from "../components/SequenceViewer";
import FeaturedPETases from "../components/FeaturedPETases";
import Seo from "../components/seo";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";
import * as s from '../styles/sequence.module.css';

const FastaaPage = () => {
  useScrollHeader();
  const [sequences, setSequences] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withMetadataOpen, setWithMetadataOpen] = useState(false);
  const [withoutMetadataOpen, setWithoutMetadataOpen] = useState(false);
  const [withMetadataVisibleCount, setWithMetadataVisibleCount] = useState(10);
  const [withoutMetadataVisibleCount, setWithoutMetadataVisibleCount] = useState(10);

  const INITIAL_VISIBLE_COUNT = 10;
  const LOAD_MORE_INCREMENT = 20;

  const endpoint = `${config.apiUrl}/fastaa`;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setSequences(data);
      } catch (err) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [endpoint]);

  useEffect(() => {
    setWithMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
    setWithoutMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [searchInput]);

  useEffect(() => {
    if (!withMetadataOpen) setWithMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [withMetadataOpen]);

  useEffect(() => {
    if (!withoutMetadataOpen) setWithoutMetadataVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [withoutMetadataOpen]);

  const filteredSequences = searchInput
    ? sequences.filter(seq =>
      seq.accession.toLowerCase().includes(searchInput.toLowerCase())
    )
    : sequences;

  const sequencesWithMetadata = filteredSequences.filter(seq => seq.in_gene_metadata === true);
  const sequencesWithoutMetadata = filteredSequences.filter(seq => seq.in_gene_metadata !== true);

  const renderSequenceSection = (title, sequenceList, sectionKey, isOpen, toggleOpen, visibleCount, setVisibleCount) => {
    const visibleSequences = sequenceList.slice(0, visibleCount);
    const hasMore = visibleCount < sequenceList.length;

    return (
      <section key={sectionKey} style={{ marginBottom: "2rem" }}>
        <h2
          onClick={toggleOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleOpen();
            }
          }}
          role="button"
          tabIndex={0}
          className={s.heading}
          style={{ marginBottom: isOpen ? "1rem" : "0" }}
        >
          <span
            className={s.chevron}
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
          {title}
          <span className={s.count}>
            {loading ? (
              <span style={{ fontStyle: "italic" }}>Loading...</span>
            ) : (
              `(${sequenceList.length} sequence${sequenceList.length !== 1 ? 's' : ''})`
            )}
          </span>
        </h2>

        <div style={{ display: isOpen ? "block" : "none" }}>
          {loading ? (
            <div className={s.empty}>Loading sequences...</div>
          ) : error ? (
            <div className={`${s.empty} ${s.error}`}>
              Error loading sequences: {error}
            </div>
          ) : sequenceList.length === 0 ? (
            <div className={s.empty}>No sequences in this category</div>
          ) : (
            <>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {visibleSequences.map((seq) => (
                  <li key={seq.accession} className={s.card}>
                    <Link to={`/sequence/${seq.accession}`} className={s.cardLink}>
                      <h3 className={s.cardTitle}>{seq.accession}</h3>
                      <SequenceViewer
                        aminoAcidSequence={seq.sequence}
                        nucleotideSequence={null}
                      />
                      {(seq.source || seq.synonyms) && (
                        <div className={s.cardMeta}>
                          {seq.source && <p><strong>Source:</strong> {seq.source}</p>}
                          {seq.synonyms && <p><strong>Synonyms:</strong> {seq.synonyms}</p>}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className={s.more}>
                  <button
                    className={s.moreBtn}
                    onClick={() => setVisibleCount(visibleCount + LOAD_MORE_INCREMENT)}
                  >
                    Load {Math.min(LOAD_MORE_INCREMENT, sequenceList.length - visibleCount)} More
                  </button>
                  <button
                    className={`${s.more} ${s.moreBtn} ${s.moreBtnAll}`}
                    onClick={() => setVisibleCount(sequenceList.length)}
                  >
                    Show All ({sequenceList.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  };

  return (
    <>
      <section>
        <div className="ui-layout-container">
          <h1>A Database for PETases</h1>
          <p className="ui-text-intro">Search and browse plastic-degrading enzymes</p>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by accession number (e.g., P80146.3)"
            className={s.search}
          />
          <p className={`${s.status} ${error ? s.error : ""}`}>
            {loading ? (
              <span style={{ fontStyle: "italic" }}>Loading sequence data...</span>
            ) : error ? (
              "Error loading sequences"
            ) : searchInput ? (
              `Found ${filteredSequences.length} matching sequence${filteredSequences.length !== 1 ? 's' : ''}`
            ) : (
              `Total sequences: ${sequences.length} (${sequencesWithMetadata.length} with experimental data, ${sequencesWithoutMetadata.length} without)`
            )}
          </p>
        </div>
      </section>

      {!searchInput && (
        <section className="ui-section-feature">
          <div className="ui-layout-container">
            <FeaturedPETases sequences={sequences} loading={loading} />
          </div>
        </section>
      )}

      <section className=''>
        <div className="ui-layout-container">
          {renderSequenceSection(
            "Sequences with Experimental Data",
            sequencesWithMetadata,
            "with-metadata",
            withMetadataOpen,
            () => setWithMetadataOpen(!withMetadataOpen),
            withMetadataVisibleCount,
            setWithMetadataVisibleCount
          )}
          {renderSequenceSection(
            "Sequences without Experimental Data",
            sequencesWithoutMetadata,
            "without-metadata",
            withoutMetadataOpen,
            () => setWithoutMetadataOpen(!withoutMetadataOpen),
            withoutMetadataVisibleCount,
            setWithoutMetadataVisibleCount
          )}
        </div>
      </section>
    </>
  );
};

export default FastaaPage;

export const Head = () => (
  <Seo
    title="Protein Sequences"
    description="Browse and search plastic-degrading enzyme sequences"
  />
);

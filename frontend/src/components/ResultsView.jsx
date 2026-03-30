import React, { useState, useMemo } from 'react';
import { Link } from 'gatsby';
import { formatSeq, cleanSequence } from '../utils/lib';
import { generateCSV, downloadCSV } from '../utils/csvDownload';
import AtlasMap from './AtlasMap';
import { Scatterplot } from "./charts/Scatterplot"
import { TaxonomyScatterChart } from "./charts/TaxonomyScatterChart"
import * as s from '../styles/results.module.css';
import AlignmentCoverageMap from './charts/AlignmentCoverageMap';
import { FunctionalAnnotationChart } from './charts/FunctionalAnnotationChart';

// Deterministic per-family color — must match enzymes.js
function familyColor(familyId) {
  const hue = (familyId * 137.508) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

const ResultsView = ({ results, metadata, sessionId, sequence, onNewSearch }) => {
  const [familySummaryOpen, setFamilySummaryOpen] = useState(true);
  const [atlasOpen, setAtlasOpen] = useState(true);
  const [atlasActive, setAtlasActive] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hitFamilyIds = useMemo(() =>
    new Set(results.map(h => h.family).filter(f => f != null)),
    [results]
  );

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/results?job=${sessionId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const familyUrl = familyId => `/family/${familyId}`;

  // Family tally
  const familyCounts = {};
  let unknownCount = 0;
  for (const hit of results) {
    if (hit.family != null) {
      const key = `Family ${hit.family}`;
      if (!familyCounts[key]) familyCounts[key] = { count: 0, enzyme_id: hit.enzyme_id, family_num: hit.family, has_tree: hit.has_tree };
      familyCounts[key].count++;
      if (hit.has_tree) familyCounts[key].has_tree = true;
    } else {
      unknownCount++;
    }
  }
  const sorted = Object.entries(familyCounts).sort((a, b) => b[1].count - a[1].count);
  if (unknownCount > 0) sorted.push(['Unknown', { count: unknownCount, enzyme_id: null }]);
  const uniqueFamilies = Object.keys(familyCounts).length;
  const maxCount = sorted[0]?.[1].count || 1;

  const cleanSeq = cleanSequence(sequence)

  const scatterData = results.map(hit => ({
    x: hit.identity,
    y: hit.query_coverage,
    size: hit.bitscore ?? 5,
    evalue: hit.evalue,
    name: hit.accession,
    enzyme_id: hit.enzyme_id,
    family: hit.family,
  }))

  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedResults = useMemo(() => {
    if (!sortKey) return results
    return [...results].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase() }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [results, sortKey, sortDir])

  const handleDownload = () => {
    const headers = ['#', 'Accession', 'Name', 'Organism', 'Family', 'Identity (%)', 'E-value', 'Coverage (%)']
    const rows = results.map(h => [
      h.rank, h.accession, h.name || '', h.organism || '',
      h.family != null ? `Family ${h.family}` : '',
      h.identity?.toFixed(1) ?? '', h.evalue ?? '', h.query_coverage ?? '',
    ])
    downloadCSV(generateCSV(headers, rows), `petadex-results-${sessionId || 'search'}`)
  }


  return (
    <div>
      {/* Results header */}
      <div className={s.resultsHeader}>
        <div>
          <h2 className={s.resultsTitle}>
            {results.length === 0
              ? "No results found"
              : `${results.length} sequences found`}
          </h2>
          {metadata && (
            <p className={s.resultsMeta}>
              {[
                metadata.query_length && `Query: ${metadata.query_length} aa`,
                metadata.database_size &&
                  `DB: ${metadata.database_size.toLocaleString()} seqs`,
                metadata.search_time_ms &&
                  `Search time: ${metadata.search_time_ms}ms`,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          )}
        </div>
        <div className={s.resultsHeaderActions}>
          {sessionId && (
            <button
              className={copied ? s.copyBtnCopied : s.copyBtn}
              onClick={handleCopyLink}
              title="Copy shareable link"
            >
              {copied ? "✓ Copied!" : "🔗 Copy link"}
            </button>
          )}
          <button className={s.newSearchBtn} onClick={onNewSearch}>
            ← New search
          </button>
        </div>
      </div>

      {/* Query sequence pill */}
      {cleanSeq && (
        <div className={s.queryPill}>
          <button
            className={s.queryPillToggle}
            onClick={() => setQueryOpen(o => !o)}
          >
            <span className={s.queryPillLabel}>Query</span>
            <span className={s.queryPillSeqPreview}>
              {formatSeq(cleanSeq, 60)}
            </span>
            <span
              className={s.familySummaryChevron}
              style={{
                transform: queryOpen ? "rotate(180deg)" : "none",
                marginLeft: "auto",
              }}
            >
              ▼
            </span>
          </button>
          {queryOpen && <pre className={s.queryPillSeqFull}>{cleanSeq}</pre>}
        </div>
      )}

      {results.length === 0 ? (
        <div className={s.noResults}>
          <p>No similar sequences were found in the PETadex database.</p>
          <p>
            Try adjusting your search parameters or using a different sequence.
          </p>
          <button className={s.newSearchBtn} onClick={onNewSearch}>
            ← New search
          </button>
        </div>
      ) : (
        <>
          {/* Family summary */}
          <div className={s.familySummary}>
            <div
              className={s.familySummaryTitle}
              onClick={() => setFamilySummaryOpen(o => !o)}
            >
              <span>
                {uniqueFamilies} {uniqueFamilies === 1 ? "family" : "families"}{" "}
                represented across {results.length} hits
              </span>
              {/* chevron rotation is dynamic — inline style only for transform value */}
              <span
                className={s.familySummaryChevron}
                style={{
                  transform: familySummaryOpen ? "rotate(180deg)" : "none",
                }}
              >
                ▼
              </span>
            </div>

            {familySummaryOpen && (
              <div className={s.familyBars}>
                {sorted.map(
                  ([label, { count, enzyme_id, family_num, has_tree }]) => (
                    <div key={label} className={s.familyBarRow}>
                      <div className={s.familyBarLabel}>
                        {label !== 'Unknown' && family_num != null ? (
                          <Link to={familyUrl(family_num)} className={s.link} style={{ color: familyColor(family_num) }}>
                            {label}
                          </Link>
                        ) : (
                          label
                        )}
                        {label !== 'Unknown' &&
                          family_num != null &&
                          has_tree && null}
                      </div>
                      <div className={s.familyBarTrack}>
                        {/* width & background are dynamic — inline only */}
                        <div
                          className={s.familyBarFill}
                          style={{
                            width: `${(count / maxCount) * 100}%`,
                            background: label === "Unknown" ? "#adb5bd" : familyColor(family_num),
                          }}
                        />
                      </div>
                      <div className={s.familyBarCount}>
                        {count} ({Math.round((count / results.length) * 100)}%)
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gap: "2rem",
              alignItems: "stretch",
              justifyContent: "space-around",
              gridTemplateColumns: "1fr 1fr"
            }}
          >
            <div className={s.chartSection}>
              <p className={s.chartTitle}>Identity vs. Query Coverage</p>
              <Scatterplot height={500} data={scatterData} familyCounts={familyCounts} unknownCount={unknownCount} total={results.length} />
            </div>
            <div className={s.chartSection}>
              <p className={s.chartTitle}>Taxonomy vs. Identity</p>
              <TaxonomyScatterChart data={results} height={500} />
            </div>
            <div className={s.chartSection}>
              <p className={s.chartTitle}>Alignment Coverage Map</p>
              <AlignmentCoverageMap data={results}/>
            </div>
            <div className={s.chartSection}>
              <p className={s.chartTitle}>Functional Annotation</p>
              <FunctionalAnnotationChart data={results} height={500} />
            </div>
          </div>

          {/* Atlas */}
          <div className={s.chartSection} style={{ marginTop: "1rem" }}>
            <div className={s.familySummaryTitle} onClick={() => setAtlasOpen(o => !o)} style={{ background: '#f1f3f5', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
              <span>Enzyme Atlas — Hit Family Locations</span>
              <span className={s.familySummaryChevron} style={{ transform: atlasOpen ? "rotate(180deg)" : "none" }}>▼</span>
            </div>
            <div style={atlasOpen ? { position: 'relative' } : { visibility: 'hidden', height: 0, overflow: 'hidden' }}>
              <AtlasMap highlightFamilyIds={hitFamilyIds} controllerEnabled={atlasActive} />
              {!atlasActive && atlasOpen && (
                <div
                  onClick={() => setAtlasActive(true)}
                  onMouseLeave={() => setAtlasActive(false)}
                  style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(15,23,42,0.45)', cursor: 'pointer',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '0.4rem 1rem', borderRadius: 20 }}>
                    Click to interact
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Results table */}
          <div className={s.tableWrap} style={{ marginTop: "2.5rem" }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button className={s.copyBtn} onClick={handleDownload}>⬇ Download CSV</button>
            </div>
            <table className={s.table}>
              <thead>
                <tr>
                  {[
                    { label: '#',         key: 'rank' },
                    { label: 'Accession', key: 'accession' },
                    { label: 'Name',      key: 'name' },
                    { label: 'Organism',  key: 'organism' },
                    { label: 'Family',    key: 'family',  minWidth: '10rem' },
                    { label: 'Identity',  key: 'identity' },
                    { label: 'E-value',   key: 'evalue',  minWidth: '8rem' },
                    { label: 'Coverage',  key: 'query_coverage' },
                  ].map(({ label, key, minWidth }) => (
                    <th
                      key={key}
                      className={s.th}
                      onClick={() => handleSort(key)}
                      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', minWidth: minWidth || undefined }}
                    >
                      {label}
                      <span style={{ marginLeft: 4, opacity: sortKey === key ? 1 : 0.3, fontSize: '0.75em' }}>
                        {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResults.map(hit => (
                  <tr key={`${hit.rank}-${hit.accession}`} className={s.tr}>
                    <td className={s.td}>{hit.rank}</td>
                    <td className={s.td}>
                      <a href={`/sequence/${hit.accession}`} target="_blank" rel="noopener noreferrer" className={s.link}
                        style={{ color: hit.family != null ? familyColor(hit.family) : undefined }}
                      >{hit.accession}</a>
                    </td>
                    <td className={s.td}>{hit.name || "-"}</td>
                    <td className={s.td}>
                      <em>{hit.organism || "-"}</em>
                    </td>
                    <td className={s.td}>
                      {hit.family != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: familyColor(hit.family), flexShrink: 0 }} />
                          <a href={familyUrl(hit.family)} target="_blank" rel="noopener noreferrer" className={s.link}
                            style={{ color: familyColor(hit.family) }}
                          >Family {hit.family}</a>
                          {hit.has_tree && null}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={s.td}>
                      {/* width is dynamic — inline only */}
                      <span
                        className={s.identityBar}
                        style={{
                          width: `${Math.min(hit.identity ?? 0, 100) * 0.6}px`,
                        }}
                      />
                      {hit.identity?.toFixed(1) ?? "-"}%
                    </td>
                    <td className={s.td}>
                      {hit.evalue === 0
                        ? "0"
                        : (hit.evalue?.toExponential(1) ?? "-")}
                    </td>
                    <td className={s.td}>{hit.query_coverage ?? "-"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
};

export default ResultsView;

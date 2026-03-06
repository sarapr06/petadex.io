import React, { useState } from 'react';
import { Link } from 'gatsby';
import { formatSeq, cleanSequence } from '../utils/lib';
import * as s from '../styles/results.module.css';

const ResultsView = ({ results, metadata, sessionId, sequence, onNewSearch }) => {
  const [familySummaryOpen, setFamilySummaryOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/results?job=${sessionId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const treeViewerUrl = familyId => `/tree/${familyId}`;

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

  return (
    <div>
      {/* Results header */}
      <div className={s.resultsHeader}>
        <div>
          <h2 className={s.resultsTitle}>
            {results.length === 0 ? 'No results found' : `${results.length} sequences found`}
          </h2>
          {metadata && (
            <p className={s.resultsMeta}>
              {[
                metadata.query_length   && `Query: ${metadata.query_length} aa`,
                metadata.database_size  && `DB: ${metadata.database_size.toLocaleString()} seqs`,
                metadata.search_time_ms && `Search time: ${metadata.search_time_ms}ms`,
              ].filter(Boolean).join('  ·  ')}
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
              {copied ? '✓ Copied!' : '🔗 Copy link'}
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
          <span className={s.queryPillLabel}>Query</span>
          <span className={s.queryPillSeq}>{formatSeq(cleanSeq, 100)}</span>
        </div>
      )}

      {results.length === 0 ? (
        <div className={s.noResults}>
          <p>No similar sequences were found in the PETadex database.</p>
          <p>Try adjusting your search parameters or using a different sequence.</p>
          <button className={s.newSearchBtn} onClick={onNewSearch}>← New search</button>
        </div>
      ) : (
        <>
          {/* Family summary */}
          <div className={s.familySummary}>
            <div className={s.familySummaryTitle} onClick={() => setFamilySummaryOpen(o => !o)}>
              <span>
                {uniqueFamilies} {uniqueFamilies === 1 ? 'family' : 'families'} represented across {results.length} hits
              </span>
              {/* chevron rotation is dynamic — inline style only for transform value */}
              <span
                className={s.familySummaryChevron}
                style={{ transform: familySummaryOpen ? 'rotate(180deg)' : 'none' }}
              >
                ▼
              </span>
            </div>

            {familySummaryOpen && (
              <div className={s.familyBars}>
                {sorted.map(([label, { count, enzyme_id, family_num, has_tree }]) => (
                  <div key={label} className={s.familyBarRow}>
                    <div className={s.familyBarLabel}>
                      {label !== 'Unknown' && enzyme_id != null
                        ? <Link to={`/enzyme/${enzyme_id}`} className={s.link}>{label}</Link>
                        : label}
                      {label !== 'Unknown' && family_num != null && has_tree && (
                        <Link
                          to={treeViewerUrl(family_num)}
                          className={s.treeIconLink}
                          title={`View phylogenetic tree for ${label}`}
                        >
                          🌿
                        </Link>
                      )}
                    </div>
                    <div className={s.familyBarTrack}>
                      {/* width & background are dynamic — inline only */}
                      <div
                        className={s.familyBarFill}
                        style={{
                          width:      `${(count / maxCount) * 100}%`,
                          background: label === 'Unknown' ? '#adb5bd' : '#007bff',
                        }}
                      />
                    </div>
                    <div className={s.familyBarCount}>
                      {count} ({Math.round((count / results.length) * 100)}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results table */}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  {['#', 'Accession', 'Name', 'Organism', 'Family', 'Identity', 'E-value', 'Coverage'].map(h => (
                    <th key={h} className={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(hit => (
                  <tr key={hit.accession} className={s.tr}>
                    <td className={s.td}>{hit.rank}</td>
                    <td className={s.td}>
                      <Link to={`/sequence/${hit.accession}`} className={s.link}>{hit.accession}</Link>
                    </td>
                    <td className={s.td}>{hit.name || '-'}</td>
                    <td className={s.td}><em>{hit.organism || '-'}</em></td>
                    <td className={s.td}>
                      {hit.family != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          {hit.enzyme_id != null
                            ? <Link to={`/enzyme/${hit.enzyme_id}`} className={s.link}>Family {hit.family}</Link>
                            : `Family ${hit.family}`}
                          {hit.has_tree && (
                            <Link
                              to={treeViewerUrl(hit.family)}
                              className={s.treeIconLink}
                              title={`Tree for Family ${hit.family}`}
                            >
                              🌿
                            </Link>
                          )}
                        </span>
                      ) : '-'}
                    </td>
                    <td className={s.td}>
                      {/* width is dynamic — inline only */}
                      <span
                        className={s.identityBar}
                        style={{ width: `${Math.min(hit.identity ?? 0, 100) * 0.6}px` }}
                      />
                      {hit.identity?.toFixed(1) ?? '-'}%
                    </td>
                    <td className={s.td}>{hit.evalue === 0 ? '0' : hit.evalue?.toExponential(1) ?? '-'}</td>
                    <td className={s.td}>{hit.query_coverage ?? '-'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsView;

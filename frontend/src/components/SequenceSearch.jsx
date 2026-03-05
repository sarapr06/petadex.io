/**
 * SequenceSearch Component
 *
 * Allows users to submit protein sequences for similarity search
 * against the PETadex database using MMseqs2.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'gatsby';
import config from '../config';
import { addJobId } from '../utils/session';
import SearchHistory from './SearchHistory';
import ExampleCards from './ExampleCards';

// Example sequences for user convenience (FASTA format with > header)
const EXAMPLE_SEQUENCES = {
  isPETase: `>IsPETase (WP_054022242.1)
MNFPRASRLMQAAVLGGLMAVSAAATAQTNPYARGPNPTAASLEASAGPFTVRSFTVSRPSGYGAGTVYYPTNAGGTVGAIAIVPGYTARQSSIKWWGPRLASHGFVVITIDTNSTLDQPSSRSSQQMAALRQVASLNGTSSSPIYGKVDTARMGVMGWSMGGGGSLISAANNPSLKAAAPQAPWDSSTNFSSVTVPTLIFACENDSIAPVNSSALPIYDSMSRNAKQFLEINGGSHSCANSGNSNQALIGKKGVAWMKRFMDNDTRYSTFACENPNSTRVSDFRTANCS`
};

const SequenceSearch = () => {
  const [sequence, setSequence] = useState('>');
  const [maxResults, setMaxResults] = useState(50);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, submitting, polling, completed, error
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [familySummaryOpen, setFamilySummaryOpen] = useState(true);
  const pollIntervalRef = useRef(null);

  // Use API Gateway URL if set, otherwise fall back to config.apiUrl
  const searchApiUrl = process.env.GATSBY_SEARCH_API_URL || config.apiUrl;

  const treeViewerUrl = familyId => `/tree/${familyId}`

  const cleanupPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollResults = useCallback(async (id) => {
    try {
      const response = await fetch(`${searchApiUrl}/search/results/${id}`);
      const data = await response.json();

      if (data.status === 'completed') {
        cleanupPolling();
        setStatus('completed');
        setResults(data.results);
        setMetadata(data.metadata);
      } else if (data.status === 'failed') {
        cleanupPolling();
        setStatus('error');
        setError(data.error || 'Search failed');
      }
      // If still processing, continue polling
    } catch (err) {
      cleanupPolling();
      setStatus('error');
      setError('Failed to fetch results. Please try again.');
    }
  }, [searchApiUrl, cleanupPolling]);

  const submitSearch = async () => {
    // Validate sequence - remove FASTA headers (lines starting with >) and whitespace
    const cleanSequence = sequence
      .split('\n')
      .filter(line => !line.trim().startsWith('>'))
      .join('')
      .replace(/[\s\r]/g, '')
      .toUpperCase();
    if (!cleanSequence || cleanSequence.length < 10) {
      setError('Please enter a valid protein sequence (at least 10 amino acids)');
      return;
    }

    setError(null);
    setResults(null);
    setMetadata(null);
    setStatus('submitting');
    cleanupPolling();

    try {
      const response = await fetch(`${searchApiUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sequence: cleanSequence,
          max_results: maxResults
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to submit search');
      }

      const data = await response.json();
      setJobId(data.job_id);
      addJobId(data.job_id);
      setStatus('polling');

      // Start polling for results
      pollIntervalRef.current = setInterval(() => {
        pollResults(data.job_id);
      }, 2000);

      // Initial poll
      setTimeout(() => pollResults(data.job_id), 500);

    } catch (err) {
      setStatus('error');
      setError(err.message || 'Failed to submit search. Please try again.');
    }
  };

  const loadExample = (name) => {
    setSequence(EXAMPLE_SEQUENCES[name]);
    setError(null);
  };

  const handleReset = () => {
    cleanupPolling();
    setSequence('>');
    setJobId(null);
    setStatus('idle');
    setResults(null);
    setError(null);
    setMetadata(null);
  };

  // Load results from a past search
  const loadPastSearch = useCallback(async (pastJobId) => {
    try {
      setError(null);
      setStatus('polling');
      setJobId(pastJobId);

      const response = await fetch(`${searchApiUrl}/search/results/${pastJobId}`);
      const data = await response.json();

      if (data.status === 'completed') {
        setStatus('completed');
        setResults(data.results);
        setMetadata(data.metadata);
      } else if (data.status === 'failed') {
        setStatus('error');
        setError(data.error || 'Search failed');
      } else if (data.status === 'not_found') {
        setStatus('error');
        setError('Search results not found or expired.');
      } else {
        setStatus('error');
        setError('Unable to load search results.');
      }
    } catch (err) {
      setStatus('error');
      setError('Failed to load past search results.');
    }
  }, [searchApiUrl]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => cleanupPolling();
  }, [cleanupPolling]);

  return (
    <div className="sequence-search">
      <style>{`
        .sequence-search {
          width: 100%;
        }
        .search-header {
          margin-bottom: 0.75rem;
        }
        .search-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }
        .search-header p {
          color: #666;
          margin: 0;
        }
        .input-section {
          margin-bottom: 1.5rem;
        }
        .sequence-textarea {
          width: 100%;
          min-height: 150px;
          padding: 0.75rem;
          font-family: monospace;
          font-size: 0.9rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          resize: vertical;
        }
        .sequence-textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }
        .example-buttons {
          margin-top: 0.5rem;
          font-size: 0.85rem;
        }
        .example-buttons button {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          padding: 0;
          margin-right: 1rem;
        }
        .example-buttons button:hover {
          text-decoration: underline;
        }
        .options-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .options-row label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
        .options-row select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .submit-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          background: #0056b3;
        }
        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .reset-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 0.5rem;
        }
        .reset-btn:hover {
          background: #545b62;
        }
        .status-message {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .status-message.processing {
          background: #e7f3ff;
          border: 1px solid #b3d7ff;
          color: #004085;
        }
        .status-message.error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }
        .status-message.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }
        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid #004085;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 0.5rem;
          vertical-align: middle;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .results-section {
          margin-top: 1.5rem;
        }
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .results-header h3 {
          margin: 0;
        }
        .results-meta {
          font-size: 0.85rem;
          color: #666;
        }
        .results-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .results-table th,
        .results-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .results-table th {
          background: #f8f9fa;
          font-weight: 600;
        }
        .results-table tr:hover {
          background: #f8f9fa;
        }
        .accession-link {
          color: #007bff;
          text-decoration: none;
        }
        .accession-link:hover {
          text-decoration: underline;
        }
        .identity-bar {
          display: inline-block;
          height: 8px;
          background: #28a745;
          border-radius: 4px;
          margin-right: 0.5rem;
          vertical-align: middle;
        }
        .no-results {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
        .family-summary {
          margin-bottom: 1.25rem;
          padding: 0.875rem 1rem;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
        }
        .family-summary-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          font-weight: 600;
          color: #495057;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0;
          cursor: pointer;
          user-select: none;
        }
        .family-summary-title.open {
          margin-bottom: 0.625rem;
        }
        .family-summary-chevron {
          font-style: normal;
          font-size: 0.7rem;
          color: #868e96;
          transition: transform 0.2s;
          display: inline-block;
        }
        .family-summary-chevron.open {
          transform: rotate(180deg);
        }
        .family-bars {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .family-bar-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
        }
        .family-bar-label {
          width: 96px;
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #495057;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .tree-icon-link {
          font-size: 0.75rem;
          text-decoration: none;
          opacity: 0.6;
          flex-shrink: 0;
        }
        .tree-icon-link:hover {
          opacity: 1;
        }
        .family-bar-track {
          flex: 1;
          height: 8px;
          background: #dee2e6;
          border-radius: 4px;
          overflow: hidden;
        }
        .family-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: #007bff;
          transition: width 0.3s ease;
        }
        .family-bar-count {
          width: 60px;
          flex-shrink: 0;
          text-align: right;
          color: #868e96;
        }
      `}</style>

      <ExampleCards
        onSelectExample={loadPastSearch}
        disabled={status === 'submitting' || status === 'polling'}
      />

      <div className="input-section">
        <textarea
          className="sequence-textarea"
          placeholder=">Header (optional)&#10;PASTE_SEQUENCE_HERE..."
          value={sequence}
          onChange={(e) => {
            // Ensure the sequence always starts with ">"
            const val = e.target.value;
            if (!val.startsWith('>')) {
              setSequence('>' + val);
            } else {
              setSequence(val);
            }
          }}
          disabled={status === 'submitting' || status === 'polling'}
        />
        <div className="example-buttons">
          <span>Load example: </span>
          <button onClick={() => loadExample('isPETase')}>IsPETase</button>
        </div>
      </div>

      <div className="options-row">
        <label>
          Max results:
          <select
            value={maxResults}
            onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
            disabled={status === 'submitting' || status === 'polling'}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </label>
      </div>

      <div>
        <button
          className="submit-btn"
          onClick={submitSearch}
          disabled={status === 'submitting' || status === 'polling' || sequence.replace(/^>.*\n?/gm, '').trim().length < 10}
        >
          {status === 'submitting' ? 'Submitting...' : status === 'polling' ? 'Searching...' : 'Search'}
        </button>
        {(status === 'completed' || status === 'error' || results) && (
          <button className="reset-btn" onClick={handleReset}>
            New Search
          </button>
        )}
      </div>

      {status === 'polling' && (
        <div className="status-message processing">
          <span className="spinner"></span>
          Searching database... This may take a few seconds.
          {jobId && <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#666' }}>Job ID: {jobId}</span>}
        </div>
      )}

      {error && (
        <div className="status-message error">
          {error}
        </div>
      )}

      {status === 'completed' && results && (
        <div className="results-section">
          <div className="results-header">
            <h3>Search Results</h3>
            {metadata && (
              <div className="results-meta">
                {[
                  metadata.query_length && `Query length: ${metadata.query_length} aa`,
                  metadata.database_size && `Database size: ${metadata.database_size.toLocaleString()} sequences`,
                  metadata.search_time_ms && `Search time: ${metadata.search_time_ms}ms`
                ].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>

          {results.length > 0 && (() => {
            // Tally hits per family
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

            return (
              <div className="family-summary">
                <div
                  className={`family-summary-title${familySummaryOpen ? ' open' : ''}`}
                  onClick={() => setFamilySummaryOpen(o => !o)}
                >
                  <span>{uniqueFamilies} {uniqueFamilies === 1 ? 'family' : 'families'} represented across {results.length} hits</span>
                  <span className={`family-summary-chevron${familySummaryOpen ? ' open' : ''}`}>▼</span>
                </div>
                {familySummaryOpen && <div className="family-bars">
                  {sorted.map(([label, { count, enzyme_id, family_num, has_tree }]) => (
                    <div className="family-bar-row" key={label}>
                      <div className="family-bar-label">
                        {label !== 'Unknown' && enzyme_id != null ? (
                          <Link to={`/enzyme/${enzyme_id}`} className="accession-link">{label}</Link>
                        ) : label}
                        {label !== 'Unknown' && family_num != null && has_tree && (
                          <Link
                            to={treeViewerUrl(family_num)}
                            className="tree-icon-link"
                            title={`View phylogenetic tree for ${label}`}
                          >🌿</Link>
                        )}
                      </div>
                      <div className="family-bar-track">
                        <div
                          className="family-bar-fill"
                          style={{
                            width: `${(count / maxCount) * 100}%`,
                            background: label === 'Unknown' ? '#adb5bd' : '#007bff'
                          }}
                        />
                      </div>
                      <div className="family-bar-count">
                        {count} ({Math.round((count / results.length) * 100)}%)
                      </div>
                    </div>
                  ))}
                </div>}
              </div>
            );
          })()}

          {results.length > 0 ? (
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Accession</th>
                  <th>Family</th>
                  <th>Identity</th>
                  <th>E-value</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {results.map((hit) => (
                  <tr key={hit.accession}>
                    <td>{hit.rank}</td>
                    <td>
                      <Link to={`/sequence/${hit.accession}`} className="accession-link">
                        {hit.accession}
                      </Link>
                    </td>
                    <td>
                      {hit.family != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          {hit.enzyme_id != null ? (
                            <Link to={`/enzyme/${hit.enzyme_id}`} className="accession-link">
                              Family {hit.family}
                            </Link>
                          ) : (
                            `Family ${hit.family}`
                          )}
                          {hit.has_tree && (
                            <Link
                              to={treeViewerUrl(hit.family)}
                              className="tree-icon-link"
                              title={`View phylogenetic tree for Family ${hit.family}`}
                            >🌿</Link>
                          )}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span
                        className="identity-bar"
                        style={{ width: `${hit.identity}px`, maxWidth: '100px' }}
                      ></span>
                      {hit.identity?.toFixed(1) ?? '-'}%
                    </td>
                    <td>{hit.evalue === 0 ? '0' : hit.evalue?.toExponential(1) ?? '-'}</td>
                    <td>{hit.query_coverage ?? '-'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-results">
              <p>No similar sequences found in the database.</p>
              <p>Try adjusting your search parameters or using a different sequence.</p>
            </div>
          )}
        </div>
      )}

      <SearchHistory
        onSelectSearch={loadPastSearch}
        currentJobId={status === 'completed' ? jobId : null}
      />
    </div>
  );
};

export default SequenceSearch;

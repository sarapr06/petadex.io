/**
 * SequenceSearch Component  –  frontend/src/components/SequenceSearch.jsx
 *
 * Input form only. On submit it navigates to /results?job={sessionId}&seq=...&n=...
 * All polling and result rendering lives in pages/results.js.
 */

import React, { useState } from 'react';
import { navigate } from 'gatsby';
import config from '../config';
import ExampleCards from './ExampleCards';
import SearchHistory from './SearchHistory';
import { cleanSequence } from '../utils/lib';

const EXAMPLE_SEQUENCES = {
  isPETase: `>IsPETase (WP_054022242.1)
MNFPRASRLMQAAVLGGLMAVSAAATAQTNPYARGPNPTAASLEASAGPFTVRSFTVSRPSGYGAGTVYYPTNAGGTVGAIAIVPGYTARQSSIKWWGPRLASHGFVVITIDTNSTLDQPSSRSSQQMAALRQVASLNGTSSSPIYGKVDTARMGVMGWSMGGGGSLISAANNPSLKAAAPQAPWDSSTNFSSVTVPTLIFACENDSIAPVNSSALPIYDSMSRNAKQFLEINGGSHSCANSGNSNQALIGKKGVAWMKRFMDNDTRYSTFACENPNSTRVSDFRTANCS`,
};

const SequenceSearch = () => {
  // Read initial state from URL params (?seq=...&n=50)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const seqFromUrl = urlParams.get('seq') || '>';
  const nFromUrl = parseInt(urlParams.get('n'), 10) || 50;

  const [sequence, setSequence] = useState(seqFromUrl);
  const [maxResults, setMaxResults] = useState(nFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const searchApiUrl = process.env.GATSBY_SEARCH_API_URL || config.apiUrl;

  const submitSearch = async () => {
    const clean = cleanSequence(sequence);
    if (!clean || clean.length < 10) {
      setError('Please enter a valid protein sequence (at least 10 amino acids).');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${searchApiUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: clean, max_results: maxResults }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      // session_id is the MD5 hash used for polling and the results page URL
      const sessionId = data.session_id;
      const encodedSeq = encodeURIComponent(clean);

      // Navigate to results page — it handles polling from here
      navigate(`/results?job=${sessionId}&seq=${encodedSeq}&n=${maxResults}`);

    } catch (err) {
      setError(err.message || 'Failed to submit search. Please try again.');
      setSubmitting(false);
    }
  };

  const loadExample = (name) => {
    setSequence(EXAMPLE_SEQUENCES[name]);
    setError(null);
  };

  const isSearchDisabled =
    submitting ||
    sequence.replace(/^>.*\n?/gm, '').trim().length < 10;

  return (
    <div className="sequence-search">
      <style>{`
        .sequence-search { width: 100%; }
        .sequence-textarea {
          width: 100%; min-height: 150px; padding: 0.75rem;
          font-family: monospace; font-size: 0.9rem;
          border: 1px solid #ddd; border-radius: 4px; resize: vertical;
          box-sizing: border-box;
        }
        .sequence-textarea:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 2px rgba(0,123,255,0.1); }
        .example-buttons { margin-top: 0.5rem; font-size: 0.85rem; }
        .example-buttons button { background: none; border: none; color: #007bff; cursor: pointer; padding: 0; margin-right: 1rem; }
        .example-buttons button:hover { text-decoration: underline; }
        .options-row { display: flex; align-items: center; gap: 1rem; margin: 0.75rem 0 1rem; }
        .submit-btn {
          background: #007bff; color: #fff; border: none;
          padding: 0.6rem 1.5rem; border-radius: 4px; font-size: 1rem; cursor: pointer;
        }
        .submit-btn:hover:not(:disabled) { background: #0056b3; }
        .submit-btn:disabled { background: #6c757d; cursor: not-allowed; }
        .error-msg {
          margin-top: 0.75rem; padding: 0.65rem 1rem;
          background: #fde8e8; color: #721c24; border-radius: 4px;
          font-size: 0.9rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-spinner {
          display: inline-block; width: 0.9rem; height: 0.9rem;
          border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          margin-right: 0.4rem; vertical-align: middle;
        }
      `}</style>

      <ExampleCards onSelectExample={(sid) => window.open(`/results?job=${sid}`, '_blank')} disabled={submitting} />

      <div className="input-section">
        <textarea
          className="sequence-textarea"
          placeholder=">Header (optional)&#10;PASTE_SEQUENCE_HERE..."
          value={sequence}
          onChange={(e) => {
            const val = e.target.value;
            setSequence(val.startsWith('>') ? val : `>${val}`);
            setError(null);
          }}
          disabled={submitting}
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
            disabled={submitting}
            style={{ marginLeft: '0.4rem' }}
          >
            {[10, 25, 50, 100, 250].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <button className="submit-btn" onClick={submitSearch} disabled={isSearchDisabled}>
        {submitting && <span className="btn-spinner" />}
        {submitting ? 'Submitting…' : 'Search'}
      </button>

      {error && <div className="error-msg">{error}</div>}

      <SearchHistory
        onSelectSearch={(sid) => window.open(`/results?job=${sid}`, '_blank')}
        currentJobId={null}
        newSearchCount={0}
      />
    </div>
  );
};

export default SequenceSearch;

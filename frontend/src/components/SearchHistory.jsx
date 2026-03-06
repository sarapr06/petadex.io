/**
 * SearchHistory Component
 *
 * Displays a list of past sequence searches with the ability
 * to view results from previous searches.
 */

import React, { useState, useEffect, useCallback } from 'react';
import config from '../config';
import { getStoredJobIds } from '../utils/session';

const SearchHistory = ({ onSelectSearch, currentJobId, newSearchCount }) => {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const searchApiUrl = process.env.GATSBY_SEARCH_API_URL || config.apiUrl;

  const fetchHistory = useCallback(async () => {
    try {
      const jobIds = getStoredJobIds();
      if (!jobIds.length) {
        setSearches([]);
        setError(null);
        return;
      }

      setLoading(true);
      const response = await fetch(`${searchApiUrl}/search/history?job_ids=${jobIds.join(',')}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch search history');
      }
      const data = await response.json();
      setSearches(data.searches || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setSearches([]);
    } finally {
      setLoading(false);
    }
  }, [searchApiUrl]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // only fires when a new search actually completes
  useEffect(() => {
    if (newSearchCount === 0) return;  // skip on mount
    const timer = setTimeout(fetchHistory, 1000);
    return () => clearTimeout(timer);
  }, [newSearchCount]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && searches.length === 0) {
    return null; // Don't show anything while loading initially
  }

  if (error || searches.length === 0) {
    return null; // Don't show if there's an error or no history
  }

  const displayedSearches = expanded ? searches : searches.slice(0, 5);

  return (
    <div className="search-history">
      <style>{`
        .search-history {
          margin-top: 2rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .history-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #495057;
          font-weight: 600;
        }
        .refresh-btn {
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 0.85rem;
        }
        .refresh-btn:hover {
          color: #007bff;
        }
        .history-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.25rem;
          background: white;
          border-radius: 4px;
          border: 1px solid #dee2e6;
          cursor: pointer;
          transition: all 0.15s;
        }
        .history-item:hover {
          border-color: #007bff;
          background: #f8f9ff;
        }
        .history-item.active {
          border-color: #007bff;
          background: #e7f1ff;
        }
        .history-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .history-item-main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }
        .history-item-time {
          color: #6c757d;
          font-size: 0.75rem;
        }
        .history-item-details {
          font-size: 0.75rem;
          color: #868e96;
        }
        .history-item-results {
          text-align: right;
          font-size: 0.8rem;
        }
        .history-item-results .count {
          font-weight: 600;
          color: #495057;
        }
        .history-item-results .top-hit {
          font-size: 0.7rem;
          color: #868e96;
        }
        .show-more-btn {
          width: 100%;
          padding: 0.5rem;
          margin-top: 0.5rem;
          background: none;
          border: 1px dashed #dee2e6;
          border-radius: 4px;
          color: #6c757d;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .show-more-btn:hover {
          border-color: #007bff;
          color: #007bff;
        }
      `}</style>

      <div className="history-header">
        <h3>Recent Searches</h3>
        <button
          className="refresh-btn"
          onClick={fetchHistory}
          title="Refresh history"
        >
          Refresh
        </button>
      </div>

      <ul className="history-list">
        {displayedSearches.map((search) => (
          <li
            key={search.job_id}
            className={`history-item ${currentJobId === search.session_id ? 'active' : ''}`}
            onClick={() => onSelectSearch(search.session_id)}
          >
            <div className="history-item-info">
              <div className="history-item-main">
                <span className="history-item-time">{formatDate(search.timestamp)}</span>
                <span className="history-item-details">
                  {search.query_length ? `${search.query_length} aa` : 'Unknown length'}
                </span>
              </div>
            </div>
            <div className="history-item-results">
              <div className="count">{search.num_results} hits</div>
              {search.top_hit && (
                <div className="top-hit">
                  Top: {search.top_hit.target_id} ({search.top_hit.percent_identity?.toFixed(1)}%)
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {searches.length > 5 && (
        <button
          className="show-more-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show ${searches.length - 5} more`}
        </button>
      )}
    </div>
  );
};

export default SearchHistory;

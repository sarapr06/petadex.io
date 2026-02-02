/**
 * ExampleCards Component
 *
 * Displays pre-configured example searches as clickable cards.
 * Users can load cached results to see how the search works.
 */

import React, { useState, useEffect } from 'react';
import config from '../config';

const ExampleCards = ({ onSelectExample, disabled }) => {
  const [examples, setExamples] = useState([]);
  const [loading, setLoading] = useState(true);

  const searchApiUrl = process.env.GATSBY_SEARCH_API_URL || config.apiUrl;

  useEffect(() => {
    async function fetchExamples() {
      try {
        const response = await fetch(`${searchApiUrl}/search/examples`);
        if (response.ok) {
          const data = await response.json();
          setExamples(data.examples || []);
        }
      } catch (err) {
        console.error('Failed to fetch examples:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchExamples();
  }, [searchApiUrl]);

  if (loading || examples.length === 0) {
    return null;
  }

  return (
    <div className="example-cards">
      <style>{`
        .example-cards {
          margin-bottom: 1.5rem;
        }
        .example-cards-header {
          font-size: 0.9rem;
          color: #495057;
          margin-bottom: 0.75rem;
          font-weight: 500;
        }
        .example-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .example-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .example-card:hover:not(:disabled) {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
          transform: translateY(-1px);
        }
        .example-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .example-card-name {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.25rem;
          font-size: 0.95rem;
        }
        .example-card-organism {
          font-size: 0.8rem;
          color: #6c757d;
          font-style: italic;
          margin-bottom: 0.5rem;
        }
        .example-card-description {
          font-size: 0.8rem;
          color: #868e96;
          line-height: 1.4;
        }
        .example-card-meta {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #adb5bd;
        }
      `}</style>

      <div className="example-cards-header">
        Try an example search:
      </div>
      <div className="example-cards-grid">
        {examples.map((example) => (
          <button
            key={example.job_id}
            className="example-card"
            onClick={() => onSelectExample(example.job_id)}
            disabled={disabled}
          >
            <div className="example-card-name">{example.name}</div>
            {example.organism && (
              <div className="example-card-organism">{example.organism}</div>
            )}
            <div className="example-card-description">{example.description}</div>
            {example.query_length && (
              <div className="example-card-meta">{example.query_length} aa</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExampleCards;

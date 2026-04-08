/**
 * ExampleCards Component
 *
 * Displays pre-configured example searches as clickable cards.
 * Users can load cached results to see how the search works.
 */

import React, { useState, useEffect } from 'react';
import config from '../../config';

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
    <div className="mb-1.5 mt-1.5">

      <div className="mb-2 text-muted-foreground text-sm">
        Try an example search:
      </div>
      <div className="grid gap-4 grid-cols-3">
        {examples.map((example) => (
          <div
            key={example.job_id}
            className="card text-left p-4 cursor-pointer"
            onClick={() => onSelectExample(example.job_id)}
            disabled={disabled}
          >
            <div className="font-semibold mb-1 text-sm text-accent">{example.name}</div>
            {example.organism && (
              <div className="text-sm italic mb-2">{example.organism}</div>
            )}
            <div className="text-sm leading-1.4 text-secondary-foreground">{example.description}</div>
            {example.query_length && (
              <div className="text-xs mt-2 text-muted-foreground">{example.query_length} aa</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

};

export default ExampleCards;

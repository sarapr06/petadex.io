/**
 * ExampleCards Component
 *
 * Displays pre-configured example searches as clickable cards.
 * Users can load cached results to see how the search works.
 */

import React from 'react';

// Hardcoded example searches. The `job_id` slugs (regen_example_*) are
// resolved server-side to cached results on the /results page, so these
// stay in sync with the backend EXAMPLE_SEARCHES list in
// backend/src/routes/search.js.
const EXAMPLES = [
  {
    job_id: 'regen_example_ispetase',
    name: 'IsPETase',
    description: 'Well-characterized PETase from Ideonella sakaiensis',
    organism: 'Ideonella sakaiensis',
    query_length: 290,
  },
  {
    job_id: 'regen_example_fast_petase',
    name: 'FAST-PETase',
    description: 'Engineered variant with enhanced activity and thermostability',
    organism: 'Engineered',
    query_length: 290,
  },
  {
    job_id: 'regen_example_srr10663367',
    name: 'SRR10663367',
    description: 'Logan-discovered enzyme with activity exceeding FAST-PETase',
    organism: 'Metagenome',
    query_length: 290,
  },
];

const ExampleCards = ({ onSelectExample, disabled }) => {
  const examples = EXAMPLES;

  if (examples.length === 0) {
    return null;
  }

  return (
    <div className="mb-1.5 mt-1.5">

      <div className="mb-2 text-muted-foreground text-sm">
        Try an example search:
      </div>
      <div className="grid gap-4 grid-cols-3">
        {examples.map((example) => (
          <button
            key={example.job_id}
            type="button"
            className="card text-left p-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
          </button>
        ))}
      </div>
    </div>
  );

};

export default ExampleCards;

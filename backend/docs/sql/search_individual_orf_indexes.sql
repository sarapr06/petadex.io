-- search_individual_orf_indexes.sql
--
-- Indexes that back individual (non-centroid) ORF search in the MVP Search Index
-- resolver (backend/src/routes/resolve.js).
--
-- Context: search_index only materializes the 90% *centroid* per cluster block,
-- so its trigram GIN can only autocomplete centroid accessions. resolve.js's
-- suggestAccessions() widens as-you-type suggestions to *individual* accessions
-- by probing the PAZy/NR provenance tables with an ILIKE substring match. Those
-- ILIKE probes need a trigram GIN to stay sub-second; without these indexes they
-- degrade to a sequential scan on every keystroke.
--
-- Exact individual-ORF resolution (resolveFromCorpus) does NOT need these — it is
-- a primary-key read on petadex_clustering and an indexed accession->orf lookup.
-- These indexes are only for the fuzzy suggestion path.
--
-- Run against the petadex RDS (read-only app user can't create indexes; use an
-- admin/owner role). CONCURRENTLY avoids locking the tables for writes, but it
-- CANNOT run inside a transaction block — execute each statement on its own.
-- Each is IF NOT EXISTS so re-running is a no-op.

-- Trigram matching support (provides gin_trgm_ops + ILIKE acceleration).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- PAZy provenance accessions.
CREATE INDEX CONCURRENTLY IF NOT EXISTS pazy_catalytic_orfs_acc_trgm
  ON pazy_catalytic_orfs USING gin (genbank_accession_id gin_trgm_ops);

-- NR provenance accessions (the larger of the two).
CREATE INDEX CONCURRENTLY IF NOT EXISTS nr_catalytic_orfs_acc_trgm
  ON nr_catalytic_orfs USING gin (genbank_accession_id gin_trgm_ops);

-- Verify the planner uses them for a substring probe (expect a Bitmap Index Scan,
-- not a Seq Scan):
--   EXPLAIN SELECT genbank_accession_id FROM nr_catalytic_orfs
--    WHERE genbank_accession_id ILIKE '%WP_0540%' LIMIT 20;

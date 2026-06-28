/**
 * Routes for the MVP Search Index resolver.
 *
 * Implements the "Sequence landing page" identifier resolver described in
 * docs/Sequence Organization/04 - MVP Search Index.md (incl. the 2026-06-22
 * post-schema update). The search box resolves three raw-provenance identifier
 * types a user (or deep link) may paste:
 *
 *   1. orf_id       — internal PETadex ORF integer (1:1, lands on a single 90% block)
 *   2. genbank_acc  — PAZy + NR accessions       (~1:1, lands on a single 90% block)
 *   3. library_id   — SRA (Logan) library         (1:many, lands on a paginated ORF list)
 *
 * Backing objects (all built + live per the 2026-06-22 schema update):
 *
 *   search_index(match_value text, match_type text, result_kind text, orf_id bigint,
 *                c90_id bigint, c60_id bigint, c30_id bigint)
 *     - match_type:  'orf_id' | 'genbank_acc' | 'library_id'
 *     - result_kind: 'single' | 'list'
 *     - orf_id:      inline for single matches; NULL for library (list) matches
 *     - c90/60/30_id: denormalized cluster ids for the single legs (NULL on the
 *                     library leg). Denormalized so a single-match resolve is ONE
 *                     API->RDS round-trip instead of a join through petadex_clustering.
 *
 *   block_90pid(cluster_id, centroid_orf_id, centroid_accession, ...)
 *     - single-match landing target, keyed by cluster_id (= c90_id), carries the
 *       centroid the user lands on (no extra query needed for it).
 *
 *   logan_catalytic_orfs(library_id text NOT NULL, orf_id bigint, ...)
 *     - library-leg fan-out (deferred; never materialized into search_index).
 *
 * Distinguishes three outcomes:
 *   - found              -> 200 with the resolved payload
 *   - not found          -> 200 with { result_kind: 'none' }
 *   - backing unavailable -> 503 (relation/column missing — e.g. pre-rebuild schema)
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();

// Identifiers are short; cap to keep the index probe bounded (matches the 64-char
// Joi convention used elsewhere for accession-style identifiers).
const querySchema = Joi.string().trim().min(1).max(64).required();

// Postgres SQLSTATEs that mean "the backing object isn't in the expected shape":
//   42P01 undefined_table, 42703 undefined_column (e.g. search_index pre-rebuild,
//   before c90/60/30_id were denormalized on).
const BACKING_UNAVAILABLE_CODES = new Set(['42P01', '42703']);

/**
 * Shape-based pre-routing (mirrors the doc's "Frontend pre-routing" + Layer-2
 * "Input pre-routing by shape"). Returns an ordered list of legs to probe so we
 * don't scan all three legs for every query:
 *
 *   - all-digits                     -> orf_id   (exact B-tree)
 *   - SRA run/library accession      -> library_id  (then genbank as fallback)
 *   - alphanumeric with `_` or `.`   -> genbank_acc  (then library as fallback)
 *
 * The ordering is a hint, not a hard filter: we probe in order and return the
 * first leg that hits, so an unusual identifier still resolves via fallback.
 */
function routeLegs(q) {
  if (/^\d+$/.test(q)) return ['orf_id'];
  // SRA accessions: (S|E|D)RR run ids, (S|E|D)RX experiment ids, etc.
  if (/^[SED]R[RXSAP]\d+$/i.test(q)) return ['library_id', 'genbank_acc'];
  return ['genbank_acc', 'library_id'];
}

/**
 * Probe a single leg of search_index for an exact match.
 * Returns the matched row (incl. denormalized cluster ids) or null.
 */
async function probeLeg(matchType, value) {
  const { rows } = await pool.query(
    `SELECT match_value, match_type, result_kind, orf_id, c90_id, c60_id, c30_id
       FROM search_index
      WHERE match_type = $1
        AND match_value = $2
      LIMIT 1`,
    [matchType, value]
  );
  return rows[0] || null;
}

// Max suggestions returned per request (merged across probed legs).
const SUGGEST_LIMIT = 20;
// Below this length, a substring (`%q%`) probe is too broad — use a left-anchored
// prefix (`q%`) instead, which is cheaper and more intuitive for short input.
const SUBSTRING_MIN_LEN = 3;

// Escape LIKE/ILIKE wildcards so user input is matched literally. Accessions
// contain `_` (a LIKE single-char wildcard), so this matters: `WP_054` must match
// the underscore literally, not "any character". Uses the default `\` escape char.
function escapeLike(s) {
  return s.replace(/([\\%_])/g, '\\$1');
}

/**
 * Partial-match suggestions when there's no exact hit. Backed by the trigram GIN
 * on the genbank_acc/library_id legs and a prefix scan on orf_id (per the doc's
 * "INDEX RECOMMENDATION"). Probes the same shape-pre-routed legs as exact lookup
 * so we don't scan all three. Returns lightweight rows the UI lists; clicking one
 * re-resolves it exactly.
 */
async function suggest(legs, q) {
  const escaped = escapeLike(q);
  // orf_id is an integer leg: prefix-as-you-type only (substring on an int is
  // meaningless). Text legs get substring once the query is long enough.
  const perLeg = await Promise.all(
    legs.map(matchType => {
      const isText = matchType !== 'orf_id';
      const pattern =
        isText && q.length >= SUBSTRING_MIN_LEN ? `%${escaped}%` : `${escaped}%`;
      return pool
        .query(
          `SELECT match_value, match_type, result_kind, orf_id, c90_id
             FROM search_index
            WHERE match_type = $1
              AND match_value ILIKE $2
            ORDER BY (match_value ILIKE $3) DESC, length(match_value), match_value
            LIMIT $4`,
          [matchType, pattern, `${escaped}%`, SUGGEST_LIMIT]
        )
        .then(r => r.rows);
    })
  );

  // Merge legs, prefix-matches first, then shortest (most specific) value.
  const prefixLower = q.toLowerCase();
  return perLeg
    .flat()
    .sort((a, b) => {
      const ap = a.match_value.toLowerCase().startsWith(prefixLower) ? 0 : 1;
      const bp = b.match_value.toLowerCase().startsWith(prefixLower) ? 0 : 1;
      return ap - bp || a.match_value.length - b.match_value.length;
    })
    .slice(0, SUGGEST_LIMIT);
}

/**
 * single result_kind (orf_id, genbank_acc):
 * one round-trip — read the denormalized c90_id off the search_index row, then
 * fetch the 90% block keyed by cluster_id. The block row carries the centroid the
 * user lands on, so the card can show searched id -> resolved cluster -> centroid.
 */
async function resolveSingle(match) {
  const cluster = {
    c90_id: match.c90_id ?? null,
    c60_id: match.c60_id ?? null,
    c30_id: match.c30_id ?? null,
  };

  let block = null;
  let blockFound = false;
  if (cluster.c90_id !== null) {
    // Lookup is intentionally NOT swallowed: a missing block_90pid relation throws
    // 42P01 and surfaces as 503 via the router catch (no more silent try/catch).
    const { rows } = await pool.query(
      `SELECT * FROM block_90pid WHERE cluster_id = $1 LIMIT 1`,
      [cluster.c90_id]
    );
    block = rows[0] || null;
    blockFound = rows.length > 0;
  }

  return {
    match_type: match.match_type,
    result_kind: 'single',
    match_value: match.match_value, // the searched identifier
    orf_id: match.orf_id, // the resolved ORF
    cluster, // resolved cluster ids (c90 is the landing key)
    block, // block_90pid row incl. centroid_orf_id / centroid_accession
    block_found: blockFound, // false = cluster resolved but no block row (data gap, still 200)
  };
}

/**
 * list result_kind (library_id):
 * the index row carries the library string with orf_id NULL by design. Fan out
 * with a SEPARATE paginated query against logan_catalytic_orfs (the doc's
 * "deferred fan-out" — we never materialize (library_id, orf_id) pairs).
 */
async function resolveList(match, limit, offset) {
  const libraryId = match.match_value;

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT orf_id
         FROM logan_catalytic_orfs
        WHERE library_id = $1
        ORDER BY orf_id
        LIMIT $2 OFFSET $3`,
      [libraryId, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) AS total
         FROM logan_catalytic_orfs
        WHERE library_id = $1`,
      [libraryId]
    ),
  ]);

  const total = parseInt(countResult.rows[0]?.total || 0, 10);
  const orfIds = dataResult.rows.map(r => r.orf_id);

  return {
    match_type: 'library_id',
    result_kind: 'list',
    match_value: libraryId,
    library_id: libraryId,
    orf_ids: orfIds,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + orfIds.length < total,
    },
  };
}

/**
 * GET /api/resolve/summary
 * Corpus-summary landing strip (single-row matview). Pass-through so the frontend
 * can render whichever columns are present (pazy_total / nr_total / sra_total /
 * clusters_90pid / clusters_60pid / clusters_30pid / catalytic_core_total / …).
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM corpus_summary LIMIT 1`);
    if (!rows.length) return res.status(404).json({ error: 'Corpus summary not available' });
    res.json(rows[0]);
  } catch (err) {
    if (BACKING_UNAVAILABLE_CODES.has(err.code)) {
      return res
        .status(503)
        .json({ error: 'Corpus summary backing object is unavailable', object: 'corpus_summary' });
    }
    next(err);
  }
});

/**
 * GET /api/resolve?q=<identifier>&limit=<n>&offset=<n>
 *
 * Resolves a pasted identifier to a landing target:
 *   - single (orf_id / genbank_acc) -> { orf_id, cluster, block }
 *   - list   (library_id)           -> { library_id, orf_ids, pagination }
 *   - partial input (no exact hit)  -> { result_kind: 'suggestions', suggestions }
 *   - no match at all               -> { result_kind: 'none' }
 */
router.get('/', async (req, res, next) => {
  const { error, value: q } = querySchema.validate(req.query.q);
  if (error) return res.status(400).json({ error: error.message });

  // Clamp pagination server-side: an unbounded limit against a large SRA library
  // is a slow query, so the list branch is always bounded regardless of input.
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    const legs = routeLegs(q);

    // Probe legs in shape-pre-routed order; first exact hit wins.
    let match = null;
    for (const leg of legs) {
      match = await probeLeg(leg, q);
      if (match) break;
    }

    // No exact hit: offer partial-match suggestions rather than a dead "no match".
    if (!match) {
      const suggestions = await suggest(legs, q);
      if (!suggestions.length) {
        return res.json({ query: q, match_type: null, result_kind: 'none' });
      }
      return res.json({ query: q, result_kind: 'suggestions', suggestions });
    }

    const payload =
      match.result_kind === 'list'
        ? await resolveList(match, limit, offset)
        : await resolveSingle(match);

    res.json({ query: q, ...payload });
  } catch (err) {
    // Distinguish "backing object missing/wrong shape" (503) from genuine 500s.
    if (BACKING_UNAVAILABLE_CODES.has(err.code)) {
      return res.status(503).json({
        error: 'Search backing object is unavailable',
        detail: err.message,
      });
    }
    next(err);
  }
});

export default router;

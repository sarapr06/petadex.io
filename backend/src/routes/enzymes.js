/**
 * Routes for BLAST-NR enzyme sequences
 * Provides access to enzyme_fastaa, enzyme_taxonomy, and variant_dictionary tables
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();

// Validation schemas
const enzymeIdSchema = Joi.number().integer().positive().required();
const accessionSchema = Joi.string().max(64).required();
const familyIdSchema = Joi.number().integer().positive().required();
const componentIdSchema = Joi.number().integer().positive().required();

/**
 * GET /api/enzymes
 * List all enzymes with optional filtering
 * Query params:
 *   - limit: number of results (default 50, max 1000)
 *   - offset: pagination offset (default 0)
 *   - family: filter by family_id
 *   - component: filter by component_id
 *   - has_component: true/false - filter sequences with/without component assignment
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
    const offset = parseInt(req.query.offset) || 0;
    const familyFilter = req.query.family ? parseInt(req.query.family) : null;
    const componentFilter = req.query.component ? parseInt(req.query.component) : null;
    const hasComponent = req.query.has_component;

    let query = `
      SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        e.contig_id,
        e.orf_start,
        e.orf_end,
        e.orf_type,
        e.library_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (familyFilter !== null) {
      paramCount++;
      query += ` AND t.family = $${paramCount}`;
      params.push(familyFilter);
    }

    if (componentFilter !== null) {
      paramCount++;
      query += ` AND t.component = $${paramCount}`;
      params.push(componentFilter);
    }

    if (hasComponent === 'true') {
      query += ` AND t.component IS NOT NULL`;
    } else if (hasComponent === 'false') {
      query += ` AND t.component IS NULL`;
    }

    query += ` ORDER BY e.enzyme_id LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (familyFilter !== null) {
      countParamCount++;
      countQuery += ` AND t.family = $${countParamCount}`;
      countParams.push(familyFilter);
    }

    if (componentFilter !== null) {
      countParamCount++;
      countQuery += ` AND t.component = $${countParamCount}`;
      countParams.push(componentFilter);
    }

    if (hasComponent === 'true') {
      countQuery += ` AND t.component IS NOT NULL`;
    } else if (hasComponent === 'false') {
      countQuery += ` AND t.component IS NULL`;
    }

    const { rows: countRows } = await pool.query(countQuery, countParams);
    const total = parseInt(countRows[0].total);

    res.json({
      data: rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/search?q=<query>&limit=100
 * Unified search across families, enzymes, and variants
 * Returns { families: [...], enzymes: [...] }
 */
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ families: [], enzymes: [] });

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    // Extract numeric value — handles plain numbers and "family 42" patterns
    const numericMatch = q.match(/^(?:family\s+)?(\d+)$/i);
    const numVal = numericMatch ? parseInt(numericMatch[1]) : null;

    const families = [];
    const enzymes = [];

    // --- Family search ---
    if (numVal !== null) {
      // Search families by ID
      const familyResult = await pool.query(
        `WITH family_stats AS (
           SELECT
             t.family,
             COUNT(DISTINCT e.enzyme_id) as variant_count,
             COUNT(DISTINCT t.component) FILTER (WHERE t.component IS NOT NULL) as component_count,
             ROUND(AVG(t.family_pid) FILTER (WHERE t.family_pid IS NOT NULL AND t.family_pid < 100), 1) as avg_identity
           FROM enzyme_taxonomy t
           INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id
           WHERE t.family = $1
           GROUP BY t.family
         )
         SELECT
           fs.family as family_id,
           e.genbank_accession_id as centroid_accession,
           fs.variant_count,
           fs.component_count,
           fs.avg_identity
         FROM family_stats fs
         INNER JOIN enzyme_taxonomy t ON fs.family = t.family AND (t.family_pid = 100 OR t.family_pid IS NULL)
         INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id`,
        [numVal]
      );
      families.push(...familyResult.rows);
    }

    // Search families by centroid accession (text queries)
    if (numVal === null) {
      const pattern = `%${q}%`;
      const familyByAccession = await pool.query(
        `WITH family_stats AS (
           SELECT
             t.family,
             COUNT(DISTINCT e.enzyme_id) as variant_count,
             COUNT(DISTINCT t.component) FILTER (WHERE t.component IS NOT NULL) as component_count,
             ROUND(AVG(t.family_pid) FILTER (WHERE t.family_pid IS NOT NULL AND t.family_pid < 100), 1) as avg_identity
           FROM enzyme_taxonomy t
           INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id
           WHERE t.family IS NOT NULL
           GROUP BY t.family
         )
         SELECT
           fs.family as family_id,
           e.genbank_accession_id as centroid_accession,
           fs.variant_count,
           fs.component_count,
           fs.avg_identity
         FROM family_stats fs
         INNER JOIN enzyme_taxonomy t ON fs.family = t.family AND (t.family_pid = 100 OR t.family_pid IS NULL)
         INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id
         WHERE e.genbank_accession_id ILIKE $1
         LIMIT $2`,
        [pattern, limit]
      );
      families.push(...familyByAccession.rows);
    }

    // --- Enzyme search ---
    if (numVal !== null) {
      // Search by exact enzyme_id
      const enzymeById = await pool.query(
        `SELECT e.enzyme_id, e.genbank_accession_id, e.contig_id, e.library_id,
                t.family, t.family_pid, t.component,
                'enzyme_id' as match_type
         FROM enzyme_fastaa e
         LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
         WHERE e.enzyme_id = $1`,
        [numVal]
      );
      enzymes.push(...enzymeById.rows);
    }

    if (numVal === null) {
      const pattern = `%${q}%`;

      // Search enzyme accessions (ILIKE for partial match)
      const byAccession = await pool.query(
        `SELECT e.enzyme_id, e.genbank_accession_id, e.contig_id, e.library_id,
                t.family, t.family_pid, t.component,
                'accession' as match_type
         FROM enzyme_fastaa e
         LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
         WHERE e.genbank_accession_id ILIKE $1
         ORDER BY e.enzyme_id
         LIMIT $2`,
        [pattern, limit]
      );
      enzymes.push(...byAccession.rows);

      // Search variant accessions, return parent enzyme info
      const byVariant = await pool.query(
        `SELECT DISTINCT e.enzyme_id, e.genbank_accession_id, e.contig_id, e.library_id,
                t.family, t.family_pid, t.component,
                'variant' as match_type,
                v.genbank_accession_id as matched_variant_accession
         FROM variant_dictionary v
         INNER JOIN enzyme_fastaa e ON v.enzyme_id = e.enzyme_id
         LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
         WHERE v.genbank_accession_id ILIKE $1
         ORDER BY e.enzyme_id
         LIMIT $2`,
        [pattern, limit]
      );
      const existingIds = new Set(enzymes.map(r => r.enzyme_id));
      enzymes.push(...byVariant.rows.filter(r => !existingIds.has(r.enzyme_id)));
    }

    res.json({ families, enzymes });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/:enzyme_id
 * Get a specific enzyme by enzyme_id
 */
router.get('/:enzyme_id', async (req, res, next) => {
  const { error, value } = enzymeIdSchema.validate(req.params.enzyme_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        e.contig_id,
        e.orf_start,
        e.orf_end,
        e.orf_type,
        e.library_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE e.enzyme_id = $1`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Enzyme not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/accession/:accession
 * Get enzyme by GenBank accession ID
 */
router.get('/accession/:accession', async (req, res, next) => {
  const { error, value } = accessionSchema.validate(req.params.accession);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        e.contig_id,
        e.orf_start,
        e.orf_end,
        e.orf_type,
        e.library_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE e.genbank_accession_id = $1`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Enzyme not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/:enzyme_id/variants
 * Get all variants for a specific enzyme centroid
 */
router.get('/:enzyme_id/variants', async (req, res, next) => {
  const { error, value } = enzymeIdSchema.validate(req.params.enzyme_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        v.variant_id,
        v.enzyme_id,
        v.genbank_accession_id,
        v.enzyme_pid,
        v.library_id,
        v.contig_id
      FROM variant_dictionary v
      WHERE v.enzyme_id = $1
      ORDER BY v.enzyme_pid DESC NULLS FIRST`,
      [value]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/family/:family_id
 * Get all enzymes in a specific family
 */
router.get('/family/:family_id', async (req, res, next) => {
  const { error, value } = familyIdSchema.validate(req.params.family_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        e.contig_id,
        e.orf_start,
        e.orf_end,
        e.orf_type,
        e.library_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE t.family = $1
      ORDER BY t.family_pid DESC NULLS FIRST`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No enzymes found for this family' });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/component/:component_id
 * Get all enzymes in a specific component
 */
router.get('/component/:component_id', async (req, res, next) => {
  const { error, value } = componentIdSchema.validate(req.params.component_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        e.contig_id,
        e.orf_start,
        e.orf_end,
        e.orf_type,
        e.library_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE t.component = $1
      ORDER BY t.family, t.family_pid DESC NULLS FIRST`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No enzymes found for this component' });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/stats
 * Get statistics about the enzyme database
 */
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await pool.query(`
      SELECT * FROM enzyme_stats_overview
    `);

    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/families/summary
 * Get family centroids with variant counts and stats
 * Query params:
 *   - sort: field to sort by (variant_count, component_count, avg_identity, family)
 *   - order: sort order (asc, desc)
 *   - limit: number of results (default 100, max 1000)
 *   - offset: pagination offset (default 0)
 */
router.get('/families/summary', async (req, res, next) => {
  try {
    const {
      sort = 'variant_count',
      order = 'desc',
      limit = 100,
      offset = 0
    } = req.query;

    const sortFieldMap = {
      'variant_count': 'variant_count',
      'component_count': 'component_count',
      'avg_identity': 'avg_identity',
      'family': 'family_id'
    };
    const sortField = sortFieldMap[sort] || 'variant_count';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT *
      FROM enzyme_family_summary
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM enzyme_family_summary
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [parseInt(limit), parseInt(offset)]),
      pool.query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0);

    res.json({
      data: dataResult.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total,
        hasMore: parseInt(offset) + dataResult.rows.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

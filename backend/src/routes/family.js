/**
 * Routes for family detail pages
 * Provides family summary, paginated members, UMAP data, and phylogenetic trees.
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const router = Router();

const familyIdSchema = Joi.number().integer().positive().required();

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const RESULTS_BUCKET = process.env.RESULTS_BUCKET || 'petadex';

let s3Client = null;
function getS3Client() {
  if (!s3Client) s3Client = new S3Client({ region: AWS_REGION });
  return s3Client;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * GET /api/family/:familyId
 * Returns family summary: variant count, component count, avg identity,
 * centroid accession + sequence, and CATH/component info for the centroid.
 */
router.get('/:familyId', async (req, res, next) => {
  const { error, value: familyId } = familyIdSchema.validate(req.params.familyId);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
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
         e.translated_sequence as centroid_sequence,
         e.enzyme_id as centroid_enzyme_id,
         fs.variant_count,
         fs.component_count,
         fs.avg_identity,
         t.component as centroid_component
       FROM family_stats fs
       INNER JOIN enzyme_taxonomy t ON fs.family = t.family AND (t.family_pid = 100 OR t.family_pid IS NULL)
       INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id`,
      [familyId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: `Family ${familyId} not found` });
    }

    // Get all distinct components in this family for the CATH badge
    const { rows: compRows } = await pool.query(
      `SELECT DISTINCT t.component
       FROM enzyme_taxonomy t
       WHERE t.family = $1 AND t.component IS NOT NULL
       ORDER BY t.component`,
      [familyId]
    );

    const result = rows[0];
    result.components = compRows.map(r => r.component);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/family/:familyId/members?page=1&limit=50
 * Returns paginated family members with sequence, component, and identity.
 */
router.get('/:familyId/members', async (req, res, next) => {
  const { error, value: familyId } = familyIdSchema.validate(req.params.familyId);
  if (error) return res.status(400).json({ error: error.message });

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  const offset = (page - 1) * limit;

  try {
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           e.enzyme_id,
           e.genbank_accession_id,
           e.translated_sequence,
           t.family_pid,
           t.component
         FROM enzyme_fastaa e
         INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
         WHERE t.family = $1
         ORDER BY t.family_pid DESC NULLS FIRST
         LIMIT $2 OFFSET $3`,
        [familyId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) as total
         FROM enzyme_taxonomy
         WHERE family = $1`,
        [familyId]
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0);

    if (total === 0) {
      return res.status(404).json({ error: `Family ${familyId} not found` });
    }

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + dataResult.rows.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/family/:familyId/metadata
 * Returns metadata for a single family from the family_atlas materialized view.
 */
router.get('/:familyId/metadata', async (req, res, next) => {
  const { error, value: familyId } = familyIdSchema.validate(req.params.familyId);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT family_id, genbank_accession_id, definition, organism, taxonomy,
              journal, collection_date, country, family_size, umap_x, umap_y
       FROM family_atlas
       WHERE family_id = $1
       LIMIT 1`,
      [familyId]
    );
    if (!rows.length) return res.status(404).json({ error: `No atlas metadata for family ${familyId}` });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/family/:familyId/umap
 * Returns all UMAP points from family_atlas for the scatter panel.
 * Current family is identified client-side for highlighting.
 */
router.get('/:familyId/umap', async (req, res, next) => {
  const { error } = familyIdSchema.validate(req.params.familyId);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT fa.family_id, fa.umap_x, fa.umap_y, fa.family_size,
              fa.organism, fa.taxonomy, fa.country,
              ec.component
       FROM family_atlas fa
       LEFT JOIN (
         SELECT family, MIN(component) AS component
         FROM enzyme_taxonomy
         WHERE component IS NOT NULL
         GROUP BY family
       ) ec ON ec.family = fa.family_id`
    );
    res.json({ points: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/family/:familyId/tree
 * Fetches the Newick tree file from S3 and returns raw text.
 */
router.get('/:familyId/tree', async (req, res, next) => {
  const familyId = parseInt(req.params.familyId, 10);
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return res.status(400).json({ error: 'Invalid familyId' });
  }

  const key = `search-phylo-trees/family_${familyId}.nwk`;
  const client = getS3Client();

  try {
    const response = await client.send(new GetObjectCommand({ Bucket: RESULTS_BUCKET, Key: key }));
    const content = await streamToString(response.Body);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', `inline; filename="family_${familyId}.nwk"`);
    res.send(content);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: `No phylogenetic tree found for family ${familyId}` });
    }
    next(err);
  }
});

export default router;

/**
 * Routes for cluster-block landing pages (the single-match landing target of the
 * MVP Search Index resolver — see docs/Sequence Organization/04 - MVP Search Index.md).
 *
 * A resolved single match (orf_id / genbank_acc) lands on its 90% cluster block,
 * keyed by cluster_id. The block matviews exist live (2026-06-22 schema update):
 *
 *   block_90pid(cluster_id, centroid_orf_id, centroid_accession, ...)  ~18.2M rows
 *   block_60pid / block_30pid                                          deferred levels
 *
 * This endpoint backs /cluster/:level/:clusterId on the frontend (the same block
 * the future browse view will reuse).
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();

const LEVELS = { 90: 'block_90pid', 60: 'block_60pid', 30: 'block_30pid' };
const levelSchema = Joi.number().integer().valid(90, 60, 30).required();
const clusterIdSchema = Joi.number().integer().positive().required();

/**
 * GET /api/cluster/:level/:clusterId
 * Returns the cluster-block row for the given clustering level (90 | 60 | 30).
 */
router.get('/:level/:clusterId', async (req, res, next) => {
  const { error: levelError, value: level } = levelSchema.validate(req.params.level);
  if (levelError) return res.status(400).json({ error: 'level must be one of 90, 60, 30' });

  const { error: idError, value: clusterId } = clusterIdSchema.validate(req.params.clusterId);
  if (idError) return res.status(400).json({ error: idError.message });

  const table = LEVELS[level];

  try {
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE cluster_id = $1 LIMIT 1`,
      [clusterId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cluster block not found' });
    res.json({ level, ...rows[0] });
  } catch (err) {
    if (err.code === '42P01') {
      return res
        .status(503)
        .json({ error: 'Cluster block backing object is unavailable', object: table });
    }
    next(err);
  }
});

export default router;

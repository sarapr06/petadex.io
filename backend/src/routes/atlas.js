import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * GET /api/atlas/umap
 * Returns all points from the family_atlas_umap materialized view.
 * Single full payload — no pagination, no filtering.
 */
router.get('/umap', async (req, res, next) => {
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

export default router;

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
      `SELECT family_id, umap_x, umap_y, family_size,
              organism, taxonomy, country
       FROM family_atlas`
    );
    res.json({ points: rows });
  } catch (err) {
    next(err);
  }
});

export default router;

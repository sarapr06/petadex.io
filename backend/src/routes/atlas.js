import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * GET /api/atlas/umap
 * Returns all points from the family_atlas materialized view.
 * Single full payload — no pagination, no filtering.
 */
router.get('/umap', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT family_id, umap_x, umap_y, family_size,
              organism, taxonomy, country, component,
              cath_domain, domain_name
       FROM family_atlas`
    );
    res.json({ points: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/atlas/components
 * Distinct atlas components with representative CATH/domain labels and family counts.
 * Used by the CATH domains page selector and deep links from the atlas.
 */
router.get('/components', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (fa.component)
         fa.component,
         fa.cath_domain,
         fa.domain_name,
         COUNT(*) OVER (PARTITION BY fa.component)::int AS family_count
       FROM family_atlas fa
       WHERE fa.component IS NOT NULL
       ORDER BY fa.component, fa.family_size DESC NULLS LAST`
    );
    res.json({ components: rows });
  } catch (err) {
    next(err);
  }
});

export default router;

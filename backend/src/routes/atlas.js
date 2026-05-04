import { Router } from 'express';
import { pool } from '../db.js';
import { getSchemaFlags } from '../schemaFlags.js';
import {
  ATLAS_COMPONENTS_FROM_BASE_TABLES,
  ATLAS_COMPONENTS_FROM_FAMILY_ATLAS,
  UMAP_POINTS_FROM_BASE_TABLES,
  UMAP_POINTS_FROM_FAMILY_ATLAS,
} from '../atlasQueries.js';

const router = Router();

/**
 * GET /api/atlas/umap
 * Returns all UMAP points from `family_atlas` when present; otherwise builds the
 * same column shape from `family_umap_coordinates` + `enzyme_taxonomy`.
 */
router.get('/umap', async (req, res, next) => {
  try {
    const flags = await getSchemaFlags(pool);
    const sql = flags.familyAtlas
      ? UMAP_POINTS_FROM_FAMILY_ATLAS
      : UMAP_POINTS_FROM_BASE_TABLES;
    const { rows } = await pool.query(sql);
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
    const flags = await getSchemaFlags(pool);
    const sql = flags.familyAtlas
      ? ATLAS_COMPONENTS_FROM_FAMILY_ATLAS
      : ATLAS_COMPONENTS_FROM_BASE_TABLES;
    const { rows } = await pool.query(sql);
    res.json({ components: rows });
  } catch (err) {
    next(err);
  }
});

export default router;

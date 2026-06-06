/**
 * Routes for family detail pages
 * Provides family summary, paginated members, UMAP data, and phylogenetic trees.
 */

import { Router } from 'express';
import Joi from 'joi';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { getSchemaFlags } from '../schemaFlags.js';
import {
  FAMILY_METADATA_FROM_BASE_TABLES,
  FAMILY_METADATA_FROM_FAMILY_ATLAS,
  UMAP_POINTS_FROM_BASE_TABLES,
  UMAP_POINTS_FROM_FAMILY_ATLAS,
} from '../atlasQueries.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { uploadNewickToItol } from '../itolUpload.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.join(__dirname, '../../scripts');

const RENDER_ENGINES = {
  ete: 'render_tree_ete.py',
  biopython: 'render_tree_biopython.py',
};

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

async function fetchFamilyNewick(familyId) {
  const key = `search-phylo-trees/family_${familyId}.nwk`;
  const client = getS3Client();
  const response = await client.send(new GetObjectCommand({ Bucket: RESULTS_BUCKET, Key: key }));
  return streamToString(response.Body);
}

function mapS3FetchError(err, familyId, res) {
  if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
    res.status(404).json({ error: `No phylogenetic tree found for family ${familyId}` });
    return true;
  }
  if (err.name === 'CredentialsProviderError' || err.message?.includes('Could not load credentials')) {
    res.status(503).json({
      error:
        'AWS credentials not configured for S3. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY in backend/.env, or use Mock mode for ETE/Biopython.',
    });
    return true;
  }
  return false;
}

/** @param {unknown} value @returns {"rectangular" | "radial"} */
function normalizeEteLayout(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'radial' || v === 'c' || v === 'circular') return 'radial';
  return 'rectangular';
}

function eteRenderOptions(layout) {
  return { scriptArgs: ['--layout', normalizeEteLayout(layout)] };
}

function renderNewickWithPython(scriptName, newick, options = {}, timeoutMs = 30000) {
  const { scriptArgs = [] } = options;
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const venvPython = path.join(SCRIPTS_DIR, '../.venv-trees/bin/python');
    const pythonBin =
      process.env.PYTHON_BIN ||
      (fs.existsSync(venvPython) ? venvPython : 'python3');
    const started = Date.now();
    const mplConfigDir = path.join(SCRIPTS_DIR, '../.venv-trees/mpl-cache');
    const child = spawn(pythonBin, [scriptPath, ...scriptArgs], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MPLCONFIGDIR: process.env.MPLCONFIGDIR || mplConfigDir,
      },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`Python render timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', err => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start Python (${pythonBin}): ${err.message}`));
    });

    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const renderMs = Date.now() - started;
      if (code !== 0) {
        const msg = (stderr || stdout || `Python exited with code ${code}`).trim();
        if (code === 2) {
          reject(Object.assign(new Error(msg), { status: 503 }));
        } else {
          reject(Object.assign(new Error(msg), { status: 422 }));
        }
        return;
      }
      resolve({ svg: stdout, renderMs });
    });

    child.stdin.write(newick);
    child.stdin.end();
  });
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
    const flags = await getSchemaFlags(pool);
    const sql = flags.familyAtlas
      ? FAMILY_METADATA_FROM_FAMILY_ATLAS
      : FAMILY_METADATA_FROM_BASE_TABLES;
    const { rows } = await pool.query(sql, [familyId]);
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
 * POST /api/family/tree/itol-upload
 * Upload Newick to iTOL batch API; returns interactive viewer URL.
 */
router.post('/tree/itol-upload', async (req, res, next) => {
  const newick = String(req.body?.newick || '').trim();
  if (!newick) {
    return res.status(400).json({ error: 'newick is required' });
  }

  const familyId = Number(req.body?.familyId);
  const treeName =
    String(req.body?.treeName || '').trim() ||
    (Number.isFinite(familyId) && familyId > 0
      ? `petadex_family_${familyId}`
      : 'petadex_mock');

  try {
    const { treeId, viewerUrl, uploadMs } = await uploadNewickToItol(newick, {
      treeName,
      treeDescription: Number.isFinite(familyId) && familyId > 0
        ? `Petadex family ${familyId} phylogeny`
        : 'Petadex mock phylogeny',
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Upload-Ms', String(uploadMs));
    res.json({ treeId, viewerUrl, uploadMs });
  } catch (err) {
    if (err.status === 503) {
      return res.status(503).json({ error: err.message });
    }
    if (err.status === 422) {
      return res.status(422).json({ error: err.message });
    }
    if (err.status === 502) {
      return res.status(502).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/family/tree/render-prototype
 * Dev/prototype: render bundled Newick without S3 (mock mode ETE/Biopython).
 */
router.post('/tree/render-prototype', async (req, res, next) => {
  const engine = String(req.body?.engine || '').toLowerCase();
  const scriptName = RENDER_ENGINES[engine];
  const newick = String(req.body?.newick || '').trim();

  if (!scriptName) {
    return res.status(400).json({ error: 'engine must be "ete" or "biopython"' });
  }
  if (!newick) {
    return res.status(400).json({ error: 'newick is required' });
  }

  try {
    const renderOpts = engine === 'ete' ? eteRenderOptions(req.body?.eteLayout) : {};
    const { svg, renderMs } = await renderNewickWithPython(scriptName, newick, renderOpts);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Render-Ms', String(renderMs));
    res.setHeader('X-Render-Engine', engine);
    res.send(svg);
  } catch (err) {
    if (err.status === 503) {
      return res.status(503).json({ error: err.message });
    }
    if (err.status === 422) {
      return res.status(422).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/family/:familyId/tree/render?engine=ete|biopython&format=svg
 * Fetches Newick from S3 and renders SVG via Python (ETE3 or Biopython).
 */
router.get('/:familyId/tree/render', async (req, res, next) => {
  const familyId = parseInt(req.params.familyId, 10);
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return res.status(400).json({ error: 'Invalid familyId' });
  }

  const engine = String(req.query.engine || '').toLowerCase();
  const scriptName = RENDER_ENGINES[engine];
  if (!scriptName) {
    return res.status(400).json({ error: 'engine must be "ete" or "biopython"' });
  }

  if (req.query.format && req.query.format !== 'svg') {
    return res.status(400).json({ error: 'Only format=svg is supported' });
  }

  try {
    const newick = await fetchFamilyNewick(familyId);
    const renderOpts = engine === 'ete' ? eteRenderOptions(req.query.eteLayout) : {};
    const { svg, renderMs } = await renderNewickWithPython(scriptName, newick.trim(), renderOpts);

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Render-Ms', String(renderMs));
    res.setHeader('X-Render-Engine', engine);
    res.send(svg);
  } catch (err) {
    if (mapS3FetchError(err, familyId, res)) return;
    if (err.status === 503) {
      return res.status(503).json({ error: err.message });
    }
    if (err.status === 422) {
      return res.status(422).json({ error: err.message });
    }
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

  try {
    const content = await fetchFamilyNewick(familyId);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', `inline; filename="family_${familyId}.nwk"`);
    res.send(content);
  } catch (err) {
    if (mapS3FetchError(err, familyId, res)) return;
    next(err);
  }
});

export default router;

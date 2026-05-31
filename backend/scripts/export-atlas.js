/**
 * Export the family_atlas materialized view to a gzipped JSON object in S3.
 *
 * The full atlas payload (~64k points, ~20 MB uncompressed) exceeds AWS Lambda's
 * 6 MB response limit, so the serverless API cannot serve GET /api/atlas/umap.
 * Instead we pre-export it here and serve it as a static, publicly-readable,
 * gzip-encoded object straight from S3 (the petadex bucket already has a public
 * GetObject policy + CORS for the petadex.net origins).
 *
 * Run after refreshing the family_atlas view:
 *   npm run export-atlas
 *
 * Object: s3://$RESULTS_BUCKET/atlas/umap.json.gz
 * URL:    https://<bucket>.s3.amazonaws.com/atlas/umap.json.gz
 */

import { gzipSync } from 'node:zlib';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../src/db.js';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const RESULTS_BUCKET = process.env.RESULTS_BUCKET || 'petadex';
const KEY = process.env.ATLAS_S3_KEY || 'atlas/umap.json.gz';

async function main() {
  console.log(`Querying family_atlas...`);
  const { rows } = await pool.query(
    `SELECT family_id, umap_x, umap_y, family_size,
            organism, taxonomy, country, component,
            cath_domain, domain_name
     FROM family_atlas`
  );
  console.log(`  ${rows.length} points`);

  const json = JSON.stringify({ points: rows });
  const gz = gzipSync(json, { level: 9 });
  console.log(
    `  ${(json.length / 1e6).toFixed(2)} MB JSON -> ${(gz.length / 1e6).toFixed(2)} MB gzip`
  );

  const s3 = new S3Client({ region: AWS_REGION });
  await s3.send(
    new PutObjectCommand({
      Bucket: RESULTS_BUCKET,
      Key: KEY,
      Body: gz,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      CacheControl: 'public, max-age=3600',
    })
  );
  console.log(`Uploaded s3://${RESULTS_BUCKET}/${KEY}`);
}

main()
  .catch(err => {
    console.error('export-atlas failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

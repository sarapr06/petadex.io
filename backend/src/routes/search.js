/**
 * Search Routes  –  backend/src/routes/search.js
 *
 * Lambda interface (petadex-diamond-orchestrator):
 *   Input:  { sessionId, sequence, max_results }
 *   Output: { job_id, s3_key }
 *   S3:     results/{sessionId}/{job_id}.json   (subfolder per session)
 *           results/{sessionId}.index           (contains job_id, written by Lambda)
 *
 * Flow:
 *   POST /api/search
 *     1. Check results/{sessionId}.index — return cached results immediately if found
 *     2. Fire Lambda async (Event) — returns 202 immediately
 *     3. Client polls GET /api/search/results/{sessionId}
 *
 *   GET /api/search/results/:sessionId
 *     1. Check index file — return completed results if found
 *     2. Return processing if no index yet
 */

/**
 *    User A searches "MNFP..."
 *            ↓
 *    session_id = MD5("MNFP...") = "a1b2c3..."
 *    Lambda runs → writes results/a1b2c3....index
 *                            results/a1b2c3.../550e8400-....json
 *
 *    User B searches "MNFP..." (same sequence)
 *            ↓
 *    session_id = MD5("MNFP...") = "a1b2c3..."  ← identical
 *            ↓
 *    resolveFromIndex finds results/a1b2c3....index ← cache hit
 *    Returns immediately, Lambda never invoked
 */

import { Router } from 'express';
import Joi from 'joi';
import { createHash, randomUUID } from 'crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../db.js';
import { getPublicReadS3Client, streamToString as publicStreamToString } from '../lib/s3Public.js';
import { SEQUENCE_PATTERN, MAX_LEN, cleanSequenceForKey } from '../lib/sequenceValidation.js';

const router = Router();

let lambdaClient = null;
let s3Client = null;

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SEARCH_LAMBDA_NAME =
  process.env.SEARCH_LAMBDA_NAME ||
  process.env.MMSEQS2_LAMBDA_NAME ||
  'petadex-diamond-orchestrator';
const RESULTS_BUCKET = process.env.RESULTS_BUCKET || 'petadex';
const RESULTS_PREFIX = process.env.RESULTS_PREFIX || 'results';
const GITHUB_REPO = process.env.GITHUB_REPO || 'ababaian/petadex.io';

function getLambdaClient() {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({
      region: AWS_REGION,
      // The synchronous `version` invoke sits on the POST / hot path. The SDK's
      // node handler has no socket timeout by default, so a cold/slow orchestrator
      // could block up to the 29s API-Gateway cap. Cap it: a timeout rejects
      // .send(), which throws → getSearchVersions returns null → nonce (forced
      // miss), the safe outcome. The async search invoke is fire-and-forget, so a
      // short request timeout there is harmless.
      requestHandler: { requestTimeout: 5000 },
    });
  }
  return lambdaClient;
}
function getS3Client() {
  if (!s3Client) s3Client = new S3Client({ region: AWS_REGION });
  return s3Client;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// Defaults are a visible sentinel, not '': an accidentally version-omitted call
// then produces a distinct, identifiable key instead of silently colliding with
// a real search's key.
function makeSessionId(cleanSequence, maxResults, databaseVersion = 'unset', searchVersion = 'unset') {
  return createHash('md5')
    .update(`${cleanSequence}:${maxResults}:${databaseVersion}:${searchVersion}`)
    .digest('hex');
}

// ─── Live search-pipeline versions ───────────────────────────────────────────
// The cache key must reflect the corpus + pipeline a FRESH search would run
// against — not whatever versions an old cached entry happened to use. Those
// values live in the orchestrator Lambda (it owns SEARCH_VERSION and resolves
// diamond/LATEST), so we ask it via a lightweight `version` action and cache the
// answer briefly to avoid an extra round-trip on every request.
let _versionCache = { value: null, expires: 0 };
const VERSION_TTL_MS = 60_000;

async function getSearchVersions() {
  if (_versionCache.value && Date.now() < _versionCache.expires) {
    return _versionCache.value;
  }
  try {
    const resp = await getLambdaClient().send(new InvokeCommand({
      FunctionName: SEARCH_LAMBDA_NAME,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({ action: 'version' }),
    }));
    if (resp.FunctionError) {
      throw new Error(`version action returned FunctionError: ${resp.FunctionError}`);
    }
    let parsed = resp.Payload ? JSON.parse(Buffer.from(resp.Payload).toString('utf8')) : {};
    // The orchestrator catches its own exceptions and returns a handled
    // { statusCode >= 400, body } envelope (NOT a Lambda FunctionError), so a
    // transient failure would otherwise slip past FunctionError, yield undefined
    // versions, and key on an empty-version string — the stale-serve bug again.
    // Treat a >=400 envelope as a hard failure so it reaches the nonce path.
    if (parsed && typeof parsed.statusCode === 'number' && parsed.statusCode >= 400) {
      throw new Error(`version action returned status ${parsed.statusCode}`);
    }
    // Tolerate an API-Gateway-style { statusCode, body: "<json>" } envelope.
    if (parsed && typeof parsed.body === 'string') parsed = JSON.parse(parsed.body);

    // Require both versions: a partial/empty response must not collapse to an
    // empty-version key. Missing → throw → null → nonce (forced miss).
    if (!parsed.database_version || !parsed.search_version) {
      throw new Error('version action returned no versions');
    }
    const value = {
      databaseVersion: parsed.database_version,
      searchVersion: parsed.search_version,
    };
    _versionCache = { value, expires: Date.now() + VERSION_TTL_MS };
    return value;
  } catch (err) {
    // Return null (NOT empty versions) so the caller forces a cache miss. A failed
    // lookup means we don't know what a fresh search would run against, so we
    // can't safely claim a hit — reusing the legacy/empty key here would serve a
    // possibly-stale result, the exact bug this change exists to kill. Failures
    // are not cached, so recovery is immediate once the action responds.
    console.warn('getSearchVersions failed, forcing cache miss for this request:', err.message);
    return null;
  }
}

function buildBugReportUrl(message, jobId) {
  const title = encodeURIComponent(`[Bug] Search error: ${message}`);
  const body = encodeURIComponent(
    `## Automatic error report\n\n` +
    `**Job ID:** \`${jobId || 'N/A'}\`\n` +
    `**Timestamp:** ${new Date().toISOString()}\n` +
    `**Error:** ${message}\n\n` +
    `*Auto-generated by PETadex error handler*`
  );
  return `https://github.com/${GITHUB_REPO}/issues/new?title=${title}&body=${body}&labels=bug`;
}

function sendError(res, statusCode, message, jobId = null) {
  const wantsHtml = (res.req.headers.accept || '').includes('text/html');
  const bugUrl = buildBugReportUrl(message, jobId);

  if (wantsHtml) {
    return res.status(statusCode).type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>PETadex - Search Error ${statusCode}</title>
  <style>
    body { font-family:system-ui,sans-serif; max-width:640px; margin:4rem auto; padding:0 1rem; }
    h1   { color:#c0392b; }
    pre  { background:#f4f4f4; padding:1rem; border-radius:4px; }
    .btn { display:inline-block; margin-top:1.5rem; padding:.6rem 1.2rem;
           background:#24292f; color:#fff; border-radius:6px; text-decoration:none; }
  </style>
</head>
<body>
  <h1>Search Error ${statusCode}</h1>
  <p>${message}</p>
  ${jobId ? `<pre>Job ID: ${jobId}</pre>` : ''}
  <a class="btn" href="${bugUrl}" target="_blank" rel="noopener noreferrer">Report this bug on GitHub</a>
</body>
</html>`);
  }

  const payload = { error: message, bug_report_url: bugUrl };
  if (jobId) payload.job_id = jobId;
  return res.status(statusCode).json(payload);
}

function transformResults(rawResults, queryLength) {
  return (rawResults || []).map((hit, index) => ({
    rank: index + 1,
    accession: hit.target_id,
    target_id: hit.target_id,
    name: hit.target_name || hit.metadata?.definition || null,
    organism: hit.organism || hit.metadata?.organism || null,
    taxonomy: hit.taxonomy || hit.metadata?.taxonomy || null,
    percent_identity: hit.percent_identity,
    identity: hit.percent_identity,
    evalue: hit.evalue,
    bitscore: hit.bitscore,
    query_coverage: queryLength && hit.query_end != null && hit.query_start != null
      ? Math.round(((hit.query_end - hit.query_start + 1) / queryLength) * 100)
      : null,
    alignment_length: hit.alignment_length,
    query_start: hit.query_start,
    query_end: hit.query_end,
    target_start: hit.target_start,
    target_end: hit.target_end,
  }));
}

const searchSchema = Joi.object({
  // Permissive pre-filter: accepts bare sequences or single-record FASTA,
  // full IUPAC ambiguity codes, stop codons (*) and gaps (-).
  // The Python Lambda (petadex-diamond-orchestrator / common.py) is the
  // authoritative gate — it strips */- and enforces the residue-length bounds.
  // Raw max is generous (12000) to allow for a header line + whitespace.
  sequence: Joi.string()
    .pattern(SEQUENCE_PATTERN)
    .max(12000).required()
    .messages({ 'string.pattern.base': 'Sequence contains unrecognized characters. Use standard amino acid codes (single-letter).' }),
  max_results: Joi.number().integer().min(1).max(500).default(50),
});

const jobIdSchema = Joi.alternatives().try(
  Joi.string().pattern(/^[a-f0-9]{32}$/),                    // MD5 sessionId
  Joi.string().uuid({ version: 'uuidv4' }),                   // Lambda job_id
  Joi.string().pattern(/^regen_example_[a-zA-Z0-9_]+$/)      // example slugs
).required();

const EXAMPLE_SEARCHES = [
  {
    job_id: 'regen_example_ispetase',
    name: 'IsPETase',
    description: 'Well-characterized PETase from Ideonella sakaiensis',
    organism: 'Ideonella sakaiensis',
    query_length: 290,
  },
  {
    job_id: 'regen_example_fast_petase',
    name: 'FAST-PETase',
    description: 'Engineered variant with enhanced activity and thermostability',
    organism: 'Engineered',
    query_length: 290,
  },
  {
    job_id: 'regen_example_srr10663367',
    name: 'SRR10663367',
    description: 'Logan-discovered enzyme with activity exceeding FAST-PETase',
    organism: 'Metagenome',
    query_length: 290,
  },
];


// Check S3 in parallel for which family IDs have a phylogenetic tree file.
// Returns a Set of family IDs (numbers) that have a corresponding .nwk file.
async function checkFamilyTrees(familyIds) {
  if (!familyIds.length) return new Set();
  const client = getPublicReadS3Client();
  const results = await Promise.allSettled(
    familyIds.map(id =>
      client.send(new HeadObjectCommand({
        Bucket: RESULTS_BUCKET,
        Key: `search-phylo-trees/family_${id}.nwk`
      })).then(() => id)
    )
  );
  return new Set(
    results.filter(r => r.status === 'fulfilled').map(r => r.value)
  );
}

// Batch-query DB for family/component data for a list of accessions.
// Checks enzyme_fastaa directly, then variant_dictionary as fallback.
async function enrichWithFamilyData(accessions) {
  if (!accessions.length) return {};

  const { rows } = await pool.query(
    `WITH direct AS (
       SELECT e.genbank_accession_id AS accession,
              e.enzyme_id,
              t.family,
              t.component,
              t.family_pid
       FROM enzyme_fastaa e
       LEFT JOIN enzyme_taxonomy t ON t.enzyme_id = e.enzyme_id
       WHERE e.genbank_accession_id = ANY($1)
     ),
     via_variant AS (
       SELECT v.genbank_accession_id AS accession,
              e.enzyme_id,
              t.family,
              t.component,
              t.family_pid
       FROM variant_dictionary v
       JOIN enzyme_fastaa e ON e.enzyme_id = v.enzyme_id
       LEFT JOIN enzyme_taxonomy t ON t.enzyme_id = v.enzyme_id
       WHERE v.genbank_accession_id = ANY($1)
         AND NOT EXISTS (
          SELECT 1 FROM enzyme_fastaa e2
          WHERE e2.genbank_accession_id = v.genbank_accession_id
        )
     )
     SELECT * FROM direct
     UNION ALL
     SELECT * FROM via_variant`,
    [accessions]
  );

  // Index by accession for O(1) lookup
  const map = {};
  for (const row of rows) {
    map[row.accession] = {
      enzyme_id: row.enzyme_id,
      family: row.family,
      component: row.component,
      family_pid: row.family_pid
    };
  }
  return map;
}

// A missing S3 object is a legitimate "not ready yet" — anything else (a real S3
// error, a malformed body) must NOT be masked as "processing", or a corrupt
// result spins the poller until the client timeout.
function isNotFound(err) {
  return err?.name === 'NoSuchKey'
    || err?.name === 'NotFound'
    || err?.$metadata?.httpStatusCode === 404;
}

// ─── Shared helper: resolve sessionId via index file ─────────────────────────
// Lambda writes results/{sessionId}.index containing the job_id after search.
// Returns the completed result object, or null if the search hasn't finished
// (index or result object not written yet). THROWS on a genuine failure — a real
// S3 error or malformed result JSON — so the caller can surface `failed` rather
// than let it masquerade as `processing`.
async function resolveFromIndex(s3, sessionId) {
  const indexKey = `${RESULTS_PREFIX}/${sessionId}.index`;
  let jobId;
  try {
    const idxResp = await s3.send(new GetObjectCommand({ Bucket: RESULTS_BUCKET, Key: indexKey }));
    jobId = (await streamToString(idxResp.Body)).trim();
  } catch (err) {
    if (isNotFound(err)) return null;  // index not written yet — still processing
    throw err;
  }

  const s3Key = `${RESULTS_PREFIX}/${sessionId}/${jobId}.json`;
  let content;
  try {
    const resp = await s3.send(new GetObjectCommand({ Bucket: RESULTS_BUCKET, Key: s3Key }));
    content = await streamToString(resp.Body);
  } catch (err) {
    if (isNotFound(err)) return null;  // index points at a not-yet-written result (rare write race)
    throw err;
  }

  // A malformed result body is a real failure, not "not ready" — let it throw.
  return { jobId, data: JSON.parse(content) };
}

// ─── Failure sentinel ────────────────────────────────────────────────────────
// The orchestrator's Step Functions Catch writes results/{sessionId}.error on the
// abort/throttle path (see the DIAMOND search plan). Reading it lets the poller
// report `failed` in ~16s instead of spinning to the 3-min client timeout.
// Returns the parsed sentinel ({ status, reason, ... }) or null if not present.
async function resolveErrorSignal(s3, sessionId) {
  const errorKey = `${RESULTS_PREFIX}/${sessionId}.error`;
  let content;
  try {
    const resp = await s3.send(new GetObjectCommand({ Bucket: RESULTS_BUCKET, Key: errorKey }));
    content = await streamToString(resp.Body);
  } catch (err) {
    if (isNotFound(err)) return null;  // no failure signal — job is still in flight
    throw err;
  }
  try {
    let parsed = JSON.parse(content);
    // The orchestrator's native Step Functions s3:putObject writes the body via
    // States.JsonToString, which double-encodes it — the stored body is a JSON
    // *string*, not an object. Unwrap the extra layer so reason/cause survive.
    // Tolerant of a future clean-JSON writer (then this branch just no-ops).
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed;
  } catch {
    // The sentinel exists but is unparseable — the search still failed, so honor it.
    return { status: 'failed', reason: 'Search failed' };
  }
}


/**
 * POST /api/search
 *
 * 1. Validate body
 * 2. MD5(sequence + max_results + databaseVersion + searchVersion) = sessionId
 *    (versions fetched live so a corpus/pipeline change busts the cache)
 * 3. Check index file — return cached results immediately if found
 * 4. Fire Lambda async (Event) — returns 202 immediately
 * 5. Client polls GET /api/search/results/{sessionId}
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = searchSchema.validate(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const { sequence, max_results } = value;
    // cleanSequenceForKey mirrors Python's validate_sequence cleaning so that
    // identical inputs produce the same session ID regardless of whether a FASTA
    // header, stop codons, or gap chars were present in the raw paste.
    const cleanSequence = cleanSequenceForKey(sequence);
    // Key on the CURRENT corpus + pipeline so a rebuilt DB or a search-pipeline
    // bump produces a fresh key (cache miss → re-run), instead of serving a stale
    // result from a prior corpus/pipeline under an unchanged key.
    const versions = await getSearchVersions();
    const sessionId = versions
      ? makeSessionId(cleanSequence, max_results, versions.databaseVersion, versions.searchVersion)
      // Version lookup failed: force a miss with a per-request nonce so we recompute
      // rather than risk serving a stale entry. ('unknown' marks it; the nonce
      // guarantees uniqueness so two failed requests can't collide on each other.)
      : makeSessionId(cleanSequence, max_results, 'unknown', randomUUID());
    const s3 = getS3Client();

    // ── Cache lookup via index file ───────────────────────────────────────────
    // resolveFromIndex now throws on genuine errors (real S3 error / malformed
    // cached result). On the POST path a bad cache entry should just miss and
    // re-run, so swallow the throw here rather than surface it.
    let cached = null;
    try {
      cached = await resolveFromIndex(s3, sessionId);
    } catch (cacheErr) {
      console.warn(`Cache lookup failed for sessionId=${sessionId}, treating as miss:`, cacheErr.message);
    }
    if (cached) {
      console.log(`Cache hit – sessionId=${sessionId} job=${cached.jobId}`);
      return res.json({
        job_id: cached.jobId,
        session_id: sessionId,
        status: 'completed',
        cached: true,
        results: transformResults(cached.data.results, cached.data.query_length),
        metadata: {
          query_header: cached.data.query_header,
          query_sequence: cached.data.query_sequence,
          query_length: cached.data.query_length,
          num_results: cached.data.num_results,
          database_size: cached.data.database_size,
          search_time_ms: cached.data.search_time_ms,
          timestamp: cached.data.timestamp,
          query_sequence: cached.data.query_sequence || null,
          query_header: cached.data.query_header || null,
        },
      });
    }

    // ── Fire Lambda async ─────────────────────────────────────────────────────
    try {
      await getLambdaClient().send(new InvokeCommand({
        FunctionName: SEARCH_LAMBDA_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          sessionId: sessionId,
          sequence: sequence,
          max_results: max_results,
        }),
      }));
      console.log(`Lambda invoked async – sessionId=${sessionId}`);
    } catch (lambdaErr) {
      console.error('Lambda invocation failed:', lambdaErr);
      return sendError(res, 500, `Search failed: ${lambdaErr.message}`, sessionId);
    }

    return res.status(202).json({
      session_id: sessionId,
      status: 'processing',
      message: `Poll /api/search/results/${sessionId} for results.`,
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/phylo-tree/:family_id
 * Serve the Newick tree file for a given enzyme family from S3.
 * Proxies the content so external viewers (e.g. icytree.org) can fetch it via CORS.
 */
router.get('/phylo-tree/:family_id', async (req, res, next) => {
  const familyId = parseInt(req.params.family_id, 10);
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return res.status(400).json({ error: 'Invalid family_id' });
  }

  const key = `search-phylo-trees/family_${familyId}.nwk`;
  const client = getPublicReadS3Client();

  try {
    const getCommand = new GetObjectCommand({ Bucket: RESULTS_BUCKET, Key: key });
    const response = await client.send(getCommand);
    const content = await publicStreamToString(response.Body);

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

/**
 * GET /api/search/examples
 */
router.get('/examples', (_req, res) => res.json({ examples: EXAMPLE_SEARCHES }));


/**
 * GET /api/search/results/:job_id
 *
 * MD5 sessionId or regen_example_*:
 *   - Check index file → completed if found, processing if not
 * UUID job_id:
 *   - Fetch results/{sessionId}/{job_id}.json directly (for history/shared links)
 */
router.get('/results/:job_id', async (req, res, next) => {
  try {
    const { error, value: jobId } = jobIdSchema.validate(req.params.job_id);
    if (error) return sendError(res, 400, 'Invalid job_id format.');

    const s3 = getS3Client();

    // MD5 sessionId or regen_example_* — check index file
    if (/^[a-f0-9]{32}$/.test(jobId) || /^regen_example_/.test(jobId)) {
      // Order matters: success (index) wins over a failure sentinel if both
      // somehow exist; a genuine error reading the result surfaces as failed
      // (not "processing"), closing the "malformed results JSON spins forever" case.
      let result;
      try {
        result = await resolveFromIndex(s3, jobId);
      } catch (idxErr) {
        console.error(`resolveFromIndex failed for ${jobId}:`, idxErr);
        return res.json({
          status: 'failed',
          session_id: jobId,
          error: `Result unavailable: ${idxErr.message}`,
        });
      }

      if (!result) {
        // No completed result yet. Before defaulting to `processing`, check for the
        // orchestrator's failure sentinel — written on the throttle/abort path well
        // before the client timeout.
        let errSignal = null;
        try {
          errSignal = await resolveErrorSignal(s3, jobId);
        } catch (sigErr) {
          // A read error on the sentinel itself shouldn't fail the poll — fall
          // through to `processing` and let the client-side timeout backstop.
          console.error(`resolveErrorSignal failed for ${jobId} (non-fatal):`, sigErr);
        }
        if (errSignal) {
          return res.json({
            status: 'failed',
            session_id: jobId,
            error: errSignal.reason || errSignal.cause || 'Search failed',
          });
        }
        // Index not written yet — Lambda still running
        return res.json({ status: 'processing', session_id: jobId });
      }

      const transformedResults = transformResults(result.data.results, result.data.query_length)

      // Enrich with family/component data from DB, then check S3 for tree files
      try {
        const accessions = transformedResults.map(r => r.accession).filter(Boolean);
        const familyMap = await enrichWithFamilyData(accessions);
        for (const hit of transformedResults) {
          const info = familyMap[hit.accession];
          hit.enzyme_id = info?.enzyme_id ?? null;
          hit.family = info?.family ?? null;
          hit.component = info?.component ?? null;
          hit.family_pid = info?.family_pid ?? null;
        }

        const uniqueFamilyIds = [...new Set(
          transformedResults.map(r => r.family).filter(f => f != null)
        )];
        const familiesWithTrees = await checkFamilyTrees(uniqueFamilyIds);
        for (const hit of transformedResults) {
          hit.has_tree = hit.family != null && familiesWithTrees.has(hit.family);
        }
      } catch (dbErr) {
        console.error('Family enrichment failed (non-fatal):', dbErr);
      }

      return res.json({
        status: 'completed',
        job_id: result.jobId,
        session_id: jobId,
        cached: true,
        results: transformedResults,
        metadata: {
          query_header: result.data.query_header,
          query_sequence: result.data.query_sequence,
          query_length: result.data.query_length,
          num_results: result.data.num_results,
          database_size: result.data.database_size,
          search_time_ms: result.data.search_time_ms,
          timestamp: result.data.timestamp,
          query_sequence: result.data.query_sequence || null,
          query_header: result.data.query_header || null,
        },
      });
    }

    return res.status(404).json({ status: 'not_found', job_id: jobId, error: 'Job not found.' });

  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/search/history
 * Lists result files under results/{sessionId}/ subfolders
 */
router.get('/history', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const jobIdsParam = req.query.job_ids;
    const filterIds = jobIdsParam ? jobIdsParam.split(',').filter(Boolean) : null;

    const s3 = getS3Client();
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: RESULTS_BUCKET,
      Prefix: `${RESULTS_PREFIX}/`,
      MaxKeys: limit * 4,
    }));

    // Results are at results/{sessionId}/{job_id}.json
    const resultObjects = (list.Contents || []).filter(obj => {
      if (!obj.Key.endsWith('.json')) return false;
      const parts = obj.Key.split('/');
      if (parts.length < 3) return false;  // must be in a subfolder
      const jobId = parts[parts.length - 1].replace('.json', '');
      if (jobId.startsWith('example_')) return false;
      return filterIds ? filterIds.includes(jobId) : true;
    });


    const searches = await Promise.all(
      resultObjects.slice(0, limit).map(async obj => {
        const parts = obj.Key.split('/');
        const jobId = parts[parts.length - 1].replace('.json', '');
        const sessId = parts[parts.length - 2];
        try {
          const resp = await s3.send(new GetObjectCommand({ Bucket: RESULTS_BUCKET, Key: obj.Key }));
          const content = await streamToString(resp.Body);
          const data = JSON.parse(content);
          return {
            job_id: jobId,
            session_id: sessId,
            timestamp: obj.LastModified.toISOString(),
            query_length: data.query_length,
            num_results: data.results?.length ?? data.num_results ?? null,
            top_hit: data.results?.[0]
              ? { target_id: data.results[0].target_id, percent_identity: data.results[0].percent_identity }
              : null,
          };
        } catch {
          return { job_id: jobId, session_id: sessId, timestamp: obj.LastModified.toISOString(), query_length: null, num_results: null, top_hit: null };
        }
      })
    );

    searches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ searches, count: searches.length, total: searches.length });

  } catch (err) {
    next(err);
  }
});

export default router;

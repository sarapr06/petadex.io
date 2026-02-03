/**
 * Search Routes
 * Provides endpoints for sequence search functionality.
 *
 * Requires AWS Lambda (MMSEQS2_LAMBDA_NAME) and S3 (RESULTS_BUCKET) to be configured.
 * For local testing, configure AWS credentials and set environment variables.
 */

import { Router } from 'express';
import Joi from 'joi';
import { randomUUID } from 'crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const router = Router();

// AWS clients (initialized lazily)
let lambdaClient = null;
let s3Client = null;

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const MMSEQS2_LAMBDA_NAME = process.env.MMSEQS2_LAMBDA_NAME || 'petadex-mmseqs2-search';
const RESULTS_BUCKET = process.env.RESULTS_BUCKET || 'petadex';
const RESULTS_PREFIX = process.env.RESULTS_PREFIX || 'results';

function getLambdaClient() {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({ region: AWS_REGION });
  }
  return lambdaClient;
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({ region: AWS_REGION });
  }
  return s3Client;
}

// Validation schemas
const searchSchema = Joi.object({
  sequence: Joi.string()
    .pattern(/^[ACDEFGHIKLMNPQRSTVWY\s\n\r*-]+$/i)
    .min(10)
    .max(10000)
    .required()
    .messages({
      'string.pattern.base': 'Invalid characters in sequence. Use standard amino acid codes.',
      'string.min': 'Sequence must be at least 10 amino acids',
      'string.max': 'Sequence must be less than 10,000 amino acids'
    }),
  max_results: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(50)
});

const jobIdSchema = Joi.alternatives().try(
  Joi.string().uuid({ version: 'uuidv4' }),
  Joi.string().pattern(/^example_[a-zA-Z0-9_]+$/)
).required();

// Pre-configured example searches with cached results in S3
const EXAMPLE_SEARCHES = [
  {
    job_id: 'example_ispetase',
    name: 'IsPETase',
    description: 'Well-characterized PETase from Ideonella sakaiensis',
    organism: 'Ideonella sakaiensis',
    query_length: 290
  },
  {
    job_id: 'example_fastpetase',
    name: 'FAST-PETase',
    description: 'Engineered variant with enhanced activity and thermostability',
    organism: 'Engineered',
    query_length: 290
  },
  {
    job_id: 'example_SRR10663367',
    name: 'SRR10663367',
    description: 'Logan-discovered enzyme with activity exceeding FAST-PETase',
    organism: 'Metagenome',
    query_length: 290
  }
];

// Helper to stream S3 body to string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Transform Lambda results to frontend format
function transformResults(results, queryLength) {
  return results.map((hit, index) => ({
    rank: index + 1,
    accession: hit.target_id,
    name: null, // Not available from MMseqs2
    organism: null, // Not available from MMseqs2
    identity: hit.percent_identity,
    evalue: hit.evalue,
    score: hit.bitscore,
    query_coverage: queryLength ? Math.round(((hit.query_end - hit.query_start + 1) / queryLength) * 100) : null,
    alignment_length: hit.alignment_length,
    query_start: hit.query_start,
    query_end: hit.query_end,
    target_start: hit.target_start,
    target_end: hit.target_end
  }));
}

/**
 * POST /api/search
 * Submit a sequence search job
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { sequence, max_results } = value;
    const cleanSequence = sequence.replace(/[\s\n\r]/g, '').toUpperCase();
    const jobId = randomUUID();

    try {
      const client = getLambdaClient();
      const command = new InvokeCommand({
        FunctionName: MMSEQS2_LAMBDA_NAME,
        InvocationType: 'Event', // Async invocation
        Payload: JSON.stringify({
          job_id: jobId,
          sequence: cleanSequence,
          max_results: max_results
        })
      });
      await client.send(command);
      console.log(`Lambda invoked for job ${jobId}`);

      // Write initial status file so results endpoint returns 'processing' instead of 404
      await getS3Client().send(new PutObjectCommand({
        Bucket: RESULTS_BUCKET,
        Key: `${RESULTS_PREFIX}/${jobId}.status`,
        Body: JSON.stringify({
          status: 'processing',
          submitted_at: new Date().toISOString()
        }),
        ContentType: 'application/json'
      }));
    } catch (lambdaErr) {
      console.error('Lambda invocation failed:', lambdaErr);
      return res.status(500).json({ error: 'Failed to submit search job' });
    }

    res.status(202).json({
      job_id: jobId,
      status: 'processing',
      message: 'Search submitted successfully. Poll /api/search/results/{job_id} for results.'
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search/examples
 * Return pre-configured example searches
 */
router.get('/examples', (req, res) => {
  res.json({
    examples: EXAMPLE_SEARCHES
  });
});

/**
 * GET /api/search/history
 * List past searches, optionally filtered by job_ids query param
 */
router.get('/history', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    // Accept comma-separated list of job_ids to filter by
    const jobIdsParam = req.query.job_ids;
    const filterJobIds = jobIdsParam ? jobIdsParam.split(',').filter(Boolean) : null;

    const client = getS3Client();

    const listCommand = new ListObjectsV2Command({
      Bucket: RESULTS_BUCKET,
      Prefix: `${RESULTS_PREFIX}/`,
      MaxKeys: filterJobIds ? 1000 : limit // Fetch more if filtering
    });

    const listResponse = await client.send(listCommand);
    let objects = (listResponse.Contents || []).filter(obj => obj.Key.endsWith('.json'));

    // Filter by job_ids if provided
    if (filterJobIds && filterJobIds.length > 0) {
      const filterSet = new Set(filterJobIds);
      objects = objects.filter(obj => {
        const jobId = obj.Key.split('/').pop().replace('.json', '');
        return filterSet.has(jobId);
      });
    }

    // Apply limit after filtering
    objects = objects.slice(0, limit);

    // Fetch metadata for each search
    const searches = await Promise.all(
      objects.map(async (obj) => {
        const jobId = obj.Key.split('/').pop().replace('.json', '');
        try {
          const getCommand = new GetObjectCommand({
            Bucket: RESULTS_BUCKET,
            Key: obj.Key
          });
          const response = await client.send(getCommand);
          const content = await streamToString(response.Body);
          const data = JSON.parse(content);

          return {
            job_id: jobId,
            timestamp: obj.LastModified.toISOString(),
            query_length: data.query_length || null,
            num_results: data.num_results || (data.results ? data.results.length : null),
            top_hit: data.results && data.results[0] ? {
              target_id: data.results[0].target_id,
              percent_identity: data.results[0].percent_identity
            } : null
          };
        } catch {
          return {
            job_id: jobId,
            timestamp: obj.LastModified.toISOString(),
            query_length: null,
            num_results: null,
            top_hit: null
          };
        }
      })
    );

    searches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      searches,
      count: searches.length,
      total: searches.length
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search/results/:job_id
 * Get results for a search job
 */
router.get('/results/:job_id', async (req, res, next) => {
  try {
    const { error, value: jobId } = jobIdSchema.validate(req.params.job_id);
    if (error) {
      return res.status(400).json({ error: 'Invalid job_id format' });
    }

    const client = getS3Client();
    const resultsKey = `${RESULTS_PREFIX}/${jobId}.json`;
    const statusKey = `${RESULTS_PREFIX}/${jobId}.status`;

    // Check if results exist
    try {
      await client.send(new HeadObjectCommand({
        Bucket: RESULTS_BUCKET,
        Key: resultsKey
      }));

      // Results exist, fetch them
      const getCommand = new GetObjectCommand({
        Bucket: RESULTS_BUCKET,
        Key: resultsKey
      });
      const response = await client.send(getCommand);
      const content = await streamToString(response.Body);
      const data = JSON.parse(content);

      const rawResults = data.results || data;
      const transformedResults = transformResults(rawResults, data.query_length);

      return res.json({
        status: 'completed',
        job_id: jobId,
        results: transformedResults,
        metadata: {
          query_length: data.query_length,
          num_results: data.num_results,
          database_size: data.database_size,
          search_time_ms: data.search_time_ms,
          timestamp: data.timestamp
        }
      });
    } catch (headErr) {
      if (headErr.name === 'NotFound' || headErr.$metadata?.httpStatusCode === 404) {
        // Results don't exist, check status file
        try {
          const statusCommand = new GetObjectCommand({
            Bucket: RESULTS_BUCKET,
            Key: statusKey
          });
          const statusResponse = await client.send(statusCommand);
          const statusContent = await streamToString(statusResponse.Body);
          const status = JSON.parse(statusContent);

          if (status.error) {
            return res.json({
              status: 'failed',
              job_id: jobId,
              error: status.error
            });
          }

          return res.json({
            status: 'processing',
            job_id: jobId,
            message: 'Search is still in progress. Please try again shortly.'
          });
        } catch (statusErr) {
          if (statusErr.name === 'NotFound' || statusErr.$metadata?.httpStatusCode === 404) {
            return res.status(404).json({
              status: 'not_found',
              job_id: jobId,
              error: 'Job not found. It may have expired or never existed.'
            });
          }
          throw statusErr;
        }
      }
      throw headErr;
    }

  } catch (err) {
    next(err);
  }
});

export default router;

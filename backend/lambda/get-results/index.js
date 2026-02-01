/**
 * Get Results Lambda
 * GET /results/{job_id}
 *
 * Fetches search results from S3 for the given job_id.
 * Returns results or status (processing/not_found).
 */

import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.RESULTS_BUCKET || 'petadex';
const RESULTS_PREFIX = process.env.RESULTS_PREFIX || 'results';

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(200, {});
  }

  try {
    // Extract job_id from path parameters
    const jobId = event.pathParameters?.job_id;

    if (!jobId) {
      return buildResponse(400, { error: 'job_id is required' });
    }

    // Validate job_id format (UUID v4)
    if (!UUID_REGEX.test(jobId)) {
      return buildResponse(400, { error: 'Invalid job_id format' });
    }

    const resultsKey = `${RESULTS_PREFIX}/${jobId}.json`;
    const statusKey = `${RESULTS_PREFIX}/${jobId}.status`;

    // First check if results file exists
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: resultsKey
      }));

      // Results exist, fetch and return them
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: resultsKey
      });

      const response = await s3Client.send(getCommand);
      const resultsJson = await streamToString(response.Body);
      const results = JSON.parse(resultsJson);

      return buildResponse(200, {
        status: 'completed',
        job_id: jobId,
        results: results.hits || results,
        metadata: {
          query_length: results.query_length,
          database_size: results.database_size,
          search_time_ms: results.search_time_ms,
          timestamp: results.timestamp
        }
      });

    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        // Results don't exist yet, check status file
        try {
          const statusCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: statusKey
          });

          const statusResponse = await s3Client.send(statusCommand);
          const statusJson = await streamToString(statusResponse.Body);
          const status = JSON.parse(statusJson);

          // Job exists but is still processing or failed
          if (status.error) {
            return buildResponse(200, {
              status: 'failed',
              job_id: jobId,
              error: status.error
            });
          }

          return buildResponse(200, {
            status: 'processing',
            job_id: jobId,
            message: 'Search is still in progress. Please try again shortly.',
            progress: status.progress || null
          });

        } catch (statusErr) {
          if (statusErr.name === 'NotFound' || statusErr.$metadata?.httpStatusCode === 404) {
            // Neither results nor status file exists
            return buildResponse(404, {
              status: 'not_found',
              job_id: jobId,
              error: 'Job not found. It may have expired or never existed.'
            });
          }
          throw statusErr;
        }
      }
      throw err;
    }

  } catch (error) {
    console.error('Error fetching results:', error);
    return buildResponse(500, { error: 'Internal server error' });
  }
}

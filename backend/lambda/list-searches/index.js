/**
 * List Searches Lambda
 * GET /searches
 *
 * Lists all past search jobs from S3, with optional pagination.
 * Returns job metadata including timestamp and query info.
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.RESULTS_BUCKET || 'petadex';
const RESULTS_PREFIX = process.env.RESULTS_PREFIX || 'results';

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
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit, 10) || 50, 100);
    const continuationToken = queryParams.next_token || null;

    // List objects in S3
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${RESULTS_PREFIX}/`,
      MaxKeys: limit,
      ContinuationToken: continuationToken
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    // Filter to only .json files (not .status files)
    const resultFiles = objects.filter(obj => obj.Key.endsWith('.json'));

    // Fetch metadata for each search (in parallel, limited batch)
    const searches = await Promise.all(
      resultFiles.map(async (obj) => {
        const jobId = obj.Key.split('/').pop().replace('.json', '');

        // Try to get basic info from the result file
        try {
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: obj.Key
          });
          const response = await s3Client.send(getCommand);
          const content = await streamToString(response.Body);
          const data = JSON.parse(content);

          return {
            job_id: jobId,
            timestamp: obj.LastModified.toISOString(),
            size_bytes: obj.Size,
            query_length: data.query_length || null,
            num_results: data.num_results || (data.results ? data.results.length : null),
            top_hit: data.results && data.results[0] ? {
              target_id: data.results[0].target_id,
              percent_identity: data.results[0].percent_identity
            } : null
          };
        } catch (err) {
          // If we can't read the file, return basic info
          return {
            job_id: jobId,
            timestamp: obj.LastModified.toISOString(),
            size_bytes: obj.Size,
            query_length: null,
            num_results: null,
            top_hit: null
          };
        }
      })
    );

    // Sort by timestamp descending (most recent first)
    searches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return buildResponse(200, {
      searches,
      count: searches.length,
      next_token: listResponse.IsTruncated ? listResponse.NextContinuationToken : null
    });

  } catch (error) {
    console.error('Error listing searches:', error);
    return buildResponse(500, { error: 'Internal server error' });
  }
}

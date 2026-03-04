/**
 * Submit Search Lambda
 * POST /search
 *
 * Accepts a sequence, validates it, invokes the mmseqs2 search Lambda
 * asynchronously, and returns a job_id for polling.
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { randomUUID } from 'crypto';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Validate amino acid sequence (allows standard single-letter codes)
const VALID_AA_REGEX = /^[ACDEFGHIKLMNPQRSTVWY\s\n\r*-]+$/i;

function validateSequence(sequence) {
  if (!sequence || typeof sequence !== 'string') {
    return { valid: false, error: 'Sequence is required' };
  }

  // Remove whitespace and newlines for validation
  const cleanSequence = sequence.replace(/[\s\n\r]/g, '').toUpperCase();

  if (cleanSequence.length === 0) {
    return { valid: false, error: 'Sequence cannot be empty' };
  }

  if (cleanSequence.length < 10) {
    return { valid: false, error: 'Sequence must be at least 10 amino acids' };
  }

  if (cleanSequence.length > 10000) {
    return { valid: false, error: 'Sequence must be less than 10,000 amino acids' };
  }

  if (!VALID_AA_REGEX.test(cleanSequence)) {
    return { valid: false, error: 'Invalid characters in sequence. Use standard amino acid codes.' };
  }

  return { valid: true, cleanSequence };
}

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(200, {});
  }

  try {
    // Parse request body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      return buildResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { sequence, max_results = 50 } = body;

    // Validate sequence
    const validation = validateSequence(sequence);
    if (!validation.valid) {
      return buildResponse(400, { error: validation.error });
    }

    // Validate max_results
    const maxResultsNum = parseInt(max_results, 10);
    if (isNaN(maxResultsNum) || maxResultsNum < 1 || maxResultsNum > 500) {
      return buildResponse(400, { error: 'max_results must be between 1 and 500' });
    }

    // Generate unique job ID
    const jobId = randomUUID();

    // Invoke mmseqs2-search Lambda asynchronously
    const invokeParams = {
      FunctionName: process.env.MMSEQS2_LAMBDA_NAME || 'petadex-mmseqs2-search-v2',
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify({
        job_id: jobId,
        sequence: validation.cleanSequence,
        max_results: maxResultsNum
      })
    };

    await lambdaClient.send(new InvokeCommand(invokeParams));

    // Return job ID immediately
    return buildResponse(202, {
      job_id: jobId,
      status: 'processing',
      message: 'Search submitted successfully. Poll /results/{job_id} for results.'
    });

  } catch (error) {
    console.error('Error submitting search:', error);
    return buildResponse(500, { error: 'Internal server error' });
  }
}

/**
 * Unsigned S3 reads for the public petadex bucket (search-phylo-trees/, atlas exports, etc.).
 * When AWS_* creds are absent locally, the SDK still signs requests and fails; these
 * objects are world-readable, so we skip signing (same as `aws s3 ... --no-sign-request`).
 */
import { S3Client } from '@aws-sdk/client-s3';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

let publicClient = null;

export function getPublicReadS3Client() {
  if (!publicClient) {
    publicClient = new S3Client({
      region: AWS_REGION,
      credentials: async () => ({ accessKeyId: 'unused', secretAccessKey: 'unused' }),
      signer: { sign: async (request) => request },
    });
  }
  return publicClient;
}

export async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

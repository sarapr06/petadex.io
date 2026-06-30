// backend/src/lib/orfSequence.js
//
// Sequence-bytes retrieval for any of the ~307M corpus ORFs: a single S3 Range
// read against the corpus FASTA, indexed by `orf_offset (byte_offset,
// byte_length)`. See "02 - Backend Routing Plan" (Sequence retrieval) and
// "Sequence Retrieval by Byte Offset".
//
// The corpus FASTA lives in the PUBLIC petadex bucket, so we use the unsigned
// public-read client (works locally with no AWS creds — same pattern as the
// atlas / phylo-tree reads). Bucket/key are overridable via env.
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getPublicReadS3Client, streamToString } from './s3Public.js'

const FASTA_S3_BUCKET = process.env.FASTA_S3_BUCKET || 'petadex'
const FASTA_S3_KEY =
  process.env.FASTA_S3_KEY || 'logan/petadex.catalytic_orfs.v1.1.fa'

/**
 * Parse a single FASTA record (header line + wrapped sequence) into its header
 * and bare amino-acid sequence. Drops a trailing stop-codon `*` if present.
 *
 * @param {string} raw
 * @returns {{ header: string|null, sequence: string }}
 */
export function parseFastaRecord(raw) {
  const text = String(raw || '').replace(/\r/g, '')
  const lines = text.split('\n')
  let header = null
  const seqLines = []
  for (const line of lines) {
    if (line.startsWith('>')) {
      // The range starts at the record's own header; ignore any later headers
      // that a slightly-long byte_length might have bled into.
      if (header == null) header = line.slice(1)
      else break
    } else if (line.length) {
      seqLines.push(line)
    }
  }
  let sequence = seqLines.join('').replace(/\s/g, '')
  if (sequence.endsWith('*')) sequence = sequence.slice(0, -1)
  return { header, sequence }
}

/**
 * Read and parse one corpus ORF record by byte range.
 *
 * @param {{ byteOffset: number|string, byteLength: number|string }} loc
 * @returns {Promise<{ header: string|null, sequence: string }>}
 * @throws if the range/offset is invalid or the S3 read fails.
 */
export async function fetchOrfSequence({ byteOffset, byteLength }) {
  const offset = Number(byteOffset)
  const length = Number(byteLength)
  if (!Number.isFinite(offset) || !Number.isFinite(length) || length <= 0) {
    throw new Error('Invalid byte offset/length for ORF sequence')
  }

  const Range = `bytes=${offset}-${offset + length - 1}`
  const client = getPublicReadS3Client()
  const resp = await client.send(
    new GetObjectCommand({ Bucket: FASTA_S3_BUCKET, Key: FASTA_S3_KEY, Range }),
  )
  const raw = await streamToString(resp.Body)
  return parseFastaRecord(raw)
}

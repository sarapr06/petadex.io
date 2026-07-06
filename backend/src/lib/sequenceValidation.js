/**
 * Shared protein-sequence validation constants for the DIAMOND search pipeline.
 *
 * These mirror the authoritative values in petadex-sequence-search/common.py.
 * The Python Lambda is the final enforcement gate; this module provides a
 * consistent pre-filter so Joi and the session-ID cleaner use the same rules.
 *
 * Keep in sync with common.py: VALID_AA, MIN_LEN, MAX_LEN.
 */

/** Standard 20 AAs + IUPAC ambiguity codes accepted by DIAMOND (uppercase). */
export const VALID_AA_CHARS = 'ACDEFGHIKLMNPQRSTVWYBJZXUO';

export const MIN_LEN = 10;
export const MAX_LEN = 10000;

/**
 * Regex that accepts a bare protein sequence OR a single-record FASTA.
 * Stop codons (*) and gap chars (-) are allowed here; they are stripped
 * server-side (Python Lambda) before the sequence reaches DIAMOND.
 *
 * Multi-FASTA (>1 header line) will pass this regex if the extra >lines
 * look like sequence chars — the Python Lambda enforces the single-record
 * rule and returns a clear error in that case.
 */
export const SEQUENCE_PATTERN = new RegExp(
  `^(>[^\\n\\r]*[\\n\\r]+)?[${VALID_AA_CHARS}\\s\\n\\r*-]+$`,
  'i'
);

/**
 * Clean a raw input string to the residue body used for cache-key derivation.
 *
 * Strips:
 *   - FASTA header line (>…)
 *   - whitespace / newlines
 *   - stop codons (*) and gap characters (-)
 *
 * Returns the uppercase residue string. This must match what the Python
 * Lambda's validate_sequence() produces so that identical inputs hash to
 * the same session ID regardless of whether a header was present.
 */
export function cleanSequenceForKey(raw) {
  return raw
    .replace(/^>[^\n\r]*[\n\r]+/, '')  // strip FASTA header if present
    .replace(/[*\-\s\n\r]/g, '')        // strip stop/gap/whitespace
    .toUpperCase();
}

/** Standard 20-letter protein alphabet (no B, J, O, U, X, Z). */
const AA = 'ACDEFGHIKLMNPQRSTVWY';

/**
 * Deterministic pseudo-random 0..1 from integer seed (mulberry32).
 * @param {number} seed
 */
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Synthetic protein sequence for sara_* prototyping when no ORF sequence table exists.
 * Same orf_id always yields the same sequence.
 *
 * @param {number} orfId
 * @param {number} [length=300]
 * @returns {string}
 */
export function saraSyntheticSequence(orfId, length = 300) {
  const len = Math.max(1, Math.floor(length));
  const rand = mulberry32((Number(orfId) || 1) * 2654435761);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += AA[Math.floor(rand() * AA.length)];
  }
  return out;
}

export const SARA_SYNTHETIC_LENGTH = 300;

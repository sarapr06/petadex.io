// backend/src/lib/seqStats.js
//
// Deterministic physico-chemical stats computed directly from an amino-acid
// sequence — labelled "computed from sequence" on the page (never measured).
// Mirrors the corpus-page contract in "02 - Backend Routing Plan":
//   { length, mass, pI, gravy }
//
// Non-standard residues (X/B/Z/U/* and anything unrecognised) count toward
// `length` but are excluded from the chemistry (mass/pI/gravy), matching the
// plan's note.

// Average isotopic residue masses (Da). Water (18.01524) added once for the
// peptide termini.
const RESIDUE_MASS = {
  A: 71.0788, R: 156.1875, N: 114.1038, D: 115.0886, C: 103.1388,
  E: 129.1155, Q: 128.1307, G: 57.0519, H: 137.1411, I: 113.1594,
  L: 113.1594, K: 128.1741, M: 131.1926, F: 147.1766, P: 97.1167,
  S: 87.0782, T: 101.1051, W: 186.2132, Y: 163.1760, V: 99.1326,
}
const WATER = 18.01524

// Kyte–Doolittle hydropathy.
const KD = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, E: -3.5, Q: -3.5, G: -0.4,
  H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8,
  T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
}

// EMBOSS pKa set (matches `iep`): termini + charged side chains.
const PK_NTERM = 8.6
const PK_CTERM = 3.6
const PK_POS = { K: 10.8, R: 12.5, H: 6.5 } // protonated → positive
const PK_NEG = { D: 3.9, E: 4.1, C: 8.5, Y: 10.1 } // deprotonated → negative

function netCharge(pH, counts) {
  // Positive contributions: protonated when pH < pK.
  let pos = 1 / (1 + 10 ** (pH - PK_NTERM))
  for (const aa in PK_POS) {
    pos += (counts[aa] || 0) / (1 + 10 ** (pH - PK_POS[aa]))
  }
  // Negative contributions: deprotonated when pH > pK.
  let neg = 1 / (1 + 10 ** (PK_CTERM - pH))
  for (const aa in PK_NEG) {
    neg += (counts[aa] || 0) / (1 + 10 ** (PK_NEG[aa] - pH))
  }
  return pos - neg
}

function isoelectricPoint(counts, hasResidues) {
  if (!hasResidues) return null
  let lo = 0
  let hi = 14
  // Bisection to net-charge ≈ 0 (monotonic decreasing in pH).
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const charge = netCharge(mid, counts)
    if (charge > 0) lo = mid
    else hi = mid
    if (Math.abs(charge) < 1e-5) break
  }
  return (lo + hi) / 2
}

/**
 * @param {string} sequence  bare amino-acid string (no header, no whitespace)
 * @returns {{ length: number, mass: number|null, pI: number|null, gravy: number|null, note: string }}
 */
export function computeSeqStats(sequence) {
  const seq = String(sequence || '').toUpperCase().replace(/[^A-Z]/g, '')
  const length = seq.length

  const counts = {}
  let mass = WATER
  let kdSum = 0
  let standardCount = 0

  for (const aa of seq) {
    if (RESIDUE_MASS[aa] != null) {
      counts[aa] = (counts[aa] || 0) + 1
      mass += RESIDUE_MASS[aa]
      kdSum += KD[aa]
      standardCount += 1
    }
    // Non-standard residues count toward length only (already in `length`).
  }

  const hasResidues = standardCount > 0
  const round = (v, d) => (v == null ? null : Number(v.toFixed(d)))

  return {
    length,
    mass: hasResidues ? round(mass, 2) : null,
    pI: round(isoelectricPoint(counts, hasResidues), 2),
    gravy: hasResidues ? round(kdSum / standardCount, 4) : null,
    note: 'computed from sequence',
  }
}

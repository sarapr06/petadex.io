import { normalizeRange } from "../sequence/utils.js"
import { residueHighlightLabel } from "./residueColumnHighlight.js"

const SLICE_PREVIEW_MAX = 40

/**
 * @param {Set<number>} set
 * @param {number} pos 1-based
 * @returns {Set<number>}
 */
export function togglePosition(set, pos) {
  const p = Math.round(pos)
  if (!Number.isFinite(p) || p < 1) return set
  const next = new Set(set)
  if (next.has(p)) next.delete(p)
  else next.add(p)
  return next
}

/**
 * @param {Set<number>} set
 * @param {number} a 1-based
 * @param {number} b 1-based
 * @returns {Set<number>}
 */
export function addRange(set, a, b) {
  const [lo, hi] = normalizeRange(Math.round(a), Math.round(b))
  if (!Number.isFinite(lo) || lo < 1) return set
  const next = new Set(set)
  for (let p = lo; p <= hi; p++) next.add(p)
  return next
}

/**
 * @param {Set<number>} set
 * @param {number} a 1-based
 * @param {number} b 1-based
 * @returns {Set<number>}
 */
export function removeRange(set, a, b) {
  const [lo, hi] = normalizeRange(Math.round(a), Math.round(b))
  const next = new Set(set)
  for (let p = lo; p <= hi; p++) next.delete(p)
  return next
}

/**
 * @param {number[]} sortedPositions
 * @returns {{ lo: number, hi: number }[]}
 */
export function positionsToRanges(sortedPositions) {
  if (!sortedPositions.length) return []
  const ranges = []
  let lo = sortedPositions[0]
  let hi = sortedPositions[0]
  for (let i = 1; i < sortedPositions.length; i++) {
    const p = sortedPositions[i]
    if (p === hi + 1) {
      hi = p
    } else {
      ranges.push({ lo, hi })
      lo = p
      hi = p
    }
  }
  ranges.push({ lo, hi })
  return ranges
}

/**
 * @param {string | undefined} sequence
 * @param {number} lo
 * @param {number} hi
 */
function slicePreview(sequence, lo, hi) {
  if (!sequence) return ""
  const slice = sequence.slice(lo - 1, hi)
  if (slice.length <= SLICE_PREVIEW_MAX) return slice
  return `${slice.slice(0, SLICE_PREVIEW_MAX)}…`
}

/**
 * @param {{ lo: number, hi: number }[]} ranges
 * @param {string | undefined} sequence
 * @returns {Array<{
 *   id: string,
 *   kind: 'single' | 'range',
 *   label: string,
 *   detail?: string,
 *   lo: number,
 *   hi: number,
 * }>}
 */
export function formatSelectionRows(ranges, sequence) {
  return ranges.map(({ lo, hi }) => {
    const len = hi - lo + 1
    if (len === 1) {
      return {
        id: `${lo}`,
        kind: /** @type {'single'} */ ("single"),
        label: residueHighlightLabel(lo, sequence),
        lo,
        hi,
      }
    }
    return {
      id: `${lo}-${hi}`,
      kind: /** @type {'range'} */ ("range"),
      label: `${lo}–${hi} (${len} aa)`,
      detail: slicePreview(sequence, lo, hi),
      lo,
      hi,
    }
  })
}

/**
 * @param {Set<number>} set
 * @param {string | undefined} sequence
 */
export function selectionRowsFromSet(set, sequence) {
  const sorted = [...set].sort((a, b) => a - b)
  return formatSelectionRows(positionsToRanges(sorted), sequence)
}

/** @param {number} mag */
export function formatMagnification(mag) {
  if (!Number.isFinite(mag) || mag <= 1.001) return "1×"
  if (mag >= 10) return `${Math.round(mag)}×`
  const t = mag.toFixed(1)
  return t.endsWith(".0") ? `${Math.round(mag)}×` : `${t}×`
}

/**
 * Inclusive residue range + magnification vs full length.
 * @param {number} seqLen
 * @param {number} start 1-based display-start
 * @param {number} end 1-based display-end
 */
export function residueWindowZoomLabel(seqLen, start, end) {
  if (seqLen <= 0) return ""
  const s = Math.round(start)
  const e = Math.round(end)
  const span = Math.max(1, e - s + 1)
  const mag = seqLen / span
  return `${s}–${e} · ${formatMagnification(mag)}`
}

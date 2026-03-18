export function formatSeq(seq, maxLen = 80) {
  if (!seq) return '';
  return seq.length > maxLen ? seq.slice(0, maxLen) + '…' : seq;
}
export function cleanSequence(sequence) {
  return sequence
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('')
    .replace(/[\s\r]/g, '')
    .toUpperCase()
}

export function formatEvalue(v) {
  if (v === 0 || v < 1e-300) return '< 1e-300'
  return v.toExponential(1)
}

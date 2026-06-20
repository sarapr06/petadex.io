/** Keys must match `blocks` order in CathDomainNarrativeSections (first narrative wins for anchor). */
export const CATH_DOMAIN_NARRATIVE_KEYS = [
  "localization",
  "ptms",
  "catalyticResidues",
  "mechanisms",
  "interactingDomains",
  "function",
  "regulation",
  "variability",
  "structure",
  "labNotes",
]

/** @param {string} text */
export function extractFigureNumbers(text) {
  const s = String(text || "")
  const nums = new Set()
  let m
  const re = /Figure\s+(\d+)/gi
  while ((m = re.exec(s))) {
    const n = Number(m[1])
    if (Number.isInteger(n) && n > 0) nums.add(n)
  }
  return [...nums].sort((a, b) => a - b)
}

/**
 * First section (in narrative order) where each figure number appears.
 * @param {Record<string, string | undefined>} domain
 * @returns {Map<number, string>}
 */
export function getFirstNarrativeSectionKeyByFigure(domain, keys = CATH_DOMAIN_NARRATIVE_KEYS) {
  const m = new Map()
  for (const key of keys) {
    const text = domain[key]
    if (!text || typeof text !== "string") continue
    for (const n of extractFigureNumbers(text)) {
      if (!m.has(n)) m.set(n, key)
    }
  }
  return m
}

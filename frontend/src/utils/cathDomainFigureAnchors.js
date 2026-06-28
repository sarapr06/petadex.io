/** Keys must match narrative section order in CathDomainNarrativeSections. */
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
 * First section (in narrative order) where each figure number is mentioned in text.
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

function domainFigureCount(domain) {
  return Array.isArray(domain.figures) ? domain.figures.length : 0
}

/**
 * Section where each figure is rendered inline. Each figure appears exactly once.
 * Figure n is placed at the latest first-mention section among figures 1…n so that
 * displayed figures stay in numeric order (1, 2, 3…) as the reader scrolls.
 *
 * @param {Record<string, string | undefined>} domain
 * @returns {Map<number, string>}
 */
export function getFigureRenderSectionByNumber(domain, keys = CATH_DOMAIN_NARRATIVE_KEYS) {
  const firstMention = getFirstNarrativeSectionKeyByFigure(domain, keys)
  const sectionIndex = new Map(keys.map((k, i) => [k, i]))
  const total = domainFigureCount(domain)
  /** @type {Map<number, string>} */
  const renderSection = new Map()
  let maxIdx = -1
  let maxKey = keys[keys.length - 1]

  for (let n = 1; n <= total; n++) {
    const mentionKey = firstMention.get(n)
    if (mentionKey != null) {
      const idx = sectionIndex.get(mentionKey) ?? -1
      if (idx > maxIdx) {
        maxIdx = idx
        maxKey = mentionKey
      }
    }
    renderSection.set(n, maxKey)
  }

  return renderSection
}

/**
 * @param {Record<string, string | undefined>} domain
 * @returns {Map<string, number[]>} section key → figure numbers to render (sorted)
 */
export function getFiguresByRenderSection(domain, keys = CATH_DOMAIN_NARRATIVE_KEYS) {
  const renderSection = getFigureRenderSectionByNumber(domain, keys)
  /** @type {Map<string, number[]>} */
  const bySection = new Map()
  for (const [n, sectionKey] of renderSection) {
    if (!bySection.has(sectionKey)) bySection.set(sectionKey, [])
    bySection.get(sectionKey).push(n)
  }
  for (const nums of bySection.values()) nums.sort((a, b) => a - b)
  return bySection
}

/**
 * @param {Record<string, string | undefined>} domain
 * @param {string} sectionKey
 * @returns {number[]}
 */
export function getFigureNumbersForRenderSection(domain, sectionKey, keys = CATH_DOMAIN_NARRATIVE_KEYS) {
  return getFiguresByRenderSection(domain, keys).get(sectionKey) || []
}

import React from "react"

/** Split on URLs while keeping captures (odd indices are URLs). */
const URL_SPLIT_RE = /(https?:\/\/[^\s)\]]+)/gi

function normalizeUrl(u) {
  return String(u || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase()
}

/**
 * @param {string} urlToken
 * @param {{ label?: string, url?: string|null }[]} references
 */
function refIndexForUrlToken(urlToken, references) {
  const n = normalizeUrl(urlToken)
  if (!n) return -1
  let exact = -1
  let fuzzy = -1
  references.forEach((r, i) => {
    if (!r?.url) return
    const ru = normalizeUrl(r.url)
    if (!ru) return
    if (n === ru) exact = i
    else if (fuzzy < 0 && (n.startsWith(ru) || ru.startsWith(n))) fuzzy = i
  })
  return exact >= 0 ? exact : fuzzy
}

function refIndexForPmcToken(pmc, references) {
  const id = String(pmc).toUpperCase()
  return references.findIndex(r => r?.url && String(r.url).toUpperCase().includes(id))
}

/**
 * @param {{ numbered?: boolean, linkClassName?: string }} [options]
 */
function resolveOptions(linkClassNameOrOptions) {
  if (typeof linkClassNameOrOptions === "string") {
    return { numbered: true, linkClassName: linkClassNameOrOptions }
  }
  return { numbered: true, linkClassName: undefined, ...linkClassNameOrOptions }
}

/**
 * Render caption with citations linking to `#cath-ref-N`. URLs / PMC ids that match the
 * references list render as numbered links like [1] when `numbered` is true.
 *
 * @param {string} caption
 * @param {{ label?: string, url?: string|null }[]} references
 * @param {string | { numbered?: boolean, linkClassName?: string }} [linkClassNameOrOptions]
 */
export function renderCaptionWithReferenceAnchors(caption, references, linkClassNameOrOptions) {
  const refs = references || []
  const { numbered, linkClassName } = resolveOptions(linkClassNameOrOptions)
  const cls =
    linkClassName ||
    "text-accent font-semibold no-underline hover:underline decoration-accent/50 hover:text-accent-hover"

  const segments = String(caption || "").split(URL_SPLIT_RE)
  const nodes = []

  segments.forEach((seg, i) => {
    if (i % 2 === 0) {
      if (!seg) return
      const withPmc = []
      const PMC_TOKEN = /\b(PMC\d+)\b/gi
      let last = 0
      let m
      while ((m = PMC_TOKEN.exec(seg)) !== null) {
        if (m.index > last) withPmc.push(seg.slice(last, m.index))
        const pmc = m[1]
        const ri = refIndexForPmcToken(pmc, refs)
        if (ri >= 0) {
          const num = ri + 1
          withPmc.push(
            <a
              key={`pmc-${i}-${m.index}`}
              href={`#cath-ref-${num}`}
              className={cls}
              aria-label={`Reference ${num}`}
            >
              {numbered ? `[${num}]` : pmc}
            </a>,
          )
        } else {
          withPmc.push(pmc)
        }
        last = m.index + m[0].length
      }
      if (last < seg.length) withPmc.push(seg.slice(last))
      nodes.push(...withPmc)
      return
    }

    const ri = refIndexForUrlToken(seg, refs)
    if (ri >= 0) {
      const num = ri + 1
      nodes.push(
        <a key={`url-${i}`} href={`#cath-ref-${num}`} className={cls} aria-label={`Reference ${num}`}>
          {numbered ? `[${num}]` : seg}
        </a>,
      )
    } else {
      nodes.push(
        <a key={`url-ext-${i}`} href={seg} target="_blank" rel="noopener noreferrer" className={cls}>
          {seg}
        </a>,
      )
    }
  })

  return nodes.length ? nodes : null
}

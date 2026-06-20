import {
  isLightTheme,
  sequenceLetterFill,
  sequenceStripeFills,
} from "./nightingaleStripeColors.js"

const SVG_NS = "http://www.w3.org/2000/svg"
const STRIPE_GROUP_CLASS = "petadex-fv-sequence-stripes"
const DOT_GROUP_CLASS = "petadex-fv-sequence-dots"
const DOT_RADIUS = 1.75

/**
 * @param {HTMLElement} host
 */
function plotInnerWidth(host) {
  const clipRect =
    host.querySelector("#clip rect") ?? host.querySelector("clipPath rect")
  const w = clipRect ? parseFloat(clipRect.getAttribute("width") || "") : NaN
  if (Number.isFinite(w) && w > 0) return w
  const plot = host.querySelector("#svg-container")
  if (!plot) return 0
  try {
    return plot.getBBox().width
  } catch {
    return 0
  }
}

/**
 * Match feature-viewer scale: visible window maps to [5, width - 5].
 * @param {HTMLElement} host
 * @param {number} position 1-based
 * @param {{ lo: number, hi: number }} viewport
 */
function xForResidue(host, position, viewport) {
  const innerW = plotInnerWidth(host)
  if (innerW <= 0) return null
  const pad = 5
  const span = Math.max(1, viewport.hi - viewport.lo)
  const t = (position - viewport.lo) / span
  return pad + t * Math.max(0, innerW - 2 * pad)
}

/**
 * @param {SVGGElement} group
 * @param {string} key
 */
function stripeRectFor(group, key) {
  let rect = group.querySelector(`rect[data-pos="${key}"]`)
  if (!rect) {
    rect = document.createElementNS(SVG_NS, "rect")
    rect.setAttribute("data-pos", key)
    rect.setAttribute("clip-path", "url(#clip)")
    rect.style.pointerEvents = "none"
    group.appendChild(rect)
  }
  return rect
}

/**
 * @param {HTMLElement} host
 */
function removeStripeGroups(host) {
  host.querySelector(`.${STRIPE_GROUP_CLASS}`)?.remove()
  host.querySelector(`.${DOT_GROUP_CLASS}`)?.remove()
}

/**
 * @param {HTMLElement} host
 * @param {NodeListOf<Element> | Element[]} letters
 * @param {{ lo: number, hi: number }} viewport
 */
function syncLetterStripes(host, letters, viewport) {
  const seqGroup = host.querySelector(".seqGroup")
  if (!seqGroup) return

  let stripeG = seqGroup.querySelector(`g.${STRIPE_GROUP_CLASS}`)
  if (!stripeG) {
    stripeG = document.createElementNS(SVG_NS, "g")
    stripeG.setAttribute("class", STRIPE_GROUP_CLASS)
    seqGroup.insertBefore(stripeG, seqGroup.firstChild)
  }

  const { odd, even } = sequenceStripeFills(isLightTheme())
  const letterFill = sequenceLetterFill(isLightTheme())
  const nodes = [...letters]
  const keep = new Set()

  nodes.forEach((text, i) => {
    const position = viewport.lo + i
    const key = String(position)
    keep.add(key)

    const x = parseFloat(text.getAttribute("x") || "")
    const y = parseFloat(text.getAttribute("y") || "")
    const fontSize = parseFloat(text.getAttribute("font-size") || "10")
    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    let w = 8
    if (i < nodes.length - 1) {
      const xNext = parseFloat(nodes[i + 1].getAttribute("x") || "")
      if (Number.isFinite(xNext)) w = Math.abs(xNext - x)
    } else if (i > 0) {
      const xPrev = parseFloat(nodes[i - 1].getAttribute("x") || "")
      if (Number.isFinite(xPrev)) w = Math.abs(x - xPrev)
    }
    w = Math.max(4, w)

    const h = fontSize + 6
    const rect = stripeRectFor(stripeG, key)
    const rx = String(x - w / 2)
    const ry = String(y - fontSize - 1)
    const rw = String(w)
    const rh = String(h)
    const rf = position % 2 ? odd : even
    if (rect.getAttribute("x") !== rx) rect.setAttribute("x", rx)
    if (rect.getAttribute("y") !== ry) rect.setAttribute("y", ry)
    if (rect.getAttribute("width") !== rw) rect.setAttribute("width", rw)
    if (rect.getAttribute("height") !== rh) rect.setAttribute("height", rh)
    if (rect.getAttribute("fill") !== rf) rect.setAttribute("fill", rf)

    if (text.getAttribute("fill") !== letterFill) {
      text.setAttribute("fill", letterFill)
    }
  })

  stripeG.querySelectorAll("rect[data-pos]").forEach(rect => {
    const key = rect.getAttribute("data-pos") || ""
    if (!keep.has(key)) rect.remove()
  })
}

/**
 * Dotted sequence row when zoomed out (no letter glyphs).
 * @param {HTMLElement} host
 * @param {{ lo: number, hi: number }} viewport
 */
function syncCompactDots(host, viewport) {
  const line = host.querySelector("path.sequenceLine")
  const container = host.querySelector("#svg-container")
  if (!line || !container) {
    removeStripeGroups(host)
    return
  }

  let cy
  try {
    const bb = line.getBBox()
    cy = bb.y + bb.height / 2
  } catch {
    cy = parseFloat(line.getAttribute("y") || "") || 20
  }

  let dotG = container.querySelector(`g.${DOT_GROUP_CLASS}`)
  if (!dotG) {
    dotG = document.createElementNS(SVG_NS, "g")
    dotG.setAttribute("class", DOT_GROUP_CLASS)
    container.insertBefore(dotG, line.nextSibling)
  }

  const fill = sequenceLetterFill(isLightTheme())
  const keep = new Set()

  for (let p = viewport.lo; p <= viewport.hi; p++) {
    const x = xForResidue(host, p, viewport)
    if (x == null) continue
    const key = String(p)
    keep.add(key)
    let dot = dotG.querySelector(`circle[data-pos="${key}"]`)
    if (!dot) {
      dot = document.createElementNS(SVG_NS, "circle")
      dot.setAttribute("data-pos", key)
      dot.setAttribute("r", String(DOT_RADIUS))
      dot.setAttribute("clip-path", "url(#clip)")
      dot.style.pointerEvents = "none"
      dotG.appendChild(dot)
    }
    const cx = String(x)
    const cyStr = String(cy)
    if (dot.getAttribute("cx") !== cx) dot.setAttribute("cx", cx)
    if (dot.getAttribute("cy") !== cyStr) dot.setAttribute("cy", cyStr)
    if (dot.getAttribute("fill") !== fill) dot.setAttribute("fill", fill)
  }

  dotG.querySelectorAll("circle[data-pos]").forEach(dot => {
    const key = dot.getAttribute("data-pos") || ""
    if (!keep.has(key)) dot.remove()
  })

  host.querySelector(`.${STRIPE_GROUP_CLASS}`)?.remove()
}

/**
 * Zebra column backgrounds + letter ink (letters when zoomed in, dots when zoomed out).
 * @param {HTMLElement | null | undefined} host `.fv-prototype` root
 * @param {{ lo: number, hi: number }} viewport
 */
export function syncFeatureViewerSequenceStyle(host, viewport) {
  if (!host) return

  const letters = host.querySelectorAll(".seqGroup text.AA")
  if (letters.length > 0) {
    host.querySelector(`.${DOT_GROUP_CLASS}`)?.remove()
    syncLetterStripes(host, letters, viewport)
    return
  }

  if (host.querySelector("path.sequenceLine")) {
    syncCompactDots(host, viewport)
    return
  }

  removeStripeGroups(host)
}

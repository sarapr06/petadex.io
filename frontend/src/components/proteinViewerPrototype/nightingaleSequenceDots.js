import {
  isLightTheme,
  SEQUENCE_AXIS_INK_VAR,
  sequenceAxisTickFill,
  sequenceLetterFill,
  sequenceStripeFills,
} from "./nightingaleStripeColors.js"

const SVG_NS = "http://www.w3.org/2000/svg"
const DOT_GROUP_CLASS = "petadex-sequence-dots"
const STRIPE_GROUP_CLASS = "petadex-sequence-stripes"
const LETTER_STRIPE_GROUP_CLASS = "petadex-sequence-letter-stripes"
const DOT_RADIUS = 1.75

/** @type {WeakMap<HTMLElement, MutationObserver>} */
const stripeGuards = new WeakMap()

/** @type {WeakMap<HTMLElement, MutationObserver>} */
const axisTickGuards = new WeakMap()

/** @type {WeakMap<HTMLElement, boolean>} */
const stripeSyncInProgress = new WeakMap()

/** @type {WeakMap<HTMLElement, boolean>} */
const axisSyncInProgress = new WeakMap()

let sequenceRenderD3Patched = false

const IGNORED_MUTATION_GROUPS = [
  "g.highlighted",
  "g.petadex-sequence-dots",
  "g.petadex-sequence-stripes",
  "g.petadex-sequence-letter-stripes",
]

/**
 * Keep residue letters near-black in dark mode (library defaults to light ink).
 * @param {HTMLElement | null | undefined} seqHost
 */
export function syncNightingaleSequenceLetterFill(seqHost) {
  const root = seqHost?.shadowRoot
  if (!root) return
  const fill = sequenceLetterFill(isLightTheme())
  root.querySelectorAll("g.sequence text.base").forEach(text => {
    if (text.getAttribute("fill") !== fill) text.setAttribute("fill", fill)
    text.style.setProperty("fill", fill, "important")
  })
}

/**
 * Toggle host flag used by shadow CSS `:host([data-petadex-letters-visible])`.
 * @param {HTMLElement | null | undefined} seqHost
 */
/**
 * @param {HTMLElement} seqHost
 * @param {boolean} lettersVisible
 */
function applySequenceAxisInk(seqHost, lettersVisible) {
  const light = isLightTheme()
  const ink = sequenceAxisTickFill(light, lettersVisible)
  seqHost.style.setProperty(SEQUENCE_AXIS_INK_VAR, ink)
  if (lettersVisible) {
    seqHost.style.setProperty("color", ink, "important")
  } else {
    seqHost.style.removeProperty("color")
  }
}

export function syncNightingaleSequenceLettersMode(seqHost) {
  if (!seqHost) return
  const visible = shouldShowSequenceLetters(seqHost)
  seqHost.toggleAttribute("data-petadex-letters-visible", visible)
  applySequenceAxisInk(seqHost, visible)
}

/**
 * Sequence scale ticks (100, 120, …): black on zebra stripes when zoomed to letters.
 * @param {HTMLElement | null | undefined} seqHost
 */
export function syncNightingaleSequenceAxisTicks(seqHost) {
  const root = seqHost?.shadowRoot
  if (!seqHost || !root) return
  if (axisSyncInProgress.get(seqHost)) return
  axisSyncInProgress.set(seqHost, true)
  try {
  syncNightingaleSequenceLettersMode(seqHost)
  const lettersVisible = shouldShowSequenceLetters(seqHost)
  const fill = sequenceAxisTickFill(isLightTheme(), lettersVisible)
  applySequenceAxisInk(seqHost, lettersVisible)

  const svg = root.querySelector("svg.container, svg")
  if (svg instanceof SVGSVGElement) {
    svg.style.setProperty("color", fill, "important")
  }

  const axisG = root.querySelector("g.x.axis")
  if (axisG instanceof SVGGElement) {
    axisG.style.setProperty("color", fill, "important")
  }

  root.querySelectorAll("g.x.axis text").forEach(text => {
    text.removeAttribute("fill")
    text.setAttribute("fill", fill)
    text.style.setProperty("fill", fill, "important")
    text.style.setProperty("color", fill, "important")
  })
  } finally {
    axisSyncInProgress.set(seqHost, false)
  }
}

/**
 * Nightingale hides residue letters when they would overlap; show dots until the
 * library renders visible `text.base` nodes (same idea as feature-viewer’s dashed line).
 * @param {HTMLElement | null | undefined} seqHost
 */
export function shouldShowSequenceLetters(seqHost) {
  if (!seqHost?.shadowRoot) return false
  const root = seqHost.shadowRoot
  if (root.querySelector(`g.${LETTER_STRIPE_GROUP_CLASS} rect`)) return true

  const ftWidth =
    typeof seqHost.getSingleBaseWidth === "function"
      ? seqHost.getSingleBaseWidth()
      : 0
  const chWidth = Number(seqHost.chWidth) || 0
  if (ftWidth > 0 && chWidth > 0 && ftWidth >= chWidth) return true

  const seqG = root.querySelector("g.sequence")
  if (!seqG) return false
  const opacity = parseFloat(seqG.style.opacity || "1")
  const letters = root.querySelectorAll("g.sequence text.base")
  return letters.length > 0 && opacity >= 0.95
}

/**
 * Nightingale calls renderD3 on zoom; re-apply axis ink after every library paint.
 */
/**
 * @returns {boolean} whether the prototype hook is active
 */
export function ensureNightingaleSequenceRenderPatch() {
  if (sequenceRenderD3Patched || typeof customElements === "undefined") {
    return sequenceRenderD3Patched
  }
  const ctor = customElements.get("nightingale-sequence")
  const proto = ctor?.prototype
  if (!proto || typeof proto.renderD3 !== "function") return false
  if (proto.renderD3.__petadexAxisInk) {
    sequenceRenderD3Patched = true
    return true
  }

  const original = proto.renderD3
  proto.renderD3 = function renderD3WithAxisInk() {
    original.call(this)
    syncNightingaleSequenceAxisTicks(this)
    syncNightingaleSequenceLetterFill(this)
  }
  proto.renderD3.__petadexAxisInk = true
  sequenceRenderD3Patched = true
  return true
}

function scheduleNightingaleSequenceRenderPatch() {
  if (ensureNightingaleSequenceRenderPatch()) return
  if (typeof customElements === "undefined") return
  customElements.whenDefined("nightingale-sequence").then(() => {
    ensureNightingaleSequenceRenderPatch()
  })
}

/**
 * @param {HTMLElement | null | undefined} seqHost
 * @param {SVGGElement | null | undefined} seqG
 */
function sequenceDotY(seqHost, seqG) {
  const text = seqHost?.shadowRoot?.querySelector("g.sequence text.base")
  if (text) {
    const y = parseFloat(text.getAttribute("y") || "")
    if (Number.isFinite(y)) return y
  }
  const transform = seqG?.getAttribute("transform") || ""
  const m = /translate\(\s*0\s*,\s*([\d.]+)\s*\)/.exec(transform)
  if (m) return parseFloat(m[1]) + 4
  const marginTop = Number(seqHost?.["margin-top"]) || 10
  const h =
    typeof seqHost?.getHeightWithMargins === "function"
      ? seqHost.getHeightWithMargins()
      : Number(seqHost?.height) || 56
  return marginTop + 0.75 * h
}

/**
 * @param {HTMLElement} seqHost
 * @param {string} sequence
 */
function residueMarkers(seqHost, sequence) {
  const len = sequence.length
  if (!len) return []

  const ds = Math.max(1, Math.round(Number(seqHost["display-start"]) || 1))
  const de = Math.min(len, Math.round(Number(seqHost["display-end"]) || len))
  const first = Math.floor(Math.max(0, ds - 1))
  const last = Math.ceil(Math.min(len, de))

  const ftWidth =
    typeof seqHost.getSingleBaseWidth === "function"
      ? seqHost.getSingleBaseWidth()
      : 0
  if (!Number.isFinite(ftWidth) || ftWidth <= 0) return []

  const half = ftWidth / 2
  /** @type {{ position: number, x: number }[]} */
  const out = []
  for (let i = first; i < last; i++) {
    const position = 1 + i
    if (typeof seqHost.getXFromSeqPosition !== "function") continue
    const x = seqHost.getXFromSeqPosition(position) + half
    if (!Number.isFinite(x)) continue
    out.push({ position, x })
  }
  return out
}

/**
 * @param {HTMLElement | null | undefined} seqHost
 */
function removeSequenceDots(seqHost) {
  const root = seqHost?.shadowRoot
  root?.querySelector(`g.${DOT_GROUP_CLASS}`)?.remove()
  root?.querySelector(`g.${STRIPE_GROUP_CLASS}`)?.remove()
  root?.querySelector(`g.${LETTER_STRIPE_GROUP_CLASS}`)?.remove()
}

/**
 * Remove Nightingale's default #ccc / #eee column rects (they repaint every zoom).
 * @param {HTMLElement | null | undefined} seqHost
 */
export function purgeNightingaleLibrarySequenceBackground(seqHost) {
  const root = seqHost?.shadowRoot
  if (!root) return
  root.querySelectorAll("g.background rect").forEach(rect => {
    rect.remove()
  })
}

/** @deprecated use {@link purgeNightingaleLibrarySequenceBackground} */
export const hideNightingaleLibrarySequenceBackground =
  purgeNightingaleLibrarySequenceBackground

/**
 * @param {number} position 1-based residue index
 */
function stripeParity(position) {
  return Math.round(position) % 2 ? "odd" : "even"
}

/**
 * @param {SVGRectElement} rect
 * @param {number} position
 * @param {string} fill
 */
function applyStripeFill(rect, position, fill) {
  const parity = stripeParity(position)
  rect.setAttribute("data-pos", String(position))
  rect.setAttribute("data-parity", parity)
  rect.setAttribute("fill", fill)
  rect.style.setProperty("fill", fill, "important")
  rect.style.setProperty("opacity", "1", "important")
  rect.style.pointerEvents = "none"
}

/**
 * Zebra columns behind visible residue letters.
 * @param {HTMLElement} seqHost
 */
function syncLetterStripes(seqHost) {
  const root = seqHost.shadowRoot
  if (!root) return

  const letters = [...root.querySelectorAll("g.sequence text.base")]
  if (!letters.length) {
    root.querySelector(`g.${LETTER_STRIPE_GROUP_CLASS}`)?.remove()
    syncNightingaleSequenceLettersMode(seqHost)
    return
  }

  syncNightingaleSequenceLettersMode(seqHost)
  purgeNightingaleLibrarySequenceBackground(seqHost)

  const ds = Math.max(1, Math.round(Number(seqHost["display-start"]) || 1))
  const light = isLightTheme()
  const { odd, even } = sequenceStripeFills(light)

  const seqG = root.querySelector("g.sequence")
  const marginTop = Number(seqHost["margin-top"]) || 10
  const bandHeight =
    typeof seqHost.getHeightWithMargins === "function"
      ? seqHost.getHeightWithMargins()
      : Number(seqHost.height) || 56
  const ftWidth =
    typeof seqHost.getSingleBaseWidth === "function"
      ? seqHost.getSingleBaseWidth()
      : 0

  let stripeG = root.querySelector(`g.${LETTER_STRIPE_GROUP_CLASS}`)
  if (!stripeG) {
    stripeG = document.createElementNS(SVG_NS, "g")
    stripeG.setAttribute("class", LETTER_STRIPE_GROUP_CLASS)
    if (seqG?.parentNode) {
      seqG.parentNode.insertBefore(stripeG, seqG)
    } else {
      root.querySelector("svg")?.appendChild(stripeG)
    }
  }

  const keep = new Set()
  const half = Number.isFinite(ftWidth) && ftWidth > 0 ? ftWidth / 2 : 4

  letters.forEach((text, i) => {
    const position = ds + i
    const key = String(position)
    const x = parseFloat(text.getAttribute("x") || "")
    if (!Number.isFinite(x)) return

    let w = ftWidth
    if (!Number.isFinite(w) || w <= 0) {
      if (i < letters.length - 1) {
        const xNext = parseFloat(letters[i + 1].getAttribute("x") || "")
        if (Number.isFinite(xNext)) w = Math.abs(xNext - x)
      } else if (i > 0) {
        const xPrev = parseFloat(letters[i - 1].getAttribute("x") || "")
        if (Number.isFinite(xPrev)) w = Math.abs(x - xPrev)
      }
      w = Math.max(4, w || 8)
    }

    keep.add(key)
    let rect = stripeG.querySelector(`rect[data-pos="${key}"]`)
    if (!rect) {
      rect = document.createElementNS(SVG_NS, "rect")
      stripeG.appendChild(rect)
    }
    rect.setAttribute("x", String(x - half))
    rect.setAttribute("y", String(marginTop))
    rect.setAttribute("width", String(w))
    rect.setAttribute("height", String(bandHeight))
    const fill = stripeParity(position) === "odd" ? odd : even
    applyStripeFill(rect, position, fill)
  })

  stripeG.querySelectorAll("rect[data-pos]").forEach(rect => {
    const key = rect.getAttribute("data-pos") || ""
    if (!keep.has(key)) rect.remove()
  })

  purgeNightingaleLibrarySequenceBackground(seqHost)
}

/**
 * Zebra column backgrounds when letters are hidden (compact / dotted view).
 * @param {HTMLElement} seqHost
 * @param {{ position: number, x: number }[]} positions
 * @param {number} ftWidth
 */
function syncCompactStripes(seqHost, positions, ftWidth) {
  const root = seqHost.shadowRoot
  if (!root || !positions.length) return

  const svg = root.querySelector("svg.container") || root.querySelector("svg")
  if (!svg) return

  purgeNightingaleLibrarySequenceBackground(seqHost)

  const marginTop = Number(seqHost["margin-top"]) || 10
  const bandHeight =
    typeof seqHost.getHeightWithMargins === "function"
      ? seqHost.getHeightWithMargins()
      : Number(seqHost.height) || 56

  let group = root.querySelector(`g.${STRIPE_GROUP_CLASS}`)
  if (!group) {
    group = document.createElementNS(SVG_NS, "g")
    group.setAttribute("class", STRIPE_GROUP_CLASS)
    const bg = root.querySelector("g.background")
    const seqG = root.querySelector("g.sequence")
    if (seqG?.parentNode) {
      seqG.parentNode.insertBefore(group, seqG)
    } else if (bg?.parentNode) {
      bg.parentNode.insertBefore(group, bg.nextSibling)
    } else {
      svg.appendChild(group)
    }
  }

  const light = isLightTheme()
  const { odd, even } = sequenceStripeFills(light)
  const half = ftWidth / 2
  const keep = new Set()

  for (const { position, x } of positions) {
    const key = String(position)
    keep.add(key)
    let rect = group.querySelector(`rect[data-pos="${key}"]`)
    if (!rect) {
      rect = document.createElementNS(SVG_NS, "rect")
      group.appendChild(rect)
    }
    rect.setAttribute("x", String(x - half))
    rect.setAttribute("y", String(marginTop))
    rect.setAttribute("width", String(ftWidth))
    rect.setAttribute("height", String(bandHeight))
    const fill = stripeParity(position) === "odd" ? odd : even
    applyStripeFill(rect, position, fill)
  }

  group.querySelectorAll("rect[data-pos]").forEach(rect => {
    const key = rect.getAttribute("data-pos") || ""
    if (!keep.has(key)) rect.remove()
  })

  purgeNightingaleLibrarySequenceBackground(seqHost)
}

/**
 * @param {HTMLElement | null | undefined} seqHost
 * @param {string | undefined} sequence
 */
export function syncNightingaleSequenceDots(seqHost, sequence) {
  if (!seqHost?.shadowRoot || !sequence?.length) {
    removeSequenceDots(seqHost)
    return
  }

  purgeNightingaleLibrarySequenceBackground(seqHost)

  if (shouldShowSequenceLetters(seqHost)) {
    removeSequenceDots(seqHost)
    syncLetterStripes(seqHost)
    syncNightingaleSequenceLetterFill(seqHost)
    syncNightingaleSequenceAxisTicks(seqHost)
    return
  }

  seqHost.shadowRoot
    ?.querySelector(`g.${LETTER_STRIPE_GROUP_CLASS}`)
    ?.remove()
  syncNightingaleSequenceLettersMode(seqHost)

  const positions = residueMarkers(seqHost, sequence)
  if (!positions.length) {
    removeSequenceDots(seqHost)
    return
  }

  const ftWidth =
    typeof seqHost.getSingleBaseWidth === "function"
      ? seqHost.getSingleBaseWidth()
      : 0

  const root = seqHost.shadowRoot
  const svg = root.querySelector("svg.container") || root.querySelector("svg")
  if (!svg) return

  if (Number.isFinite(ftWidth) && ftWidth > 0) {
    syncCompactStripes(seqHost, positions, ftWidth)
  }

  const seqG = root.querySelector("g.sequence")
  let group = root.querySelector(`g.${DOT_GROUP_CLASS}`)
  if (!group) {
    group = document.createElementNS(SVG_NS, "g")
    group.setAttribute("class", DOT_GROUP_CLASS)
    if (seqG?.parentNode) {
      seqG.parentNode.insertBefore(group, seqG.nextSibling)
    } else {
      svg.appendChild(group)
    }
  }

  group.setAttribute("transform", seqG?.getAttribute("transform") || "")
  const y = sequenceDotY(seqHost, seqG)
  const fill = sequenceLetterFill(isLightTheme())

  /** @type {Map<string, SVGCircleElement>} */
  const existing = new Map(
    [...group.querySelectorAll("circle")].map(c => [
      c.getAttribute("data-pos") || "",
      c,
    ]),
  )
  const keep = new Set()

  for (const { position, x } of positions) {
    const key = String(position)
    keep.add(key)
    let dot = existing.get(key)
    if (!dot) {
      dot = document.createElementNS(SVG_NS, "circle")
      dot.setAttribute("data-pos", key)
      dot.setAttribute("r", String(DOT_RADIUS))
      dot.style.pointerEvents = "none"
      group.appendChild(dot)
    }
    dot.setAttribute("cx", String(x))
    dot.setAttribute("cy", String(y))
    dot.setAttribute("fill", fill)
  }

  for (const [key, dot] of existing) {
    if (!keep.has(key)) dot.remove()
  }

  purgeNightingaleLibrarySequenceBackground(seqHost)
}

/**
 * Column highlight rects live in `g.highlighted` — ignore those mutations so the
 * stripe guard does not fight hover highlighting (infinite rAF loop / frozen UI).
 * @param {MutationRecord} mutation
 */
/**
 * @param {Node} node
 */
function isIgnoredStripeMutationNode(node) {
  if (!(node instanceof Element)) return false
  return IGNORED_MUTATION_GROUPS.some(sel => Boolean(node.closest(sel)))
}

/**
 * @param {MutationRecord} mutation
 */
export function mutationAffectsStripeGuard(mutation) {
  if (mutation.type === "attributes") {
    return !isIgnoredStripeMutationNode(mutation.target)
  }

  if (mutation.type === "childList") {
    for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
      if (node instanceof Element && !isIgnoredStripeMutationNode(node)) {
        return true
      }
    }
    return false
  }

  return true
}

/**
 * @param {HTMLElement | null | undefined} seqHost
 * @param {string | undefined} sequence
 */
export function paintNightingaleSequenceChrome(seqHost, sequence) {
  if (!seqHost?.shadowRoot) return
  if (stripeSyncInProgress.get(seqHost)) return
  stripeSyncInProgress.set(seqHost, true)
  try {
    purgeNightingaleLibrarySequenceBackground(seqHost)
    syncNightingaleSequenceLetterFill(seqHost)
    syncNightingaleSequenceDots(seqHost, sequence)
    syncNightingaleSequenceAxisTicks(seqHost)
  } finally {
    stripeSyncInProgress.set(seqHost, false)
    requestAnimationFrame(() => {
      syncNightingaleSequenceAxisTicks(seqHost)
      requestAnimationFrame(() => syncNightingaleSequenceAxisTicks(seqHost))
    })
  }
}

/**
 * Strip library #ccc rects whenever Nightingale repaints the sequence row.
 * @param {HTMLElement | null | undefined} seqHost
 * @param {string | undefined} sequence
 */
export function attachNightingaleSequenceStripeGuard(seqHost, sequence) {
  scheduleNightingaleSequenceRenderPatch()
  if (stripeGuards.has(seqHost)) return
  if (!seqHost?.shadowRoot) return

  const root = seqHost.shadowRoot
  let raf = 0
  const run = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      paintNightingaleSequenceChrome(seqHost, sequence)
    })
  }

  run()

  const mo = new MutationObserver(mutations => {
    if (!mutations.some(mutationAffectsStripeGuard)) return
    run()
  })
  mo.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["fill", "opacity", "style", "display"],
  })

  stripeGuards.set(seqHost, mo)
  attachNightingaleSequenceAxisTickGuard(seqHost)
}

/**
 * Nightingale re-calls renderD3 after our paint; keep axis tick ink on stripes.
 * @param {HTMLElement} seqHost
 */
function attachNightingaleSequenceAxisTickGuard(seqHost) {
  if (axisTickGuards.has(seqHost) || !seqHost?.shadowRoot) return

  let raf = 0
  const syncAxis = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => syncNightingaleSequenceAxisTicks(seqHost))
  }

  const bind = () => {
    const axis = seqHost.shadowRoot?.querySelector("g.x.axis")
    if (!axis) return null
    const axisMo = new MutationObserver(() => syncAxis())
    axisMo.observe(axis, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["fill", "style", "y", "font-size", "color"],
    })
    axisTickGuards.set(seqHost, axisMo)
    syncAxis()
    return axisMo
  }

  if (!bind()) {
    const boot = new MutationObserver(() => {
      if (bind()) boot.disconnect()
    })
    boot.observe(seqHost.shadowRoot, { childList: true, subtree: true })
    axisTickGuards.set(seqHost, boot)
  }
}

/**
 * @param {HTMLElement | null | undefined} seqHost
 */
export function detachNightingaleSequenceStripeGuard(seqHost) {
  stripeGuards.get(seqHost)?.disconnect()
  axisTickGuards.get(seqHost)?.disconnect()
  if (seqHost) {
    stripeGuards.delete(seqHost)
    axisTickGuards.delete(seqHost)
    seqHost.removeAttribute("data-petadex-letters-visible")
    seqHost.style.removeProperty(SEQUENCE_AXIS_INK_VAR)
    seqHost.style.removeProperty("color")
  }
}

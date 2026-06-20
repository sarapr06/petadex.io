import {
  attachNightingaleSequenceStripeGuard,
  ensureNightingaleSequenceRenderPatch,
  paintNightingaleSequenceChrome,
} from "./nightingaleSequenceDots.js"
import {
  isLightTheme,
  SEQUENCE_AXIS_INK_VAR,
  sequenceLetterFill,
  sequenceStripeFills,
} from "./nightingaleStripeColors.js"

const STYLE_ID = "petadex-ng-theme"

export { isLightTheme, sequenceStripeFills }

function themeCss(light, { navigation = false } = {}) {
  const seqLetter = sequenceLetterFill(light)
  const seqAxisOnStripes = sequenceLetterFill(light)
  const { odd, even } = sequenceStripeFills(light)
  const axisText = light ? "oklch(0.32 0 0)" : "oklch(0.92 0 0)"
  const stroke = light ? "oklch(0.55 0 0)" : "oklch(0.72 0 0)"
  const zoomFill = light ? "oklch(0.35 0 0)" : "oklch(0.55 0 0)"
  const zoomOpacity = light ? "0.18" : "0.35"

  /** Axis ticks use fill=currentColor; ink comes from inherited --petadex-seq-axis-ink on :host. */
  const sequenceAxisCss = navigation
    ? ""
    : `
    :host,
    :host svg,
    g.x.axis,
    g.x.axis text,
    g.x.axis .tick text {
      color: var(${SEQUENCE_AXIS_INK_VAR}, ${axisText}) !important;
    }
    g.x.axis .tick text,
    g.x.axis text {
      fill: var(${SEQUENCE_AXIS_INK_VAR}, ${axisText}) !important;
    }
    :host([data-petadex-letters-visible]) g.x.axis .tick text,
    :host([data-petadex-letters-visible]) g.x.axis text {
      fill: ${seqAxisOnStripes} !important;
      color: ${seqAxisOnStripes} !important;
    }
  `

  const navLabelStyle = navigation
    ? `
    .axis .tick text {
      font-size: 10px;
      font-weight: 500;
    }
  `
    : ""

  const darkStripes = light
    ? ""
    : `
    g.background,
    g.background rect,
    g.background rect.base_bg {
      display: none !important;
    }
    g.petadex-sequence-letter-stripes rect[data-parity="odd"],
    g.petadex-sequence-stripes rect[data-parity="odd"] {
      fill: ${odd} !important;
    }
    g.petadex-sequence-letter-stripes rect[data-parity="even"],
    g.petadex-sequence-stripes rect[data-parity="even"] {
      fill: ${even} !important;
    }
  `

  return `
    g.sequence text.base {
      fill: ${seqLetter} !important;
    }
    g.background rect,
    g.background rect.base_bg {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      fill: transparent !important;
    }
    ${darkStripes}
    ${navigation
      ? `
    g.x.axis {
      color: ${axisText} !important;
    }
    g.x.axis .tick text,
    .axis .tick text,
    text.start-label,
    text.end-label {
      fill: ${axisText} !important;
      color: ${axisText} !important;
    }
    `
      : ""}
    ${sequenceAxisCss}
    .axis path,
    .axis line,
    line.cover {
      stroke: ${stroke};
    }
    polygon.zoom-polygon {
      fill: ${zoomFill};
      fill-opacity: ${zoomOpacity};
    }
    text.start-label,
    text.end-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    ${navLabelStyle}
  `
}

/**
 * @param {HTMLElement} host
 * @param {{ navigation?: boolean }} [opts]
 */
function ensureShadowStyle(host, opts = {}) {
  const root = host?.shadowRoot
  if (!root) return
  let el = root.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement("style")
    el.id = STYLE_ID
    root.appendChild(el)
  }
  el.textContent = themeCss(isLightTheme(), opts)
}

/**
 * Re-apply sequence shadow theme after stripe/letter paint (zoomed-in axis tick color).
 * @param {HTMLElement | null | undefined} seqHost
 */
export function refreshSequenceShadowTheme(seqHost) {
  if (!seqHost) return
  ensureShadowStyle(seqHost)
}

/**
 * @param {SVGGElement | null | undefined} axisG
 * @returns {number | null}
 */
function navigationAxisTranslateY(axisG) {
  if (!axisG) return null
  const t = axisG.getAttribute("transform") || ""
  const m = /translate\(\s*[^,]+,\s*([\d.]+)\s*\)/.exec(t)
  return m ? Number(m[1]) : null
}

/**
 * Place scale ticks (50, 100, …) and window min/max inside the zoom wedge polygon.
 * Nightingale draws the axis at the bottom; labels should sit in the trapezoid band.
 * @param {HTMLElement | null | undefined} navHost
 */
function layoutNavigationScaleLabels(navHost) {
  const root = navHost?.shadowRoot
  if (!root) return

  const svg = root.querySelector("svg")
  const height =
    Number(navHost?.height) ||
    Number(svg?.getAttribute("height")) ||
    svg?.getBoundingClientRect().height ||
    56

  // Wedge runs from ~50% height (brush line) to the bottom edge.
  const labelY = Math.round(height * 0.68)
  let axisY = navigationAxisTranslateY(
    /** @type {SVGGElement | null} */ (root.querySelector("g.x.axis")),
  )
  if (axisY == null || !Number.isFinite(axisY) || axisY < height * 0.35) {
    axisY = Math.round(height - 10)
  }

  const relY = labelY - axisY

  root.querySelectorAll(".axis .tick").forEach(tick => {
    const text = tick.querySelector("text")
    const line = tick.querySelector("line")
    if (text) {
      text.setAttribute("dy", "0.35em")
      text.setAttribute("y", String(relY))
    }
    if (line) {
      line.setAttribute("y1", String(relY))
      line.setAttribute("y2", "0")
    }
  })

  root.querySelectorAll("text.start-label, text.end-label").forEach(el => {
    el.setAttribute("y", String(labelY))
  })
}

/**
 * Re-run Nightingale navigation layout (brush window, zoom wedge, start/end labels).
 * Do not patch polygon/label coordinates manually — that desyncs the brush.
 * @param {HTMLElement | null | undefined} navHost
 */
export function refreshNavigationViewport(navHost) {
  if (!navHost) return
  const nav = /** @type {{ onDimensionsChange?: () => void, updateLabels?: () => void, updatePolygon?: () => void }} */ (
    navHost
  )
  if (typeof nav.onDimensionsChange === "function") {
    nav.onDimensionsChange()
  } else {
    nav.updateLabels?.()
    nav.updatePolygon?.()
  }
  layoutNavigationScaleLabels(navHost)
}

/** @deprecated use {@link refreshNavigationViewport} */
export const patchNavigationViewportLabels = refreshNavigationViewport

/**
 * @param {{ navigation?: HTMLElement | null, sequence?: HTMLElement | null, line?: HTMLElement | null, tracks?: (HTMLElement | null | undefined)[] }} hosts
 * @param {string | undefined} sequenceText — full sequence for compact-mode dots
 */
export function applyNightingaleChromeTheme(hosts, sequenceText) {
  ensureNightingaleSequenceRenderPatch()
  const all = [
    hosts.navigation,
    hosts.sequence,
    hosts.line,
    ...(hosts.tracks || []),
  ].filter(Boolean)

  if (hosts.navigation) {
    ensureShadowStyle(hosts.navigation, { navigation: true })
  }

  for (const host of [hosts.sequence, hosts.line, ...(hosts.tracks || [])].filter(
    Boolean,
  )) {
    ensureShadowStyle(host)
  }

  refreshNavigationViewport(hosts.navigation)
  const seqHost = hosts.sequence
  if (seqHost) {
    ensureShadowStyle(seqHost)
    attachNightingaleSequenceStripeGuard(seqHost, sequenceText)
    paintNightingaleSequenceChrome(seqHost, sequenceText)
  }
}

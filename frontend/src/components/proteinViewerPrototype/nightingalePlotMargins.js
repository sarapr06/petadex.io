/** Until layout is measured — Nightingale `margin-left` default is 10px. */
const FALLBACK = { left: 10, right: 10 }

/**
 * Width for `nightingale-manager` children — content area inside `.nightingale-chrome`
 * padding, not the padded client box (otherwise the nav end label is clipped).
 * @param {HTMLElement | null | undefined} chromeEl `.nightingale-chrome`
 * @param {HTMLElement | null | undefined} [wrapEl] fallback outer container
 */
export function measureNightingaleViewerWidth(chromeEl, wrapEl) {
  if (chromeEl) {
    const mgr = chromeEl.querySelector("nightingale-manager")
    const mgrW = mgr?.clientWidth ?? 0
    if (mgrW >= 320) return Math.floor(mgrW)

    const style = getComputedStyle(chromeEl)
    const padL = parseFloat(style.paddingLeft) || 0
    const padR = parseFloat(style.paddingRight) || 0
    const contentW = chromeEl.clientWidth - padL - padR
    if (contentW >= 320) return Math.floor(contentW)
  }

  const wrapW = wrapEl?.clientWidth ?? 0
  if (wrapW >= 320) return Math.floor(wrapW)
  return 960
}

/**
 * @param {HTMLElement} host
 * @param {number} ds
 * @param {number} de
 * @returns {{ left: number, right: number } | null}
 */
function plotScreenBounds(host, ds, de) {
  const svg = host.shadowRoot?.querySelector("svg")
  if (!svg || typeof host.getXFromSeqPosition !== "function") return null

  const half =
    typeof host.getSingleBaseWidth === "function"
      ? host.getSingleBaseWidth() / 2
      : 0

  const ctm = svg.getScreenCTM()
  if (!ctm) return null

  const svgXToScreen = svgX => {
    const pt = svg.createSVGPoint()
    pt.x = svgX
    pt.y = 0
    return pt.matrixTransform(ctm).x
  }

  const left = svgXToScreen(host.getXFromSeqPosition(ds) - half)
  const right = svgXToScreen(host.getXFromSeqPosition(de) + half)
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) {
    return null
  }
  return { left, right }
}

/**
 * Align overview ruler with Nightingale sequence + track plot columns.
 * @param {HTMLElement | null | undefined} drawWrap — `fv-overview-nav` box (same width as ruler SVG)
 * @param {HTMLElement | null | undefined} seqHost
 * @param {(HTMLElement | null | undefined)[]} [trackHosts]
 */
export function measureNightingaleOverviewMargins(
  drawWrap,
  seqHost,
  trackHosts = [],
) {
  if (!drawWrap || !seqHost?.shadowRoot) return FALLBACK

  const drawRect = drawWrap.getBoundingClientRect()
  if (drawRect.width < 40) return FALLBACK

  const ds = Math.max(1, Math.round(Number(seqHost["display-start"]) || 1))
  const de = Math.min(
    Number(seqHost.length) || ds,
    Math.round(Number(seqHost["display-end"]) || ds),
  )

  const hosts = [seqHost, ...trackHosts.filter(Boolean)]
  let plotLeft = Infinity
  let plotRight = -Infinity

  for (const host of hosts) {
    const bounds = plotScreenBounds(host, ds, de)
    if (!bounds) continue
    plotLeft = Math.min(plotLeft, bounds.left)
    plotRight = Math.max(plotRight, bounds.right)
  }

  if (!Number.isFinite(plotLeft) || !Number.isFinite(plotRight)) {
    return FALLBACK
  }

  const drawStyle = getComputedStyle(drawWrap)
  const padL = parseFloat(drawStyle.paddingLeft) || 0
  const padR = parseFloat(drawStyle.paddingRight) || 0
  const innerLeft = drawRect.left + padL
  const innerRight = drawRect.right - padR
  const innerWidth = innerRight - innerLeft

  if (innerWidth < 40) return FALLBACK

  let left = Math.round(plotLeft - innerLeft)
  let right = Math.round(innerRight - plotRight)

  left = Math.max(0, left)
  right = Math.max(8, right)

  const maxInset = Math.max(24, innerWidth * 0.35)
  return {
    left: Math.min(left, maxInset),
    right: Math.min(right, maxInset),
  }
}

/** Top margin baked into feature-viewer SVG (`margin.top`). */
const FV_MARGIN_TOP = 10
/** Padding below the bottom axis tick labels. */
const FV_PADDING_BOTTOM = 12
/** Temporary clip height used only while measuring (avoids tight-clip feedback loops). */
const FV_MEASURE_CLIP_HEIGHT = 4096

/**
 * @param {Element} el
 */
function shouldSkipForTrimBBox(el) {
  if (!(el instanceof SVGGraphicsElement)) return true
  if (el.closest("defs, clipPath, filter")) return true
  const cls = el.getAttribute("class") || ""
  if (/\b(background|brush)\b/i.test(cls)) return true
  if (/\b(petadex-fv-sequence|fv-residue-column)\b/i.test(cls)) return true
  return false
}

/**
 * @param {SVGGraphicsElement} el
 * @param {number} bottom
 */
function extendBottomFromBBox(el, bottom) {
  try {
    const box = el.getBBox()
    if (!Number.isFinite(box.height) || box.height <= 0) return bottom
    return Math.max(bottom, box.y + box.height)
  } catch {
    return bottom
  }
}

/**
 * @param {SVGElement} svg
 * @param {SVGGElement} inner `#svg-container`
 */
function measureContentBottom(svg, inner) {
  let bottom = 0

  try {
    const box = inner.getBBox()
    if (Number.isFinite(box.height) && box.height > 0) {
      bottom = Math.max(bottom, box.y + box.height)
    }
  } catch {
    /* ignore */
  }

  inner
    .querySelectorAll("g, text, rect, path, line, polygon, circle")
    .forEach(el => {
      if (shouldSkipForTrimBBox(el)) return
      bottom = extendBottomFromBBox(el, bottom)
    })

  svg.querySelectorAll("text.yaxis").forEach(el => {
    if (el instanceof SVGGraphicsElement) {
      bottom = extendBottomFromBBox(el, bottom)
    }
  })

  const xAxis = inner.querySelector("g.x.axis, g.Xaxis, .Xaxis")
  if (xAxis instanceof SVGGraphicsElement) {
    bottom = extendBottomFromBBox(xAxis, bottom)
  }

  const rowCount = svg.querySelectorAll("text.yaxis").length
  if (rowCount > 0) {
    const floor = rowCount * 30 + 36
    bottom = Math.max(bottom, floor)
  }

  return bottom
}

/**
 * Shrink the legacy feature-viewer canvas to the drawn tracks + axis (drops excess
 * empty space below the residue numbers).
 * @param {HTMLElement | null | undefined} host `.fv-prototype` root
 */
export function trimFeatureViewerSvgHeight(host) {
  const svg = host?.querySelector("svg")
  const inner = svg?.querySelector("#svg-container")
  if (!svg || !inner) return

  const clipRect =
    svg.querySelector("#clip rect") ?? svg.querySelector("clipPath rect")

  clipRect?.setAttribute("height", String(FV_MEASURE_CLIP_HEIGHT))

  const bottom = measureContentBottom(svg, inner)
  if (bottom <= 0) return

  const clipH = Math.ceil(bottom + FV_PADDING_BOTTOM)
  const svgH = Math.ceil(FV_MARGIN_TOP + clipH)

  svg.setAttribute("height", String(svgH))
  svg.style.height = `${svgH}px`
  clipRect?.setAttribute("height", String(clipH))

  host.style.minHeight = "0"
  host.style.height = "auto"
}

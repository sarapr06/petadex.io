/** Minimum label font size before giving up on full text. */
const MIN_FONT_PX = 8
const LABEL_PAD_PX = 6
const TEXT_INSET_PX = 3

/**
 * @param {string | null | undefined} pointsAttr
 */
function parseChevronPoints(pointsAttr) {
  const coords = String(pointsAttr || "")
    .trim()
    .split(/\s+/)
    .map(pair => {
      const [x, y] = pair.split(",").map(Number)
      return { x, y }
    })
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (coords.length < 5) return null

  const tipX = coords[3].x
  const flatRight = coords[2].x
  const flatLeft = coords[0].x
  const rowY = coords[0].y + 3

  return {
    tipX,
    flatRight,
    flatLeft,
    rowY,
    defaultTextX: tipX + 7 - 102,
  }
}

/**
 * @param {SVGTextElement} text
 * @param {number} fontSize
 */
function measureTextWidth(text, fontSize) {
  text.setAttribute("font-size", String(fontSize))
  const len = text.getComputedTextLength()
  return Number.isFinite(len) ? len : 0
}

/**
 * @param {SVGPolygonElement} polygon
 * @param {number} left
 * @param {number} flatRight
 * @param {number} tipX
 * @param {number} rowY
 */
function setChevronPoints(polygon, left, flatRight, tipX, rowY) {
  polygon.setAttribute(
    "points",
    `${left},${rowY - 3} ${left},${rowY + 12} ${flatRight},${rowY + 12} ${tipX},${rowY + 4.5} ${flatRight},${rowY - 3}`,
  )
}

/**
 * Fit left row titles inside their chevron backgrounds (library uses a fixed width).
 * @param {HTMLElement | null | undefined} host `.fv-prototype` root
 */
export function fitFeatureViewerYAxisLabels(host) {
  const svg = host?.querySelector("svg")
  if (!svg) return

  /** @type {SVGTextElement[]} */
  const labels = [...svg.querySelectorAll("g.pro.axis > g text.yaxis")]
  if (!labels.length) {
    host.style.paddingLeft = ""
    return
  }

  let minLeft = Infinity

  labels.forEach(text => {
    const group = text.parentElement
    const polygon = group?.querySelector("polygon")
    if (!(polygon instanceof SVGPolygonElement)) return

    const layout = parseChevronPoints(polygon.getAttribute("points"))
    if (!layout) return

    const { flatRight, flatLeft, rowY, tipX, defaultTextX } = layout
    const textRightLimit = flatRight - LABEL_PAD_PX
    const baseFont = parseFloat(
      text.getAttribute("font-size") ||
        window.getComputedStyle(text).fontSize ||
        "11",
    )
    let fontSize = Number.isFinite(baseFont) ? baseFont : 11

    let textWidth = measureTextWidth(text, fontSize)
    let targetLeft = flatLeft
    let targetTextX = defaultTextX

    const available = () => Math.max(0, textRightLimit - targetTextX)

    if (textWidth + TEXT_INSET_PX > textRightLimit - defaultTextX) {
      const neededLeft = textRightLimit - LABEL_PAD_PX - textWidth
      targetLeft = neededLeft
      targetTextX = targetLeft + TEXT_INSET_PX
    }

    if (textWidth > available() && fontSize > MIN_FONT_PX) {
      fontSize = Math.max(
        MIN_FONT_PX,
        fontSize * (available() / Math.max(textWidth, 1)),
      )
      textWidth = measureTextWidth(text, fontSize)
      const neededLeft = textRightLimit - LABEL_PAD_PX - textWidth
      targetLeft = neededLeft
      targetTextX = targetLeft + TEXT_INSET_PX
    }

    setChevronPoints(polygon, targetLeft, flatRight, tipX, rowY)
    text.setAttribute("x", String(targetTextX))
    text.setAttribute("font-size", String(fontSize))
    minLeft = Math.min(minLeft, targetLeft)
  })

  if (!Number.isFinite(minLeft)) {
    host.style.paddingLeft = ""
    return
  }

  host.style.paddingLeft = minLeft < 4 ? `${Math.ceil(4 - minLeft)}px` : ""
}

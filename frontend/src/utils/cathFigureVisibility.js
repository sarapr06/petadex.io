/** Detect placeholder figure captions with no image asset yet. */
export function isPlaceholderFigure(fig) {
  if (!fig) return true
  const src = fig.imageSrc
  if (src) return false
  const caption = String(fig.caption || "").trim()
  if (!caption) return true
  return /^(Add |T\.?B\.?D\.?|Placeholder|No image|Figure pending)/i.test(caption)
}

/**
 * @param {{ caption?: string, imageSrc?: string|null, alt?: string }} fig
 */
export function shouldRenderFigure(fig) {
  if (!fig) return false
  if (fig.imageSrc) return true
  const caption = String(fig.caption || "").trim()
  return caption.length > 0 && !isPlaceholderFigure(fig)
}

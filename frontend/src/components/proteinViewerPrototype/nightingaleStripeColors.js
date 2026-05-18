export function isLightTheme() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("light")
  )
}

/** Alternating residue column fills (odd / even sequence positions). */
export function sequenceStripeFills(light = isLightTheme()) {
  return light
    ? { odd: "oklch(0.97 0 0)", even: "oklch(0.90 0 0)" }
    : {
        /* Match ~0.14 panel chrome — library defaults are #ccc / #eee */
        odd: "#1c1c1c",
        even: "#121212",
      }
}

/** Sequence letter / dot ink on the stripe band (same in light and dark). */
export function sequenceLetterFill(_light = isLightTheme()) {
  return "oklch(0.18 0 0)"
}

/** Inherited into shadow DOM for D3 axis ticks (`fill=currentColor`). */
export const SEQUENCE_AXIS_INK_VAR = "--petadex-seq-axis-ink"

/**
 * Sequence ruler ticks: near-black on zebra stripes when letters show; otherwise theme default.
 * @param {boolean} [light]
 * @param {boolean} [lettersVisible]
 */
export function sequenceAxisTickFill(
  light = isLightTheme(),
  lettersVisible = false,
) {
  if (lettersVisible) return sequenceLetterFill(light)
  return light ? "oklch(0.32 0 0)" : "oklch(0.92 0 0)"
}

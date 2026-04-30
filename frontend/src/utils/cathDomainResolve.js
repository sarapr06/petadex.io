import { COMPONENT_TO_CATH } from "./cathColors"

/**
 * Prefer CATH string from Postgres (`family_atlas.cath_domain`) when present.
 * Fall back to legacy `COMPONENT_TO_CATH` map for UI-only paths or older rows.
 *
 * @param {number|string|null|undefined} component
 * @param {string|null|undefined} cathFromDb  `family_atlas.cath_domain`
 * @returns {string}
 */
export function resolveCathDomain(component, cathFromDb) {
  const trimmed =
    cathFromDb != null && String(cathFromDb).trim() !== ""
      ? String(cathFromDb).trim()
      : null
  if (trimmed) return trimmed

  const n = Number(component)
  if (Number.isFinite(n) && COMPONENT_TO_CATH[n] != null) {
    return COMPONENT_TO_CATH[n]
  }
  return "Unknown"
}

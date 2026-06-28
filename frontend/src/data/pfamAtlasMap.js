/**
 * Optional PETadex atlas `component` index keyed by Pfam accession (e.g. "PF01425").
 * Populate when literature/PETadex mapping is validated so `/cath-domains` shows live family counts.
 *
 * @type {Record<string, number>}
 */
export const PFAM_TO_ATLAS_COMPONENT = {
  PF01674: 1,
  PF03403: 1,
  PF00082: 11,
}

/**
 * @param {string} pfamAccession e.g. PF01425
 * @param {number|null|undefined} explicitFromCatalog optional atlasComponent on catalog row
 * @returns {number|null}
 */
export function resolveAtlasComponentForPfam(pfamAccession, explicitFromCatalog) {
  if (explicitFromCatalog != null && Number.isFinite(Number(explicitFromCatalog))) {
    return Number(explicitFromCatalog)
  }
  const key = String(pfamAccession || "").toUpperCase()
  const fromMap = PFAM_TO_ATLAS_COMPONENT[key]
  return fromMap != null ? fromMap : null
}

/**
 * @deprecated Use `CATH_DOMAIN_CATALOG` from `./cathDomainCatalog.js` and
 * `mergeCatalogWithAtlas` from `../utils/mergeCatalogWithAtlas.js`.
 * Kept empty so legacy imports do not break.
 *
 * @typedef {Object} CathDomainReference
 * @property {string} label
 * @property {string|null} [url]
 *
 * @typedef {Object} CathDomainLegendSegment
 * @property {string} label
 * @property {string} cathId
 *
 * @typedef {Object} CathDomainResearch
 * @property {string} id
 * @property {string} profileHmm
 * @property {string} cathId
 * @property {string} displayName
 * @property {string} sourceLabel
 * @property {string} lastUpdated
 * @property {string} summary
 * @property {string} localization
 * @property {string} ptms
 * @property {string} catalyticResidues
 * @property {string} function
 * @property {string} labNotes
 * @property {string[]} figureCaptions
 * @property {CathDomainReference[]} references
 * @property {CathDomainLegendSegment[]} [legendSegments]
 * @property {number} [atlasComponent]
 */

/** @type {CathDomainResearch[]} */
export const PLACEHOLDER_DOMAINS = []

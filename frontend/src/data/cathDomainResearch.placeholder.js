/**
 * Curated domain entries for the public CATH domains page.
 * Wire to API or static JSON when HMM → CATH → documentation is finalized.
 *
 * @typedef {Object} CathDomainReference
 * @property {string} label
 * @property {string|null} [url]
 *
 * @typedef {Object} CathDomainLegendSegment
 * @property {string} label
 * @property {string} cathId  // key in CATH_BASE_CSS where known
 *
 * @typedef {Object} CathDomainResearch
 * @property {string} id  // stable key for client selection
 * @property {string} profileHmm  // HMM / Pfam-style identifier shown in the selector
 * @property {string} cathId
 * @property {string} displayName
 * @property {string} sourceLabel  // e.g. "PETadex curation (draft)"
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
 * @property {number} [atlasComponent]  Optional tie-in to `family_atlas.component` for merge + offline fallback
 */

/** @type {CathDomainResearch[]} */
export const PLACEHOLDER_DOMAINS = [
  {
    id: "trypsin-like-serine-fold",
    atlasComponent: 1,
    profileHmm: "PF00089 · Peptidase_S10 (illustrative)",
    cathId: "3.40.50.1820",
    displayName: "Trypsin-like serine protease fold",
    sourceLabel: "PETadex documentation (draft)",
    lastUpdated: "2026-04-30",
    summary:
      "Illustrative entry: many PETadex sequences map to this fold; some homologs require proteolytic activation before the catalytic site is competent. Replace with a verified summary for your HMM once curation is complete.",
    localization:
      "Placeholder: expected cellular localization and secretion patterns for representative homologs (organism-specific).",
    ptms:
      "Placeholder: glycosylation, disulfides, and other modifications typical of the fold—cite primary literature per entry.",
    catalyticResidues:
      "Placeholder: catalytic triad or equivalent residues; residue numbers will align to a reference PDB/UniProt when attached to this profile.",
    function:
      "Placeholder: zymogen activation vs prodomain-mediated inhibition where relevant; tie statements to sequences that hit this HMM in PETadex.",
    labNotes:
      "Placeholder: construct design, cleavage handling, assay considerations; dry lab notes on HMM coverage and domain boundaries.",
    figureCaptions: [
      "Figure 1 (placeholder): domain architecture and cleavage or regulatory regions.",
      "Figure 2 (placeholder): structure or alignment keyed to catalytic residues.",
    ],
    references: [
      { label: "[Placeholder] Primary review for this fold / HMM family.", url: null },
      { label: "[Placeholder] Mechanism or regulation (activation / inhibition).", url: null },
    ],
    legendSegments: [
      { label: "CATH domain", cathId: "3.40.50.1820" },
      { label: "Related segment (illustrative)", cathId: "2.40.10.10" },
    ],
  },
  {
    id: "immunoglobulin-like-beta-sandwich",
    atlasComponent: 8,
    profileHmm: "PF13927 · Ig_3 (illustrative)",
    cathId: "3.40.710.10",
    displayName: "Immunoglobulin-like beta-sandwich",
    sourceLabel: "PETadex documentation (draft)",
    lastUpdated: "2026-04-15",
    summary:
      "Second illustrative profile: accessory or repeat domains often appear N- or C-terminal to catalytic modules. Replace with curated text for this HMM.",
    localization: "Placeholder text.",
    ptms: "Placeholder text.",
    catalyticResidues:
      "Placeholder: state explicitly if this domain is non-catalytic while the catalytic core lies on another HMM.",
    function: "Placeholder text.",
    labNotes: "Placeholder text.",
    figureCaptions: ["Figure 1 (placeholder)."],
    references: [{ label: "[Placeholder citation]", url: null }],
    legendSegments: [{ label: "CATH domain", cathId: "3.40.710.10" }],
  },
  {
    id: "nucleotide-sugar-recognition",
    atlasComponent: 14,
    profileHmm: "PF00535 · Glycos_transf_2 (illustrative)",
    cathId: "2.60.40.420",
    displayName: "Nucleotide-diphospho-sugar recognition",
    sourceLabel: "PETadex documentation (draft)",
    lastUpdated: "TBD",
    summary: "Third illustrative profile; full narrative pending curation.",
    localization: "—",
    ptms: "—",
    catalyticResidues: "—",
    function: "—",
    labNotes: "—",
    figureCaptions: [],
    references: [],
    legendSegments: [{ label: "CATH domain", cathId: "2.60.40.420" }],
  },
]

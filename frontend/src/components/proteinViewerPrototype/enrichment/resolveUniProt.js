import {
  looksLikeUniProtAccession,
  normalizeUniProtAccession,
  resolveUniProtFromPetadexAccession,
} from "./uniProtIdMapping.js"

/**
 * Pick the UniProt accession used only for enrichment (tracks / AlphaFold).
 * Manual non-empty input wins; otherwise optional ID mapping from Petadex accession.
 *
 * @param {{ petadexAccession: string, manualUniProtInput: string, autoMap: boolean }} opts
 * @returns {Promise<{ accession: string | null, method: string, detail: string }>}
 */
export async function resolveEnrichmentAccession({
  petadexAccession,
  manualUniProtInput,
  autoMap,
}) {
  const manual = normalizeUniProtAccession(manualUniProtInput || "")
  if (manual) {
    if (!looksLikeUniProtAccession(manual)) {
      return {
        accession: null,
        method: "manual-invalid",
        detail:
          "UniProt accession format not recognized (expect standard UniProtKB ids).",
      }
    }
    return {
      accession: manual,
      method: "manual",
      detail: "Manual UniProt accession for enrichment",
    }
  }

  if (!autoMap) {
    return {
      accession: null,
      method: "off",
      detail: "Turn on auto-mapping or enter a UniProt accession above.",
    }
  }

  return resolveUniProtFromPetadexAccession(petadexAccession || "")
}

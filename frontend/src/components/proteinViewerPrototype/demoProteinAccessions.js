/** UniProt IDs with ≥1 drawable domain/region/site on Petadex sequence (verified against UniProt API). */
export const DEMO_REAL_UNIPROT_ACCESSIONS = [
  "P52956",
  "B0FLR6",
  "C7YUZ1",
  "E8U721",
  "L0EF70",
  "O82950",
  "Q0K4D5",
  "A0A0P0ZE81",
  "B2NHN2",
  "Q0K7T2",
  "Q0KCI0",
  "Q51871",
  "Q6A0I4",
  "Q6UFW4",
  "Q7WXF6",
]

/** Maps to UniProt but 0 drawable features → mock bars (showcase fallback). */
export const DEMO_MOCK_FALLBACK_ACCESSION = "A0A075B5G4"

export const DEMO_MODE_ACCESSIONS = [
  ...DEMO_REAL_UNIPROT_ACCESSIONS,
  DEMO_MOCK_FALLBACK_ACCESSION,
]

const DEMO_MODE_SET = new Set(DEMO_MODE_ACCESSIONS)

/** @param {string} accession */
export function isDemoModeAccession(accession) {
  return DEMO_MODE_SET.has(accession)
}

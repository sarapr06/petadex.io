/** @typedef {{ id: string, label: string, newick: string, familyId?: number, cathDomain?: string }} MockTreeSpec */

/**
 * Demo Newick trees styled like Petadex search-result phylo families:
 * leaf labels = GenBank accessions; branch lengths in substitution units.
 * Accessions and family IDs are taken from real family_atlas rows (topology is synthetic).
 */
/** @type {MockTreeSpec[]} */
export const MOCK_TREES = [
  {
    id: "family-42",
    label: "Family 42 — Trypsin-like (4 variants)",
    familyId: 42,
    cathDomain: "2.40.10.10",
    newick:
      "((EGR2918940.1:0.031,WP_012898172.1:0.048):0.092,(KJQ85554.1:0.037,MBD3725888.1:0.044):0.118);",
  },
  {
    id: "family-3",
    label: "Family 3 — Alpha/Beta Hydrolase (8 variants)",
    familyId: 3,
    cathDomain: "3.40.50.1820",
    newick:
      "((((EGA0706806.1:0.0043,EDQ7327560.1:0.0008):0.0119,(HAZ6040446.1:0.0031,HBE8423784.1:0.0025):0.018):0.0227,(HEG7173460.1:0.0020,HDA6608912.1:0.0028):0.0227):0.1019,(EGR2918940.1:0.0980,EGO6137298.1:0.0510):0.3408);",
  },
  {
    id: "family-113-hyphy",
    label: "Family 113 — Amidase signature, HyPhy tags",
    familyId: 113,
    cathDomain: "3.90.1300.10",
    newick:
      "((((EGO6137298.1:0.148,WP_159219419.1:0.213):0.085,(WP_217747138.1:0.166):0.059),((MBZ2021381.1{Foreground}:0.0020,WP_029257842.1{Foreground}:0.0031){Foreground}:0.0227,(EGA0706806.1{Foreground}:0.0043,EDQ7327560.1{Foreground}:0.0008){Foreground}:0.0119):0.102):0.341,WP_021068161.1:0.0510,HEG7173460.1:0.0980);",
  },
]

/** @param {string} mockId */
export function mockTreeById(mockId) {
  return MOCK_TREES.find(t => t.id === mockId) ?? MOCK_TREES[0]
}

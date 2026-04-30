import { resolveCathDomain } from "./cathDomainResolve"

const GENERIC = {
  localization:
    "Curated localization notes for this atlas component will appear here once documentation is published.",
  ptms:
    "Curated post-translational modification notes will appear here once documentation is published.",
  catalyticResidues:
    "Curated catalytic or key residue mapping (e.g. vs a reference PDB) will appear here once documentation is published.",
  function:
    "Curated functional and regulatory notes for sequences in PETadex that map to this component will appear here once documentation is published.",
  labNotes:
    "Dry lab and wet lab interpretation notes for this structural class will appear here once documentation is published.",
}

/**
 * @param {{ component: number, cath_domain: string|null, domain_name: string|null, family_count: number, profile_hmm?: string|null }} row
 * @param {object[]} placeholders  optional curated entries from cathDomainResearch.placeholder
 */
export function mergeCathDomainFromAtlas(row, placeholders = []) {
  const cathId = resolveCathDomain(row.component, row.cath_domain)
  const ph =
    placeholders.find(p => p.atlasComponent === row.component) ||
    placeholders.find(p => p.cathId === cathId) ||
    null

  const displayName = row.domain_name?.trim() || `Component ${row.component}`
  const profileHmm =
    (row.profile_hmm && String(row.profile_hmm).trim()) ||
    `Atlas component ${row.component}`

  return {
    id: `c-${row.component}`,
    component: row.component,
    familyCount: row.family_count,
    cathId,
    displayName,
    profileHmm,
    sourceLabel: `PETadex family atlas (${Number(row.family_count).toLocaleString()} families)`,
    lastUpdated: "—",
    summary:
      ph?.summary ||
      `Atlas component ${row.component}: ${displayName}. CATH node ${cathId}. Curated long-form summary pending.`,
    localization: ph?.localization || GENERIC.localization,
    ptms: ph?.ptms || GENERIC.ptms,
    catalyticResidues: ph?.catalyticResidues || GENERIC.catalyticResidues,
    function: ph?.function || GENERIC.function,
    labNotes: ph?.labNotes || GENERIC.labNotes,
    figureCaptions: ph?.figureCaptions?.length ? ph.figureCaptions : [],
    references: ph?.references?.length ? ph.references : [],
    legendSegments:
      ph?.legendSegments?.length > 0
        ? ph.legendSegments
        : [{ label: "CATH domain (atlas)", cathId }],
  }
}

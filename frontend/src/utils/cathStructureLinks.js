/**
 * Build PETadex-internal links for domain navigation.
 *
 * @param {{
 *   cathId?: string,
 *   component?: number|null,
 *   pdbIds?: string[],
 *   resourceLinks?: { label: string, url: string }[],
 * }} domain
 * @returns {{ label: string, url: string, internal: boolean }[]}
 */
export function buildCathDomainStructureLinks(domain) {
  const out = []
  const seen = new Set()
  const add = (label, url) => {
    if (!url || !label || seen.has(url) || !url.startsWith("/")) return
    seen.add(url)
    out.push({ label, url, internal: true })
  }

  for (const x of domain.resourceLinks || []) {
    if (x?.url && x?.label) add(x.label, x.url)
  }

  const cath = domain.cathId
  if (cath && /^(\d+\.){3}\d+$/.test(String(cath).trim())) {
    const c = String(cath).trim()
    add(`PETadex atlas (CATH ${c})`, `/atlas?cath=${encodeURIComponent(c)}`)
  }

  add("PETadex family atlas", "/atlas")

  if (domain.component != null && Number.isFinite(Number(domain.component))) {
    add("PETadex enzymes (this component)", `/enzymes?component=${Number(domain.component)}`)
  }

  return out
}

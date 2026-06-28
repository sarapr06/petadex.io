export const MAX_LABEL = 32

export function enzymeIdFromTip(name) {
  const label = name || ""
  return /^\d+$/.test(label) ? label : null
}

export function truncateLabel(label) {
  if (!label) return ""
  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL)}…` : label
}

/** Display label: accession from member index when available, else enzyme id */
export function leafDisplayLabel(enzymeId, memberIndex) {
  if (!enzymeId) return ""
  const member = memberIndex?.get(String(enzymeId))
  const accession = member?.accession
  if (accession) return truncateLabel(accession)
  return truncateLabel(enzymeId)
}

/** Case-insensitive match on enzyme_id or genbank_accession_id */
export function leafMatchesQuery(enzymeId, query, memberIndex) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (!enzymeId) return false
  if (String(enzymeId).toLowerCase().includes(q)) return true
  const accession = memberIndex?.get(String(enzymeId))?.accession
  return accession ? accession.toLowerCase().includes(q) : false
}

export function collectLeafEnzymeIds(root) {
  const ids = []
  const walk = node => {
    if (!node.children || node.children.length === 0) {
      const id = enzymeIdFromTip(node.name)
      if (id) ids.push(id)
      return
    }
    node.children.forEach(walk)
  }
  walk(root)
  return ids
}

import React, { useMemo } from "react"
import { formatCathDomainSelectLabel } from "../../utils/cathDomainSectionConfig"

/**
 * @param {object} props
 * @param {{
 *   id: string,
 *   profileHmm: string,
 *   displayName: string,
 *   pfamAccession: string,
 *   component?: number|null,
 *   familyCount?: number|null,
 * }[]} props.domains
 * @param {string} props.selectedId
 * @param {(id: string) => void} props.onSelectId
 */
const CathDomainProfileSelector = ({ domains, selectedId, onSelectId }) => {
  const sorted = useMemo(
    () =>
      [...domains].sort((a, b) => {
        const aMapped = a.component != null ? 1 : 0
        const bMapped = b.component != null ? 1 : 0
        if (bMapped !== aMapped) return bMapped - aMapped
        const aCount = a.familyCount ?? -1
        const bCount = b.familyCount ?? -1
        if (bCount !== aCount) return bCount - aCount
        return a.displayName.localeCompare(b.displayName)
      }),
    [domains],
  )

  return (
    <div className="mb-8 md:mb-10 max-w-2xl">
      <label htmlFor="cath-profile-hmm-select" className="block text-sm font-medium text-foreground mb-2">
        Pfam profile
      </label>
      <select
        id="cath-profile-hmm-select"
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={selectedId}
        onChange={e => onSelectId(e.target.value)}
      >
        {sorted.map(d => {
          const mapped = d.component != null
          const countLabel =
            d.familyCount != null && Number.isFinite(Number(d.familyCount))
              ? ` · ${Number(d.familyCount).toLocaleString()} families`
              : ""
          return (
            <option key={d.id} value={d.id}>
              {formatCathDomainSelectLabel(d)}
              {mapped ? ` (component ${d.component}${countLabel})` : ""}
            </option>
          )
        })}
      </select>
      <p className="mt-2 text-xs text-muted-foreground m-0 leading-relaxed">
        Mapped profiles (linked to a PETadex atlas component) appear first. Changing the selection
        updates the URL so you can share or bookmark a specific profile.
      </p>
    </div>
  )
}

export default CathDomainProfileSelector

import React from "react"

/**
 * @param {object} props
 * @param {{ id: string, profileHmm: string, displayName: string }[]} props.domains
 * @param {string} props.selectedId
 * @param {(id: string) => void} props.onSelectId
 */
const CathDomainProfileSelector = ({ domains, selectedId, onSelectId }) => (
  <div className="mb-8 md:mb-10 max-w-2xl">
    <label htmlFor="cath-profile-hmm-select" className="block text-sm font-medium text-foreground mb-2">
      Atlas component
    </label>
    <select
      id="cath-profile-hmm-select"
      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      value={selectedId}
      onChange={e => onSelectId(e.target.value)}
    >
      {domains.map(d => (
        <option key={d.id} value={d.id}>
          {d.profileHmm} — {d.displayName}
        </option>
      ))}
    </select>
    <p className="mt-2 text-xs text-muted-foreground m-0">
      Options are derived from the same `family_atlas` labels used when coloring the UMAP by component.
      When profile HMM metadata is added to the database, it will appear in each row here.
    </p>
  </div>
)

export default CathDomainProfileSelector

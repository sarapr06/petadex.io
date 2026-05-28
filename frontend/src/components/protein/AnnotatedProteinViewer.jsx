import React, { useMemo, useState } from "react"
import ProteinViewer from "./ProteinViewer"

/**
 * @param {{
 *   accession: string,
 *   record: import("./annotation-reference/annotations.js").AnnotationRecord | null,
 *   height?: string,
 *   showControls?: boolean,
 * }} props
 */
export default function AnnotatedProteinViewer({
  accession,
  record,
  height = "560px",
  showControls = true,
}) {
  const groupDefaults = useMemo(() => {
    const entries = (record?.groups ?? []).map(g => [g.id, true])
    return Object.fromEntries(entries)
  }, [record])

  const [enabledGroups, setEnabledGroups] = useState(groupDefaults)

  React.useEffect(() => {
    setEnabledGroups(groupDefaults)
  }, [groupDefaults])

  const visibleResidues = useMemo(() => {
    const residues = record?.residues ?? []
    if (!record?.groups?.length) return residues
    return residues.filter(r => {
      if (!r.group) return true
      return enabledGroups[r.group] !== false
    })
  }, [record, enabledGroups])

  const groupMap = useMemo(
    () => new Map((record?.groups ?? []).map(g => [g.id, g])),
    [record],
  )

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
      <div className="rounded-2xl border-border overflow-hidden bg-surface-overlay">
        <div className="p-3 border-b border-border bg-surface-raised text-sm text-muted-foreground">
          <strong className="text-foreground">Annotated style prototype</strong> · accession{" "}
          <span className="font-mono">{accession}</span>
        </div>
        <div className="w-full bg-secondary molstar-annotated-canvas" style={{ height }}>
          <ProteinViewer
            accession={accession}
            width="100%"
            height={height}
            showControls={showControls}
            enableMeasurement={true}
            enableSelection={true}
            annotations={visibleResidues}
            annotationGroups={record?.groups ?? []}
            annotationStylePreset={record?.stylePreset ?? null}
            showAnnotationLabels={false}
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-surface-overlay">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="m-0 text-base text-foreground font-semibold">
            Annotation notes
          </h3>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            PyMOL-inspired residue marks + discussion notes
          </p>
        </div>

        {record?.groups?.length ? (
          <div className="px-4 py-3 border-b border-border space-y-2">
            <p className="m-0 text-xs text-muted-foreground">Toggle groups</p>
            {record.groups.map(group => (
              <label
                key={group.id}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={enabledGroups[group.id] !== false}
                  onChange={e =>
                    setEnabledGroups(prev => ({
                      ...prev,
                      [group.id]: e.target.checked,
                    }))
                  }
                />
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: group.color || "#ff2ea6" }}
                />
                <span>{group.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        <div className="px-4 py-3 max-h-[400px] overflow-auto">
          {!visibleResidues.length ? (
            <p className="m-0 text-sm text-muted-foreground">
              No annotations for this accession yet.
            </p>
          ) : (
            <ul className="m-0 p-0 list-none space-y-2">
              {visibleResidues.map((r, i) => {
                const group = r.group ? groupMap.get(r.group) : null
                return (
                  <li
                    key={`${r.seqPos}-${r.group || "none"}-${i}`}
                    className="rounded-md border border-border bg-muted/20 p-2"
                  >
                    <p className="m-0 text-sm font-mono text-foreground">
                      {r.seqPos}
                      {r.aa ? ` ${r.aa}` : ""}
                      {r.label ? ` · ${r.label}` : ""}
                    </p>
                    {group?.label ? (
                      <p className="m-0 mt-1 text-xs text-muted-foreground">
                        Group: {group.label}
                      </p>
                    ) : null}
                    {r.note ? (
                      <p className="m-0 mt-1 text-xs text-muted-foreground">
                        {r.note}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

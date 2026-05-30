import React, { useMemo, useState } from "react"
import ProteinViewer from "./ProteinViewer"

/**
 * @param {{
 *   accession: string,
 *   record: import("./annotation-reference/annotations.js").AnnotationRecord | null,
 *   height?: string,
 *   showControls?: boolean,
 *   variant?: "embedded" | "full",
 * }} props
 */
export default function AnnotatedProteinViewer({
  accession,
  record,
  height = "560px",
  showControls = true,
  variant = "embedded",
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

  const isEmbedded = variant === "embedded"

  return (
    <div className={isEmbedded ? "space-y-3" : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] items-start"}>
      {record?.groups?.length ? (
        <div className="flex flex-wrap items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground">Show groups:</span>
          {record.groups.map(group => (
            <label
              key={group.id}
              className="inline-flex items-center gap-1.5 text-sm text-foreground cursor-pointer"
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

      <div className="rounded-2xl border-border overflow-hidden bg-surface-overlay">
        {!isEmbedded ? (
          <div className="p-3 border-b border-border bg-surface-raised text-sm text-muted-foreground">
            <strong className="text-foreground">Annotated structure</strong> · accession{" "}
            <span className="font-mono">{accession}</span>
          </div>
        ) : null}
        <div
          className={`w-full bg-secondary molstar-annotated-canvas ${isEmbedded ? "" : ""}`}
          style={{ height }}
        >
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
          />
        </div>
        {isEmbedded && visibleResidues.length > 0 ? (
          <p className="m-0 px-3 py-2 text-xs text-muted-foreground border-t border-border">
            Hover highlighted residues for a callout; click to pin notes. Callouts stay offset from the structure as you zoom.
          </p>
        ) : null}
      </div>

      {!isEmbedded && record ? (
        <aside className="rounded-2xl border border-border bg-surface-overlay">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="m-0 text-base text-foreground font-semibold">
              Annotation notes
            </h3>
          </div>
          <div className="px-4 py-3 max-h-[400px] overflow-auto text-sm text-muted-foreground">
            Notes appear on the structure when you hover or click highlighted residues.
          </div>
        </aside>
      ) : null}
    </div>
  )
}

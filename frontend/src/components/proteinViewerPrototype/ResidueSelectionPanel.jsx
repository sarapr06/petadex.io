import React from "react"

/**
 * @param {{
 *   rows: Array<{
 *     id: string,
 *     kind: 'single' | 'range',
 *     label: string,
 *     detail?: string,
 *     lo: number,
 *     hi: number,
 *   }>,
 *   totalCount: number,
 *   onClearAll: () => void,
 *   onRemoveEntry: (lo: number, hi: number) => void,
 * }} props
 */
export default function ResidueSelectionPanel({
  rows,
  totalCount,
  onClearAll,
  onRemoveEntry,
}) {
  return (
    <aside className="rounded-lg border border-border bg-muted/20 flex flex-col min-h-[200px] lg:min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Selected residues</h3>
        {totalCount > 0 ? (
          <span className="text-xs font-mono tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {totalCount}
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[240px] px-3 py-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            Click to toggle one letter, drag for a range, or Shift+click after a first
            click to extend a range from that anchor. Adjacent picks merge into one row.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map(row => (
              <li
                key={row.id}
                className="flex items-start gap-2 text-xs group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-medium text-foreground tabular-nums">
                    {row.label}
                  </p>
                  {row.detail ? (
                    <p className="font-mono text-muted-foreground mt-0.5 break-all">
                      {row.detail}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted"
                  title="Remove from selection"
                  aria-label={`Remove ${row.label}`}
                  onClick={() => onRemoveEntry(row.lo, row.hi)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border">
        <button
          type="button"
          className="btn btn-ghost w-full text-xs"
          disabled={totalCount === 0}
          onClick={onClearAll}
        >
          Clear all
        </button>
      </div>
    </aside>
  )
}

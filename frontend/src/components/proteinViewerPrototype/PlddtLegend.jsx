import React from "react"
import { PLDDT_BANDS } from "./plddtConfidence.js"

export default function PlddtLegend({ className = "" }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground ${className}`}
      aria-label="pLDDT confidence colour scale"
    >
      <span className="font-medium text-foreground/90">pLDDT</span>
      {PLDDT_BANDS.map(b => (
        <span key={b.label} className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-4 rounded-sm border border-border/60"
            style={{ backgroundColor: b.color }}
            aria-hidden
          />
          {b.description}
        </span>
      ))}
    </div>
  )
}

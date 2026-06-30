// frontend/src/components/corpus/ComputedStatsPanel.jsx
//
// Computed physico-chemical stats for a corpus ORF. These come straight from
// GET /api/orf/:orfId `.computed` ({ mass, pI, gravy }) — derived in-endpoint
// from the amino-acid sequence, NOT measured. Per the framing discipline in
// "03 - Frontend Wiring", the panel is explicitly labelled "computed from
// sequence" so it is never mistaken for an experimental observation.
import React from "react"

/** Format a number with a fixed precision, tolerating null/strings. */
function fmt(value, digits) {
  if (value == null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n.toFixed(digits)
}

function StatItem({ label, value, unit }) {
  return (
    <div>
      <div className="text-xs mb-1 text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-primary">
        {value}
        {unit ? (
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * @param {{
 *   computed: { mass?: number|string, pI?: number|string, pi?: number|string, gravy?: number|string } | null,
 *   length: number | null,
 * }} props
 */
export default function ComputedStatsPanel({ computed, length }) {
  const c = computed || {}
  // Tolerate both `pI` (doc shape) and `pi` (snake-ish) keys.
  const mass = fmt(c.mass, 2)
  const pI = fmt(c.pI ?? c.pi, 2)
  const gravy = fmt(c.gravy, 3)

  const items = [
    length != null ? { label: "Length", value: length, unit: "aa" } : null,
    mass != null ? { label: "Molecular mass", value: mass, unit: "Da" } : null,
    pI != null ? { label: "Isoelectric point (pI)", value: pI } : null,
    gravy != null ? { label: "GRAVY", value: gravy } : null,
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-semibold text-foreground m-0">
          Computed properties
        </h2>
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          Computed from sequence
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Derived directly from the amino-acid sequence — not measured.
      </p>

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {items.map(item => (
          <StatItem
            key={item.label}
            label={item.label}
            value={item.value}
            unit={item.unit}
          />
        ))}
      </div>
    </section>
  )
}

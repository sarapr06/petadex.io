// frontend/src/components/SummaryStatistics.jsx
import React from "react"

export default function SummaryStatistics({ stats, loading }) {
  if (loading) {
    return (
      <div className="p-4 rounded-2xl mb-4 bg-surface">
        Loading statistics...
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="p-4 rounded-2xl mb-4 bg-surface border-border">
      <h3 className="text-lg font-semibold mb-4 text-primary">
        Summary Statistics
      </h3>

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <StatItem label="Total Mass" value={`${stats.totalMass} Da`} />
        <StatItem label="Average pI" value={stats.avgPI} />
        <StatItem label="Hydrophobic" value={`${stats.percentHydrophobic}%`} />
        <StatItem label="Length" value={`${stats.sequenceLength} aa`} />
      </div>
    </div>
  )
}

function StatItem({ label, value }) {
  return (
    <div>
      <div className="text-xs mb-1 text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-primary">{value}</div>
    </div>
  )
}

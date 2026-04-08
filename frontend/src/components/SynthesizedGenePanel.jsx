// src/components/SynthesizedGenePanel.js
import React, { useState } from "react"
import ActivityLineChart, { mediaColors } from "./ActivityLineChart"

export default function SynthesizedGenePanel({ geneMetadata, plateData }) {
  const [expandedGenes, setExpandedGenes] = useState({})

  if (!geneMetadata || geneMetadata.length === 0) {
    return null
  }

  const toggleGene = geneId => {
    setExpandedGenes(prev => ({
      ...prev,
      [geneId]: !prev[geneId],
    }))
  }

  // Get unique media types for summary stats
  const getUniqueMediaTypes = plateDataArray => {
    if (!Array.isArray(plateDataArray)) return []
    return [...new Set(plateDataArray.map(p => p.media).filter(Boolean))]
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-semibold text-primary mb-4 mt-0">
        Synthesized Genes
      </h2>

      {geneMetadata.map((gene, index) => {
        const geneKey = gene.gene || `gene-${index}`
        const isExpanded = expandedGenes[geneKey]
        const genePlateData = plateData?.[geneKey]

        // Calculate overall average across all plates
        const overallAverage =
          Array.isArray(genePlateData) && genePlateData.length > 0
            ? genePlateData.reduce(
                (sum, plate) => sum + (plate.average_readout || 0),
                0,
              ) / genePlateData.length
            : null

        return (
          <div
            key={geneKey}
            className={`bg-surface border border-border rounded-lg ${index < geneMetadata.length - 1 ? "mb-4" : "mb-0"} overflow-hidden`}
          >
            {/* Header - always visible */}
            <button
              onClick={() => toggleGene(geneKey)}
              className="w-full py-4 px-6 bg-transparent border-none cursor-pointer flex justify-between items-center text-left"
            >
              <div className="flex gap-6 items-center flex-wrap flex-1">
                {gene.gene && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Gene ID
                    </span>
                    <div className="text-lg font-semibold text-primary font-mono">
                      {gene.gene}
                    </div>
                  </div>
                )}
                {gene.nickname && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nickname
                    </span>
                    <div className="text-lg text-primary">{gene.nickname}</div>
                  </div>
                )}
                {Array.isArray(genePlateData) && genePlateData.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Plates ({genePlateData.length})
                    </span>
                    <div className="text-lg text-success font-semibold">
                      Avg: {overallAverage?.toFixed(3) || "N/A"}
                    </div>
                  </div>
                )}
              </div>

              {/* Expand/collapse icon */}
              <svg
                className={`w-5 h-5 transform transition delay-75 ease-in-out shrink-0 ml-4 ${isExpanded ? "rotate-180" : "rotate-0"} `}
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable content */}
            {isExpanded && (
              <div className="pt-0 pb-5 pl-5 pr-5">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 pt-4 border-t-border-strong border-t">
                  {gene.batch && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-1">
                        Batch
                      </div>
                      <div className="text-lg text-primary font-mono">
                        {gene.batch}
                      </div>
                    </div>
                  )}

                  {gene.genetic_code && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-1">
                        Genetic Code
                      </div>
                      <div className="text-lg text-primary">
                        {gene.genetic_code}
                      </div>
                    </div>
                  )}

                  {gene.date_entered && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-1">
                        Date Entered
                      </div>
                      <div className="text-lg text-primary">
                        {new Date(gene.date_entered).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Plate Data Visualization */}
                {Array.isArray(genePlateData) &&
                  genePlateData.length > 0 &&
                  (() => {
                    const mediaTypes = getUniqueMediaTypes(genePlateData)

                    return (
                      <div className="mt-4 bg-success/10 border border-border rounded-xl p-4">
                        <div className="text-sm font-semibold text-success mb-3">
                          Activity Time Course ({genePlateData.length}{" "}
                          {genePlateData.length === 1 ? "plate" : "plates"})
                        </div>

                        <ActivityLineChart data={genePlateData} />

                        {/* Summary Statistics */}
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 bg-success/30 rounded-lg p-3">
                          {mediaTypes.map(media => {
                            const mediaPlates = genePlateData.filter(
                              p => p.media === media,
                            )
                            const avgReadout =
                              mediaPlates.reduce(
                                (sum, p) => sum + (p.average_readout || 0),
                                0,
                              ) / mediaPlates.length
                            const maxReadout = Math.max(
                              ...mediaPlates.map(p => p.average_readout || 0),
                            )
                            const minReadout = Math.min(
                              ...mediaPlates.map(p => p.average_readout || 0),
                            )
                            // Calculate pooled standard deviation across all plates for this media
                            const stddevs = mediaPlates
                              .map(p => p.stddev_readout || 0)
                              .filter(s => s > 0)
                            const avgStddev =
                              stddevs.length > 0
                                ? Math.sqrt(
                                    stddevs.reduce((sum, s) => sum + s * s, 0) /
                                      stddevs.length,
                                  )
                                : 0

                            return (
                              <div
                                key={media}
                                className="bg-secondary rounded-lg p-3 border-2"
                                style={{
                                  borderColor: `${mediaColors[media] || mediaColors.default}`,
                                }}
                              >
                                <div className="text-sm font-semibold text-success/70 mb-2">
                                  {media}
                                </div>
                                <div className="text-xs text-success mb-1">
                                  Avg: <strong>{avgReadout.toFixed(4)}</strong>{" "}
                                  {avgStddev > 0 && (
                                    <span className="text-muted-foreground">
                                      ± {avgStddev.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-success mb-1">
                                  Max: <strong>{maxReadout.toFixed(4)}</strong>
                                </div>
                                <div className="text-xs text-success">
                                  Min: <strong>{minReadout.toFixed(4)}</strong>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Detailed Data Table (Collapsible) */}
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm font-semibold text-success p-2 bg-success/10 rounded-lg">
                            View Detailed Plate Data
                          </summary>
                          <div className="overflow-x-auto mt-2">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b-2 border-b-success bg-success/10">
                                  <th className="p-2 font-semibold text-left text-success">
                                    Plate
                                  </th>
                                  <th className="p-2 font-semibold text-right text-success">
                                    Timepoint (hrs)
                                  </th>
                                  <th className="p-2 font-semibold text-right text-success">
                                    Avg Readout
                                  </th>
                                  <th className="p-2 font-semibold text-right text-success">
                                    Std Dev
                                  </th>
                                  <th className="p-2 font-semibold text-right text-success">
                                    Samples
                                  </th>
                                  <th className="p-2 font-semibold text-success">
                                    Media
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {genePlateData.map((plate, plateIndex) => (
                                  <tr
                                    key={plateIndex}
                                    className="border-b border-b-border"
                                  >
                                    <td className="p-2 font-mono text-success/90">
                                      {plate.plate}
                                    </td>
                                    <td className="p-2 font-mono text-success/90 text-right">
                                      {plate.timepoint_hours ?? "N/A"}
                                    </td>
                                    <td className="p-2 font-mono font-semibold text-success/90 text-right">
                                      {plate.average_readout?.toFixed(4) ||
                                        "N/A"}
                                    </td>
                                    <td className="p-2 font-mono text-success/90 text-right">
                                      {plate.stddev_readout
                                        ? `± ${plate.stddev_readout.toFixed(4)}`
                                        : "-"}
                                    </td>
                                    <td className="p-2 font-mono text-success/90 text-right">
                                      {plate.sample_count}
                                    </td>
                                    <td className="p-2 font-mono text-success/90 text-xs">
                                      {plate.media || "N/A"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </div>
                    )
                  })()}

                {gene.orf_nt_sequence && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">
                      ORF Nucleotide Sequence
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-3 text-sm font-mono text-primary break-all leading-relaxed max-h-[200px] overflow-y-auto">
                      {gene.orf_nt_sequence}
                    </div>
                  </div>
                )}

                {(gene.left_homology_arm || gene.right_homology_arm) && (
                  <div
                    className={`mt-4 grid gap-4 grid-cols-${gene.left_homology_arm && gene.right_homology_arm ? "2" : "1"}`}
                  >
                    {gene.left_homology_arm && (
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground mb-2">
                          Left Homology Arm
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-3 text-sm font-mono text-primary break-all leading-relaxed max-h-[200px] overflow-y-auto">
                          {gene.left_homology_arm}
                        </div>
                      </div>
                    )}

                    {gene.right_homology_arm && (
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground mb-2">
                          Right Homology Arm
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-3 text-sm font-mono text-primary break-all leading-relaxed max-h-[200px] overflow-y-auto">
                          {gene.right_homology_arm}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

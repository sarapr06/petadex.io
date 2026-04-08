// frontend/src/components/DataViewer.js
import React, { useState } from "react"
import SequencePanel from "./SequencePanel"
import StructurePanel from "../StructurePanel"
import MetadataPanel from "../MetadataPanel"

export default function DataViewer({
  sequence,
  accession,
  metadata,
  summaryStats,
  statsLoading,
}) {
  const [activeTab, setActiveTab] = useState("sequence")

  const tabs = [
    { id: "sequence", label: "Sequence" },
    { id: "structure", label: "Structure" },
    { id: "metadata", label: "Metadata" },
  ]

  const renderPanel = () => {
    switch (activeTab) {
      case "sequence":
        return (
          <SequencePanel
            sequence={sequence}
            accession={accession}
            summaryStats={summaryStats}
            statsLoading={statsLoading}
          />
        )
      case "structure":
        return <StructurePanel accession={accession} />
      case "metadata":
        return <MetadataPanel metadata={metadata} accession={accession} />
      default:
        return (
          <SequencePanel
            sequence={sequence}
            accession={accession}
            summaryStats={summaryStats}
            statsLoading={statsLoading}
          />
        )
    }
  }

  return (
    <div className="bg-surface rounded-xl shadow-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex justify-center items-center border-b-2 border-b-border bg-surface-sunken">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "btn btn-ghost w-full p-4 text-lg text-center",
              activeTab === tab.id
                ? "font-semibold text-info bg-secondary border-b-2 border-b-info"
                : "font-normal text-muted-foreground bg-transparent mb-0 hover:bg-secondary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="p-6">{renderPanel()}</div>
    </div>
  )
}

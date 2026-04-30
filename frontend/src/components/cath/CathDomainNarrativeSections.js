import React from "react"

const blocks = [
  { key: "localization", title: "Localization" },
  { key: "ptms", title: "Post-translational modifications" },
  { key: "catalyticResidues", title: "Catalytic and key residues" },
  { key: "function", title: "Function and regulation" },
  { key: "labNotes", title: "Dry lab and wet lab notes (PETadex)" },
]

/**
 * @param {{ domain: Record<string, string> }} props
 */
const CathDomainNarrativeSections = ({ domain }) => (
  <div className="space-y-10 md:space-y-12 mt-12 md:mt-16">
    {blocks.map(({ key, title }) => (
      <section key={key} aria-labelledby={`cath-section-${key}`}>
        <h2 id={`cath-section-${key}`} className="text-2xl font-semibold text-primary mb-3">
          {title}
        </h2>
        <div className="rounded-xl border border-border bg-muted/10 p-5 md:p-6 text-muted-foreground leading-relaxed">
          <p className="m-0 whitespace-pre-wrap">{domain[key] || "—"}</p>
        </div>
      </section>
    ))}
  </div>
)

export default CathDomainNarrativeSections

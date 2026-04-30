import React from "react"

const CathDomainHero = () => (
  <header className="mb-10 md:mb-14 max-w-3xl">
    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
      Structural reference
    </p>
    <h1 className="text-4xl font-semibold text-primary mb-4">CATH domains</h1>
    <p className="text-secondary-foreground text-lg leading-relaxed mb-4">
      Summaries of structural domains represented in PETadex, including how they are classified,
      visualized, and interpreted for modeling and experiment design.
    </p>
    <p className="text-muted-foreground text-sm leading-relaxed m-0">
      Select an atlas component below to load its CATH label from the PETadex family atlas, plus
      narrative notes, figures, and references where curated content exists.
    </p>
  </header>
)

export default CathDomainHero

import React from "react"

/**
 * @param {{ domain: { figureCaptions: string[], references: { label: string, url?: string|null }[] } }} props
 */
const CathDomainFiguresAndRefs = ({ domain }) => {
  const captions = domain.figureCaptions || []
  const refs = domain.references || []

  return (
    <div className="mt-12 md:mt-16 space-y-10">
      <section aria-labelledby="cath-figures-heading">
        <h2 id="cath-figures-heading" className="text-2xl font-semibold text-primary mb-4">
          Figures
        </h2>
        {captions.length === 0 ? (
          <p className="text-muted-foreground text-sm m-0">No figures listed yet for this entry.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 list-none m-0 p-0">
            {captions.map((cap, i) => (
              <li
                key={i}
                className="flex flex-col rounded-xl border-2 border-dashed border-muted-foreground/35 bg-muted/15 min-h-[200px] p-4"
              >
                <span className="text-xs font-semibold text-muted-foreground mb-2">
                  Figure {i + 1}
                </span>
                <div className="flex-1 rounded-lg bg-muted/30 border border-dashed border-border mb-3 min-h-[120px]" aria-hidden />
                <p className="text-sm text-muted-foreground m-0 leading-relaxed">{cap}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cath-refs-heading">
        <h2 id="cath-refs-heading" className="text-2xl font-semibold text-primary mb-4">
          References
        </h2>
        {refs.length === 0 ? (
          <p className="text-muted-foreground text-sm m-0">No references yet for this entry.</p>
        ) : (
          <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed m-0">
            {refs.map((r, i) => (
              <li key={i}>
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                  >
                    {r.label}
                  </a>
                ) : (
                  <span>{r.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default CathDomainFiguresAndRefs

import React from "react"

/**
 * Reference list for `/cath-domains`. Inline figures beside narrative sections replace the former
 * bottom figure gallery.
 *
 * @param {{ domain: {
 *   references: { label: string, url?: string|null }[]
 * }}} props
 */
const CathDomainFiguresAndRefs = ({ domain }) => {
  const refs = domain.references || []

  return (
    <div className="mt-10 md:mt-12">
      <section
        aria-labelledby="cath-refs-heading"
        className="rounded-2xl border border-border bg-card/40 p-5 md:p-6"
      >
        <h2 id="cath-refs-heading" className="text-xl md:text-2xl font-semibold text-primary mb-4">
          References
        </h2>
        {refs.length === 0 ? (
          <p className="text-muted-foreground text-sm m-0">No references yet for this entry.</p>
        ) : (
          <ul className="list-decimal pl-5 space-y-2.5 text-sm text-muted-foreground leading-relaxed m-0">
            {refs.map((r, i) => (
              <li key={i} id={`cath-ref-${i + 1}`} className="scroll-mt-24">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline underline-offset-2 break-words"
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

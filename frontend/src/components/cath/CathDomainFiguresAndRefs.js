import React, { useMemo } from "react"
import { buildCathReferencePlan } from "../../utils/cathReferencePlan"

/**
 * Reference list for `/cath-domains`. Inline figures beside narrative sections replace the former
 * bottom figure gallery.
 *
 * @param {{ domain: {
 *   references: { label: string, url?: string|null }[]
 * }}} props
 */
const CathDomainFiguresAndRefs = ({ domain }) => {
  const referencePlan = useMemo(() => buildCathReferencePlan(domain), [domain])
  const { cited, uncited } = referencePlan

  return (
    <div className="mt-10 md:mt-12">
      <section
        id="cath-refs-heading"
        aria-labelledby="cath-refs-heading-title"
        className="rounded-2xl border border-border bg-card/40 p-5 md:p-6 scroll-mt-28"
      >
        <h2 id="cath-refs-heading-title" className="text-xl md:text-2xl font-semibold text-primary mb-4">
          References
        </h2>
        {cited.length === 0 && uncited.length === 0 ? (
          <p className="text-muted-foreground text-sm m-0">
            No references curated yet for this profile.
          </p>
        ) : (
          <>
            {cited.length > 0 && (
              <ol className="list-decimal pl-5 space-y-2.5 text-sm text-muted-foreground leading-relaxed m-0">
                {cited.map(({ ref, displayNumber }) => (
                  <li key={displayNumber} id={`cath-ref-${displayNumber}`} className="scroll-mt-24">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-hover underline underline-offset-2 break-words"
                      >
                        {ref.label}
                      </a>
                    ) : (
                      <span>{ref.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {uncited.length > 0 && (
              <div className={cited.length > 0 ? "mt-6 pt-5 border-t border-border" : ""}>
                <h3 className="text-sm font-semibold text-foreground mb-2 m-0">
                  Additional references (not cited in text)
                </h3>
                <ul className="list-none pl-0 space-y-2.5 text-sm text-muted-foreground leading-relaxed m-0">
                  {uncited.map(({ ref, catalogIndex }) => (
                    <li key={`uncited-${catalogIndex}`}>
                      {ref.url ? (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover underline underline-offset-2 break-words"
                        >
                          {ref.label}
                        </a>
                      ) : (
                        <span>{ref.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default CathDomainFiguresAndRefs

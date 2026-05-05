import React, { useMemo } from "react"
import {
  extractFigureNumbers,
  getFirstNarrativeSectionKeyByFigure,
} from "../../utils/cathDomainFigureAnchors"
import { renderCaptionWithReferenceAnchors } from "../../utils/cathCaptionLinks"

const blocks = [
  { key: "localization", title: "Localization" },
  { key: "ptms", title: "Post-translational modifications" },
  { key: "catalyticResidues", title: "Catalytic residues" },
  { key: "mechanisms", title: "Mechanisms" },
  { key: "interactingDomains", title: "Interacting domains" },
  { key: "function", title: "Function" },
  { key: "regulation", title: "Regulation" },
  { key: "variability", title: "Variability in sequence/structure" },
  { key: "structure", title: "Structure (PDB)" },
  { key: "labNotes", title: "Lab notes" },
]

const FIGURE_TOKEN = /(Figure\s+(\d+))/gi

function getNormalizedFigures(domain) {
  if (Array.isArray(domain.figures) && domain.figures.length) {
    return domain.figures.map(f =>
      typeof f === "string"
        ? { caption: f, imageSrc: null, alt: "" }
        : { caption: f.caption || "", imageSrc: f.imageSrc ?? null, alt: f.alt ?? "" },
    )
  }
  return (domain.figureCaptions || []).map(c => ({
    caption: typeof c === "string" ? c : "",
    imageSrc: null,
    alt: "",
  }))
}

function getFigureCount(domain) {
  return getNormalizedFigures(domain).length
}

function renderTextWithFigureLinks(text, figureCount) {
  const str = String(text || "")
  if (!str || figureCount < 1 || !/Figure\s+\d+/i.test(str)) return str

  const parts = str.split(FIGURE_TOKEN)
  const out = []

  for (let i = 0; i < parts.length; i += 3) {
    const plain = parts[i]
    if (plain) out.push(plain)

    const token = parts[i + 1]
    const nRaw = parts[i + 2]
    if (!token) continue

    const n = Number(nRaw)
    const valid = Number.isInteger(n) && n > 0 && n <= figureCount
    if (!valid) {
      out.push(token)
      continue
    }

    out.push(
      <a
        key={`fig-link-${i}-${n}`}
        href={`#cath-figure-${n}`}
        className="inline-flex items-center rounded-md border border-input bg-background px-2 py-0.5 text-xs font-semibold text-accent no-underline align-middle hover:bg-muted/40 hover:text-accent-hover transition-colors"
      >
        {token}
      </a>,
    )
  }

  return out
}

/**
 * @param {{
 *   fig: { caption: string, imageSrc?: string|null, alt?: string },
 *   n: number,
 *   anchorId?: string,
 *   references?: { label?: string, url?: string|null }[],
 * }} props
 */
function InlineFigurePreview({ fig, n, anchorId, references = [] }) {
  const caption = fig.caption || ""
  const src = fig.imageSrc
  const numberedCaptionClass = {
    linkClassName:
      "text-accent font-semibold text-[0.85rem] mx-0.5 no-underline hover:underline decoration-accent/40",
    numbered: true,
  }

  return (
    <div
      id={anchorId}
      className="rounded-lg border border-border bg-muted/20 p-3 shadow-sm scroll-mt-28 flex flex-col max-h-[min(100vh,420px)]"
    >
      <div className="text-xs font-semibold text-muted-foreground mb-2 shrink-0">Figure {n}</div>
      {src ? (
        <div className="mb-2 rounded-md overflow-hidden border border-border bg-muted/30 shrink-0 max-h-[min(220px,45vh)] flex items-center justify-center">
          <img
            src={src}
            alt={fig.alt || caption || `Figure ${n}`}
            className="w-full h-full max-h-[min(220px,45vh)] object-contain"
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className="mb-2 shrink-0 rounded-md bg-muted/30 border border-dashed border-border min-h-[80px] max-h-[100px]"
          aria-hidden
        />
      )}
      {caption ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="text-[0.8rem] text-muted-foreground leading-snug m-0">
            {renderCaptionWithReferenceAnchors(caption, references, numberedCaptionClass) ?? caption}
          </p>
        </div>
      ) : null}
      <p className="text-[0.7rem] text-muted-foreground/90 mt-2 mb-0 shrink-0">
        Citation numbers link to the References section below.
      </p>
    </div>
  )
}

/**
 * @param {{ domain: Record<string, string> }} props
 */
const CathDomainNarrativeSections = ({ domain }) => {
  const figureCount = getFigureCount(domain)
  const figures = useMemo(() => getNormalizedFigures(domain), [domain])

  const firstSectionByFigure = useMemo(() => getFirstNarrativeSectionKeyByFigure(domain), [domain])
  const references = domain.references || []

  const visibleBlocks = blocks.filter(({ key }) => {
    if (key !== "labNotes") return true
    const v = domain[key]
    return v != null && String(v).trim() !== ""
  })

  return (
    <div className="space-y-8 md:space-y-10 mt-10 md:mt-12">
      {visibleBlocks.map(({ key, title }) => {
        const rawText = domain[key] || "No curated notes yet."
        const mentioned = extractFigureNumbers(rawText).filter(n => n >= 1 && n <= figureCount)
        const hasAside = mentioned.length > 0
        const structureFiguresBelow = key === "structure" && hasAside

        const figureRow = mentioned.map(n => {
          const fig = figures[n - 1]
          if (!fig) return null
          const isPrimaryAnchor = firstSectionByFigure.get(n) === key
          return (
            <InlineFigurePreview
              key={`${key}-${n}`}
              fig={fig}
              n={n}
              anchorId={isPrimaryAnchor ? `cath-figure-${n}` : undefined}
              references={references}
            />
          )
        })

        return (
          <section key={key} aria-labelledby={`cath-section-${key}`}>
            <h2 id={`cath-section-${key}`} className="text-xl md:text-2xl font-semibold text-primary mb-2.5">
              {title}
            </h2>
            {structureFiguresBelow ? (
              <div className="flex flex-col gap-5">
                <div className="min-w-0 w-full rounded-xl border border-border bg-muted/10 p-5 md:p-6 text-muted-foreground">
                  <p className="m-0 whitespace-pre-wrap text-[0.97rem] leading-7">
                    {renderTextWithFigureLinks(rawText, figureCount)}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 w-full min-w-0">
                  {figureRow}
                </div>
              </div>
            ) : hasAside ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 lg:items-stretch">
                <div className="min-w-0 rounded-xl border border-border bg-muted/10 p-5 md:p-6 text-muted-foreground">
                  <p className="m-0 whitespace-pre-wrap text-[0.97rem] leading-7">
                    {renderTextWithFigureLinks(rawText, figureCount)}
                  </p>
                </div>

                <aside className="min-w-0 w-full flex flex-col gap-3">
                  {figureRow}
                </aside>
              </div>
            ) : (
              <div className="min-w-0 w-full rounded-xl border border-border bg-muted/10 p-5 md:p-6 text-muted-foreground">
                <p className="m-0 whitespace-pre-wrap text-[0.97rem] leading-7">
                  {renderTextWithFigureLinks(rawText, figureCount)}
                </p>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default CathDomainNarrativeSections

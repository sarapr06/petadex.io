import React, { useMemo } from "react"
import {
  getFigureNumbersForRenderSection,
} from "../../utils/cathDomainFigureAnchors"
import { renderCaptionWithReferenceAnchors } from "../../utils/cathCaptionLinks"
import { buildCathReferencePlan } from "../../utils/cathReferencePlan"
import {
  CATH_SECTION_PLACEHOLDER,
  getAllCathSections,
  getCathSectionNarrativeText,
  pfamEntryUrl,
} from "../../utils/cathDomainSectionConfig"
import { shouldRenderFigure } from "../../utils/cathFigureVisibility"

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

const narrativeRefLinkOptions = {
  numbered: true,
  linkClassName:
    "text-accent font-semibold no-underline hover:underline decoration-accent/50 hover:text-accent-hover",
}

/**
 * Plain text with optional Figure N anchors and URLs/PMC tokens linked to `references` like captions.
 */
function renderNarrativeParagraph(text, figureCount, references, displayNumberByCatalogIndex) {
  const str = String(text || "")
  const refs = references || []

  const renderPlain = plain =>
    renderCaptionWithReferenceAnchors(plain, refs, narrativeRefLinkOptions, displayNumberByCatalogIndex) ??
    plain

  if (!str || figureCount < 1 || !/Figure\s+\d+/i.test(str)) {
    return renderPlain(str)
  }

  const parts = str.split(FIGURE_TOKEN)
  const out = []

  for (let i = 0; i < parts.length; i += 3) {
    const plain = parts[i]
    if (plain) out.push(renderPlain(plain))

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

function renderNarrativeContent(text, figureCount, references, displayNumberByCatalogIndex) {
  const str = String(text || "").trim()
  if (!str) return null

  const sections = str.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)

  return sections.map((section, sectionIdx) => {
    const lines = section
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)

    if (!lines.length) return null

    const headingCandidate = lines[0]
    const hasHeading = /:\s*$/.test(headingCandidate) && !/^[-*]\s+/.test(headingCandidate)
    const bodyLines = hasHeading ? lines.slice(1) : lines
    const bulletLines = bodyLines.filter(l => /^[-*]\s+/.test(l))
    const numberedLines = bodyLines.filter(l => /^\d+\.\s+/.test(l))
    const isListOnly = bodyLines.length > 0 && (bulletLines.length === bodyLines.length || numberedLines.length === bodyLines.length)

    return (
      <div key={`narrative-section-${sectionIdx}`} className={sectionIdx === 0 ? "" : "mt-5"}>
        {hasHeading ? (
          <h3 className="m-0 mb-2 text-sm md:text-base font-semibold text-foreground tracking-tight">
            {headingCandidate.replace(/:\s*$/, "")}
          </h3>
        ) : null}
        {isListOnly ? (
          bulletLines.length === bodyLines.length ? (
            <ul className="m-0 pl-5 space-y-1.5 list-disc">
              {bodyLines.map((line, i) => (
                <li key={`bullet-${sectionIdx}-${i}`}>
                  {renderNarrativeParagraph(
                    line.replace(/^[-*]\s+/, ""),
                    figureCount,
                    references,
                    displayNumberByCatalogIndex,
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <ol className="m-0 pl-5 space-y-1.5 list-decimal">
              {bodyLines.map((line, i) => (
                <li key={`numbered-${sectionIdx}-${i}`}>
                  {renderNarrativeParagraph(
                    line.replace(/^\d+\.\s+/, ""),
                    figureCount,
                    references,
                    displayNumberByCatalogIndex,
                  )}
                </li>
              ))}
            </ol>
          )
        ) : (
          <p className="m-0 whitespace-pre-wrap text-[0.97rem] leading-7">
            {renderNarrativeParagraph(lines.join("\n"), figureCount, references, displayNumberByCatalogIndex)}
          </p>
        )}
      </div>
    )
  })
}

/**
 * @param {{
 *   fig: { caption: string, imageSrc?: string|null, alt?: string },
 *   n: number,
 *   anchorId?: string,
 *   references?: { label?: string, url?: string|null }[],
 * }} props
 */
function InlineFigurePreview({ fig, n, anchorId, references = [], displayNumberByCatalogIndex }) {
  if (!shouldRenderFigure(fig)) return null

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
      ) : null}
      {caption ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="text-[0.8rem] text-muted-foreground leading-snug m-0">
            {renderCaptionWithReferenceAnchors(caption, references, numberedCaptionClass, displayNumberByCatalogIndex) ??
              caption}
          </p>
        </div>
      ) : null}
      {references.length > 0 ? (
        <p className="text-[0.7rem] text-muted-foreground/90 mt-2 mb-0 shrink-0">
          Citation numbers link to the References section below.
        </p>
      ) : null}
    </div>
  )
}

/**
 * @param {{ table?: { caption?: string, headers?: string[], rows?: string[][] } }} props
 */
function InlineDomainTable({ table }) {
  if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows) || !table.rows.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 md:p-5">
      {table.caption ? (
        <p className="text-sm font-semibold text-foreground mb-3 m-0">{table.caption}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr>
              {table.headers.map((h, i) => (
                <th
                  key={`h-${i}`}
                  className="border border-border bg-muted/30 px-3 py-2 text-left font-semibold text-foreground align-top"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rIdx) => (
              <tr key={`r-${rIdx}`}>
                {row.map((cell, cIdx) => (
                  <td
                    key={`c-${rIdx}-${cIdx}`}
                    className="border border-border px-3 py-2 text-muted-foreground align-top whitespace-pre-wrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * @param {{ pfamAccession: string }} props
 */
function SectionPlaceholder({ pfamAccession }) {
  const pfamUrl = pfamEntryUrl(pfamAccession)
  return (
    <div className="min-w-0 w-full rounded-xl border border-dashed border-border bg-muted/10 p-5 md:p-6">
      <p className="text-muted-foreground text-[0.97rem] leading-7 m-0">
        {CATH_SECTION_PLACEHOLDER}{" "}
        <a
          href={pfamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline underline-offset-2"
        >
          Pfam {pfamAccession}
        </a>{" "}
        may have additional context.
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

  const references = domain.references || []
  const referencePlan = useMemo(() => buildCathReferencePlan(domain), [domain])
  const displayNumberByCatalogIndex = referencePlan.displayNumberByCatalogIndex
  const sections = useMemo(() => getAllCathSections(), [])

  return (
    <div className="space-y-8 md:space-y-10">
      {sections.map(({ key, title }) => {
        const rawText = getCathSectionNarrativeText(domain, key)
        const figureNumsForSection = getFigureNumbersForRenderSection(domain, key)
        const figureItems = figureNumsForSection
          .map(n => {
            const fig = figures[n - 1]
            if (!shouldRenderFigure(fig)) return null
            return (
              <InlineFigurePreview
                key={`${key}-${n}`}
                fig={fig}
                n={n}
                anchorId={`cath-figure-${n}`}
                references={references}
                displayNumberByCatalogIndex={displayNumberByCatalogIndex}
              />
            )
          })
          .filter(Boolean)
        const hasAside = figureItems.length > 0
        const renderFiguresBelow = hasAside
        const hasNarrativeText = rawText.length > 0
        const hasTable =
          (key === "ptms" && domain.prePtmsTable) ||
          (key === "localization" &&
            (domain.preLocalizationTable || domain.postLocalizationTable)) ||
          (key === "catalyticResidues" && domain.postCatalyticResiduesTable) ||
          (key === "structure" && domain.postStructureTable)
        const showPlaceholder = !hasNarrativeText && !hasAside && !hasTable

        return (
          <section
            key={key}
            id={`cath-section-${key}`}
            aria-labelledby={`cath-section-${key}-heading`}
            className="scroll-mt-28"
          >
            {key === "ptms" && domain.prePtmsTable ? (
              <div className="mb-4">
                <InlineDomainTable table={domain.prePtmsTable} />
              </div>
            ) : null}
            {key === "localization" && domain.preLocalizationTable ? (
              <div className="mb-4">
                <InlineDomainTable table={domain.preLocalizationTable} />
              </div>
            ) : null}
            {key === "localization" && domain.postLocalizationTable ? (
              <div className="mb-4">
                <InlineDomainTable table={domain.postLocalizationTable} />
              </div>
            ) : null}
            {key === "catalyticResidues" && domain.postCatalyticResiduesTable ? (
              <div className="mb-4">
                <InlineDomainTable table={domain.postCatalyticResiduesTable} />
              </div>
            ) : null}
            <h2
              id={`cath-section-${key}-heading`}
              className="text-xl md:text-2xl font-semibold text-primary mb-2.5"
            >
              {title}
            </h2>
            {renderFiguresBelow ? (
              <div className="flex flex-col gap-5">
                {hasNarrativeText ? (
                  <div className="min-w-0 w-full rounded-xl border border-border bg-muted/10 p-5 md:p-6 text-muted-foreground">
                    <div className="text-[0.97rem] leading-7 max-w-3xl">
                      {renderNarrativeContent(
                        rawText,
                        figureCount,
                        references,
                        displayNumberByCatalogIndex,
                      )}
                    </div>
                  </div>
                ) : null}
                <div
                  className={
                    figureItems.length === 1
                      ? "w-full min-w-0 flex justify-center"
                      : "grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 w-full min-w-0"
                  }
                >
                  {figureItems.length === 1 ? (
                    <div className="w-full max-w-2xl">{figureItems[0]}</div>
                  ) : (
                    figureItems
                  )}
                </div>
                {key === "structure" && domain.postStructureTable ? (
                  <InlineDomainTable table={domain.postStructureTable} />
                ) : null}
              </div>
            ) : hasNarrativeText ? (
              <div className="min-w-0 w-full rounded-xl border border-border bg-muted/10 p-5 md:p-6 text-muted-foreground">
                <div className="text-[0.97rem] leading-7 max-w-3xl">
                  {renderNarrativeContent(
                    rawText,
                    figureCount,
                    references,
                    displayNumberByCatalogIndex,
                  )}
                </div>
                {key === "structure" && domain.postStructureTable ? (
                  <div className="mt-4">
                    <InlineDomainTable table={domain.postStructureTable} />
                  </div>
                ) : null}
              </div>
            ) : key === "structure" && domain.postStructureTable ? (
              <InlineDomainTable table={domain.postStructureTable} />
            ) : showPlaceholder ? (
              <SectionPlaceholder pfamAccession={domain.pfamAccession} />
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

export default CathDomainNarrativeSections

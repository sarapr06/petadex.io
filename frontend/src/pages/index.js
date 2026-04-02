import React, { useState, useEffect } from "react"
import { Link } from "gatsby"
import { useScrollHeader } from "../hooks/useScrollHeader"
import SequencePanel from "../components/SequencePanel"
import StructurePanel from "../components/StructurePanel"
import MetadataPanel from "../components/MetadataPanel"
import Container from "../components/Container"
import config from "../config"

const CheckIcon = () => (
  <span className="inline-block h-4 w-4 shrink-0 text-accent">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
)

const FEATURES = [
  {
    title: "Comprehensive Sequence Database",
    description: "Access a curated collection of plastic‑degrading enzyme sequences with detailed metadata, experimental data, and provenance information from research worldwide.",
    bullets: ["350+ PETase sequences", "Experimental activity data", "Geographic metadata", "Regular updates"],
    panel: "sequence",
  },
  {
    title: "3D Structure Visualization",
    description: "Explore protein structures in your browser with interactive 3D visualization. View PDB structures, analyze binding sites, and understand enzyme mechanisms.",
    bullets: ["Interactive 3D viewer", "PDB structure data", "Structural annotations", "Browser‑based rendering"],
    panel: "structure",
  },
  {
    title: "Experimental Data & Analytics",
    description: "Access experimental measurements, plate reader data, and enzyme activity profiles. Compare performance across conditions and identify promising candidates.",
    bullets: ["Activity measurements", "Environmental parameters", "Data visualization", "Export capabilities"],
    panel: "metadata",
  },
]

const USE_CASES = [
  {
    role: "Protein Engineering",
    sub: "Discover new variants",
    quote: "Find novel enzyme variants with specific activity profiles for bioengineering applications.",
    icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />,
  },
  {
    role: "Environmental Research",
    sub: "Study enzyme distribution",
    quote: "Explore the geographic distribution of plastic‑degrading enzymes and discover patterns in enzyme evolution.",
    icon: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  },
  {
    role: "Computational Biology",
    sub: "Build predictive models",
    quote: "Access comprehensive datasets for computational modeling and machine learning applications.",
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
  },
]

export default function HomePage() {
  useScrollHeader()

  const ISPETASE_ACCESSION = "WP_054022242.1"
  const [sequenceData, setSequenceData] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [summaryStats, setSummaryStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchIsPETaseData() {
      try {
        const [seqRes, metaRes, statsRes] = await Promise.all([
          fetch(`${config.apiUrl}/fastaa/${ISPETASE_ACCESSION}`),
          fetch(`${config.apiUrl}/gene-metadata/by-accession/${ISPETASE_ACCESSION}`),
          fetch(`${config.apiUrl}/aa-seq-features/${ISPETASE_ACCESSION}`),
        ])
        if (seqRes.ok) setSequenceData(await seqRes.json())
        if (metaRes.ok) { const m = await metaRes.json(); setMetadata(Array.isArray(m) ? m : [m]) }
        if (statsRes.ok) setSummaryStats(await statsRes.json())
      } catch (err) {
        console.error("Error fetching IsPETase data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchIsPETaseData()
  }, [])

  const loadingPlaceholder = (height = "h-[400px]") => (
    <div className={`${height} flex items-center justify-center`}>
      <p className="text-sm text-muted-foreground italic">Loading preview…</p>
    </div>
  )

  return (
    <>
      {/* ── Hero ── */}
      <section className="py-20 md:py-24 text-center">
        <Container size="sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Explore plastic‑degrading enzymes.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            PETadex is an open‑source platform for discovering and analyzing plastic‑degrading
            enzymes (PETases). Search sequences, view 3D structures, and explore experimental
            data for enzymes that break down plastics.
          </p>
          <div className="mt-6 flex flex-col items-center gap-y-3">
            <Link to="/fastaa" className="btn btn-primary rounded-full px-6 py-3 text-sm">
              Start Exploring — It's Free
            </Link>
            <p className="text-xs text-muted-foreground">
              <small>Open‑source and community‑driven.</small>
            </p>
          </div>
        </Container>

        <Container className="mt-10">
          <img
            src={require("../images/cys-pilot-seqs.png").default}
            loading="lazy"
            alt="PETase Network Diagram"
            className="mx-auto w-full max-w-4xl rounded-xl shadow-md"
          />
        </Container>
      </section>

      {/* ── Partners strip ── */}
      <section className="bg-surface-raised border-y border py-5">
        <Container className="text-center">
          <p className="text-xs text-muted-foreground">
            Powered by open science and community contributions
          </p>
        </Container>
      </section>

      {/* ── Features ── */}
      <section className="py-16 md:py-20">
        <Container className="space-y-20">
          {FEATURES.map(({ title, description, bullets, panel }, i) => {
            const isEven = i % 2 === 0

            const textBlock = (
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">{description}</p>
                <ul className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2 md:gap-3 md:text-base">
                  {bullets.map(item => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckIcon />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )

            const previewBlock = (
              <div className={`card overflow-auto p-0 ${panel === "structure" ? "h-[500px]" : "max-h-[400px]  p-5"}`}>
                {loading ? loadingPlaceholder(panel === "structure" ? "h-[500px]" : "h-[400px]") : (
                  panel === "sequence" ? (
                    <SequencePanel sequence={sequenceData?.sequence} accession={ISPETASE_ACCESSION} summaryStats={summaryStats} statsLoading={false} />
                  ) : panel === "structure" ? (
                    <StructurePanel accession={ISPETASE_ACCESSION} />
                  ) : (
                    <MetadataPanel metadata={metadata} accession={ISPETASE_ACCESSION} />
                  )
                )}
              </div>
            )

            return (
              <div key={title} className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
                {isEven ? <>{previewBlock}{textBlock}</> : <>{textBlock}{previewBlock}</>}
              </div>
            )
          })}
        </Container>
      </section>

      {/* ── Use cases ── */}
      <section className="bg-surface-raised border-y border py-16 md:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Use Cases</h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              How researchers use PETadex
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {USE_CASES.map(({ role, sub, quote, icon }) => (
              <div key={role} className="text-center">
                <svg viewBox="0 0 24 24" height="48" width="48" fill="none"
                  stroke="currentColor" strokeWidth="1.5"
                  className="mx-auto mb-4 text-muted-foreground">
                  {icon}
                </svg>
                <p className="mb-4 text-sm text-muted-foreground md:text-base">"{quote}"</p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{role}</strong>
                  <br />
                  <small>{sub}</small>
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Closing CTA ── */}
      <section className="bg-surface-sunken py-16 md:py-20">
        <Container size="sm" className="text-center">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
            Start exploring today.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Join the community tackling plastic pollution through enzyme research.
          </p>
          <div className="mt-6 flex flex-col items-center gap-y-3">
            <Link to="/fastaa" className="btn btn-primary rounded-full px-6 py-3 text-sm">
              Browse Database — It's Free
            </Link>
            <p className="text-xs text-muted-foreground">
              <small>Open source and always free.</small>
            </p>
          </div>
        </Container>
      </section>
    </>
  )
}

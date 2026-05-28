import React, { useMemo, useState } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import AnnotatedProteinViewer from "../components/protein/AnnotatedProteinViewer"
import {
  annotationRecords,
  annotationRecordForAccession,
} from "../components/protein/annotation-reference/annotations"

const DEFAULT_ACCESSION = annotationRecords[0]?.accession ?? ""

export default function AnnotatedStructurePrototypePage() {
  const [accession, setAccession] = useState(DEFAULT_ACCESSION)
  const record = useMemo(
    () => annotationRecordForAccession(accession),
    [accession],
  )

  return (
    <div className="py-10 md:py-14">
      <Container size="wide">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground mb-8">
          <strong className="font-semibold">Prototype page.</strong> Annotated 3D
          viewer concept inspired by Quigley&apos;s PyMOL references.
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Annotated structure viewer (prototype)
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
          This sandbox combines Mol* structure rendering with explicit
          residue-level annotation notes. Highlighted residues appear as
          ball-and-stick on the 3D model (see sidebar for notes).
          </p>
        </header>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 mb-6">
          <label htmlFor="annotated-accession-select" className="text-sm font-medium text-foreground">
            Accessions with annotation records
          </label>
          <select
            id="annotated-accession-select"
            className="input w-full max-w-md mt-2 font-mono text-sm"
            value={accession}
            onChange={e => setAccession(e.target.value)}
          >
            {annotationRecords.map(r => (
              <option key={r.accession} value={r.accession}>
                {r.accession}
                {r.displayName ? ` — ${r.displayName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <AnnotatedProteinViewer accession={accession} record={record} />
      </Container>
    </div>
  )
}

export const Head = () => (
  <Seo
    title="Annotated structure viewer prototype"
    description="Prototype Mol* viewer with residue annotation overlays and notes."
  />
)

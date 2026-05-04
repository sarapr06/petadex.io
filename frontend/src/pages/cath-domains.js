import React, { useEffect, useMemo, useState } from "react"
import Seo from "../components/seo"
import { useScrollHeader } from "../hooks/useScrollHeader"
import Container from "../components/common/Container"
import config from "../config"
import CathDomainHero from "../components/cath/CathDomainHero"
import CathDomainProfileSelector from "../components/cath/CathDomainProfileSelector"
import CathDomainVisualizationPanel from "../components/cath/CathDomainVisualizationPanel"
import CathDomainNarrativeSections from "../components/cath/CathDomainNarrativeSections"
import CathDomainFiguresAndRefs from "../components/cath/CathDomainFiguresAndRefs"
import CathDomainRelatedLinks from "../components/cath/CathDomainRelatedLinks"
import { PLACEHOLDER_DOMAINS } from "../data/cathDomainResearch.placeholder"
import { mergeCathDomainFromAtlas } from "../utils/mergeCathDomainFromAtlas"

function buildFallbackDomainModels() {
  return PLACEHOLDER_DOMAINS.filter(p => p.atlasComponent != null).map(p =>
    mergeCathDomainFromAtlas(
      {
        component: p.atlasComponent,
        cath_domain: p.cathId,
        domain_name: p.displayName,
        family_count: 0,
        profile_hmm: p.profileHmm,
      },
      PLACEHOLDER_DOMAINS,
    ),
  )
}

function parseCathQuery(search) {
  const params = new URLSearchParams(search || "")
  const component = params.get("component")
  const cath = params.get("cath")
  return {
    componentNum: component != null && component !== "" ? parseInt(component, 10) : null,
    cathRaw: cath != null && cath !== "" ? decodeURIComponent(cath.trim()) : null,
  }
}

function pickIdFromQuery(domainModels, { componentNum, cathRaw }) {
  if (!domainModels.length) return null
  if (Number.isFinite(componentNum)) {
    const byComp = domainModels.find(d => d.component === componentNum)
    if (byComp) return byComp.id
  }
  if (cathRaw) {
    const byCath = domainModels.find(d => d.cathId === cathRaw)
    if (byCath) return byCath.id
  }
  return null
}

const CathDomainsPage = ({ location }) => {
  useScrollHeader()

  const [domainModels, setDomainModels] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const search = location?.search ?? (typeof window !== "undefined" ? window.location.search : "")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    fetch(`${config.apiUrl}/atlas/components`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        const rows = Array.isArray(data?.components) ? data.components : []
        if (!rows.length) {
          setDomainModels(buildFallbackDomainModels())
          setLoadError("Atlas components unavailable; showing illustrative rows only.")
          return
        }
        setDomainModels(rows.map(row => mergeCathDomainFromAtlas(row, PLACEHOLDER_DOMAINS)))
      })
      .catch(() => {
        if (cancelled) return
        setDomainModels(buildFallbackDomainModels())
        setLoadError("Could not load atlas components; showing illustrative rows only.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!domainModels.length) return
    const { componentNum, cathRaw } = parseCathQuery(search)
    const fromQuery = pickIdFromQuery(domainModels, { componentNum, cathRaw })
    setSelectedId(prev => {
      if (fromQuery) return fromQuery
      if (prev && domainModels.some(d => d.id === prev)) return prev
      return domainModels[0].id
    })
  }, [domainModels, search])

  const selected = useMemo(
    () => domainModels.find(d => d.id === selectedId) ?? domainModels[0] ?? null,
    [domainModels, selectedId],
  )

  if (loading && !domainModels.length) {
    return (
      <section className="py-16 md:py-20">
        <Container>
          <p className="text-muted-foreground">Loading atlas components…</p>
        </Container>
      </section>
    )
  }

  if (!selected) {
    return (
      <section className="py-16 md:py-20">
        <Container>
          <p className="text-muted-foreground">No domain entries available.</p>
        </Container>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-20">
      <Container>
        <CathDomainHero />

        {loadError && (
          <p className="mb-6 text-sm text-amber-700 dark:text-amber-300/90 max-w-2xl" role="status">
            {loadError}
          </p>
        )}

        <CathDomainProfileSelector
          domains={domainModels}
          selectedId={selected.id}
          onSelectId={setSelectedId}
        />

        <CathDomainVisualizationPanel domain={selected} />
        <CathDomainRelatedLinks domain={selected} />
        <CathDomainNarrativeSections domain={selected} />
        <CathDomainFiguresAndRefs domain={selected} />
      </Container>
    </section>
  )
}

export default CathDomainsPage

export const Head = () => (
  <Seo
    title="CATH domains"
    description="PETadex: CATH domain reference pages keyed to family atlas components, linked to enzymes and the UMAP atlas."
  />
)

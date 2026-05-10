/**
 * Fetch UniProt entry + AlphaFold confidence for prototype enrichment tracks.
 * Sequence coordinates remain from Petadex; annotations are keyed by UniProt accession.
 */

/** @typedef {'summary' | 'full'} DisplayMode */

const SUMMARY_CAP = 10
const FULL_HARD_CAP = 150

const DOMAIN_TYPES = new Set(["DOMAIN", "REPEAT"])

const FAMILY_REGION_TYPES = new Set([
  "REGION",
  "COMPBIAS",
  "TRANSIT",
  "TRANSMEM",
  "INTRAMEM",
  "TOPO_DOM",
  "ZN_FING",
  "COILED",
  "DNA_BIND",
  "SIGNAL",
])

const SITE_TYPES = new Set([
  "MOTIF",
  "BINDING",
  "ACT_SITE",
  "METAL",
  "SITE",
  "MOD_RES",
  "LIPID",
  "CARBOHYD",
  "DISULFID",
  "CROSS_LINK",
  "VARIANT",
  "MUTAGEN",
])

const TRACK_META = [
  {
    id: "families",
    title: "Families / regions (UniProt)",
    bucket: "families",
    palette: ["#0d9488", "#14b8a6", "#5eead4", "#99f6e4"],
  },
  {
    id: "domains",
    title: "Domains / repeats (UniProt)",
    bucket: "domains",
    palette: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
  },
  {
    id: "sites",
    title: "Motifs / sites (UniProt)",
    bucket: "sites",
    palette: ["#c2410c", "#ea580c", "#fb923c", "#fdba74"],
  },
]

/**
 * @param {string} type
 * @returns {'domains' | 'families' | 'sites' | 'skip'}
 */
function bucketForFeatureType(type) {
  const u = String(type || "")
    .toUpperCase()
    .replace(/\s+/g, "_")
  if (DOMAIN_TYPES.has(u)) return "domains"
  if (FAMILY_REGION_TYPES.has(u)) return "families"
  if (SITE_TYPES.has(u)) return "sites"
  return "skip"
}

function spanFromLocation(loc) {
  const s = loc?.start?.value
  const e = loc?.end?.value
  if (typeof s !== "number" || typeof e !== "number") return null
  if (s < 1 || e < 1) return null
  const start = Math.min(s, e)
  const end = Math.max(s, e)
  return { start, end }
}

function labelForFeature(f) {
  const t = f.type || "Feature"
  const d = f.description ? String(f.description) : ""
  return d ? `${t}: ${d}` : t
}

function pickColor(bucketIdx, fi, palette) {
  return palette[fi % palette.length]
}

/**
 * @param {any[]} features raw UniProt `features` array
 * @param {number} seqLen
 * @param {DisplayMode} mode
 */
export function logicalTracksFromUniProtFeatures(features, seqLen, mode) {
  const buckets = { domains: [], families: [], sites: [] }
  if (!Array.isArray(features)) return []

  for (const f of features) {
    const span = spanFromLocation(f.location)
    if (!span) continue
    if (span.end > seqLen || span.start > seqLen) continue
    const bucket = bucketForFeatureType(f.type)
    if (bucket === "skip") continue
    buckets[bucket].push({
      label: labelForFeature(f),
      start: span.start,
      end: span.end,
      _width: span.end - span.start + 1,
    })
  }

  const cap = mode === "summary" ? SUMMARY_CAP : FULL_HARD_CAP

  return TRACK_META.map(meta => {
    let rows = buckets[meta.bucket]
    if (mode === "summary") {
      rows = [...rows].sort((a, b) => b._width - a._width).slice(0, cap)
    } else {
      rows = rows.slice(0, cap)
    }
    return {
      id: meta.id,
      title: meta.title,
      features: rows.map((row, fi) => ({
        label: row.label,
        start: row.start,
        end: row.end,
        color: pickColor(meta.bucket, fi, meta.palette),
      })),
    }
  })
}

/**
 * @param {string} accession
 * @returns {Promise<any | null>}
 */
export async function fetchUniProtEntryJson(accession) {
  if (!accession) return null
  const url = `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(accession)}.json`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

/**
 * AlphaFold confidence JSON → Nightingale linegraph `data` rows.
 * Strict length match with Petadex sequence (enrichment is advisory).
 *
 * @param {string} accession UniProt accession
 * @param {number} sequenceLength Petadex sequence length
 */
export async function fetchAlphaFoldPLDDTLineData(accession, sequenceLength) {
  if (!accession || sequenceLength < 1) {
    return {
      ok: false,
      message: null,
      lineData: null,
    }
  }

  try {
    const predUrl = `https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(accession)}`
    const predRes = await fetch(predUrl)
    if (!predRes.ok) {
      return {
        ok: false,
        message: "AlphaFold API returned no prediction for this accession.",
        lineData: null,
      }
    }
    const predictions = await predRes.json()
    const hit = Array.isArray(predictions) ? predictions[0] : null
    if (!hit?.plddtDocUrl) {
      return {
        ok: false,
        message: "No AlphaFold pLDDT document URL for this protein.",
        lineData: null,
      }
    }

    const confRes = await fetch(hit.plddtDocUrl)
    if (!confRes.ok) {
      return {
        ok: false,
        message: "Could not download AlphaFold confidence JSON.",
        lineData: null,
      }
    }
    const doc = await confRes.json()
    const scores = doc.confidenceScore
    if (!Array.isArray(scores) || scores.length !== sequenceLength) {
      return {
        ok: false,
        message: `AlphaFold pLDDT length (${scores?.length ?? 0}) does not match Petadex sequence length (${sequenceLength}); pLDDT track hidden.`,
        lineData: null,
      }
    }

    const residueNumbers = Array.isArray(doc.residueNumber) ? doc.residueNumber : []
    const values = scores.map((value, i) => ({
      position: typeof residueNumbers[i] === "number" ? residueNumbers[i] : i + 1,
      value,
    }))

    return {
      ok: true,
      message: null,
      lineData: [
        {
          name: "pLDDT (AlphaFold)",
          range: [0, 100],
          color: "#6366f1",
          values,
        },
      ],
    }
  } catch (e) {
    return {
      ok: false,
      message: e?.message || String(e),
      lineData: null,
    }
  }
}

export function logicalTracksHaveFeatures(tracks) {
  return (
    Array.isArray(tracks) && tracks.some(t => Array.isArray(t.features) && t.features.length > 0)
  )
}

/**
 * @param {{
 *   uniProtAccession: string | null,
 *   sequenceLength: number,
 *   displayMode: DisplayMode,
 * }} opts
 */
export async function loadEnrichmentPayload(opts) {
  const { uniProtAccession, sequenceLength, displayMode } = opts
  const empty = {
    uniProtUsed: null,
    uniProtEntry: null,
    logicalTracks: [],
    lineData: null,
    alphaFoldMessage: null,
    uniProtMessage: null,
  }

  if (!uniProtAccession || sequenceLength < 1) return empty

  const entry = await fetchUniProtEntryJson(uniProtAccession)
  let logicalTracks = []
  let uniProtMessage = null

  if (entry?.features?.length) {
    logicalTracks = logicalTracksFromUniProtFeatures(
      entry.features,
      sequenceLength,
      displayMode,
    )
    const total = logicalTracks.reduce((n, t) => n + t.features.length, 0)
    if (total === 0) {
      uniProtMessage =
        "UniProt entry loaded but no drawable features matched our categories."
      logicalTracks = []
    }
  } else {
    uniProtMessage = "Could not load UniProt features for this accession."
  }

  const af = await fetchAlphaFoldPLDDTLineData(
    uniProtAccession,
    sequenceLength,
  )

  return {
    uniProtUsed: uniProtAccession,
    uniProtEntry: entry,
    logicalTracks,
    lineData: af.lineData,
    alphaFoldMessage: af.ok ? null : af.message,
    uniProtMessage,
  }
}

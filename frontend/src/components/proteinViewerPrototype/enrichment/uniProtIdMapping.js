/**
 * Resolve a UniProt accession for enrichment-only use (does not affect Petadex IDs elsewhere).
 * Uses UniProt ID Mapping REST API when needed.
 * @see https://www.uniprot.org/help/id_mapping
 */

const UNIPROT_AC_RE =
  /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i

const CACHE_PREFIX = "petadex-uniprot-map:"

/** @param {string} s */
export function normalizeUniProtAccession(s) {
  if (!s || typeof s !== "string") return ""
  return s.trim().split(/\s+/)[0].toUpperCase()
}

/** @param {string} id */
export function looksLikeUniProtAccession(id) {
  return !!normalizeUniProtAccession(id).match(UNIPROT_AC_RE)
}

/**
 * Poll UniProt idmapping job until finished.
 * @param {string} jobId from POST response
 */
async function pollUntilFinished(jobId, { maxMs = 25000, intervalMs = 400 } = {}) {
  const statusUrl = `https://rest.uniprot.org/idmapping/status/${jobId}`
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const res = await fetch(statusUrl)
    if (!res.ok) throw new Error(`UniProt mapping status ${res.status}`)
    const data = await res.json()
    if (data.jobStatus === "FINISHED") return
    if (data.jobStatus === "ERROR")
      throw new Error(data.errors?.[0]?.errorMessage || "ID mapping failed")
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error("UniProt ID mapping timed out")
}

/**
 * POST idmapping run; poll results URL for mapped UniProt accessions.
 * @param {string} fromDb UniProt "from" database id
 * @param {string} accession
 * @returns {Promise<string|null>}
 */
async function mapOne(fromDb, accession) {
  const params = new URLSearchParams()
  params.set("from", fromDb)
  params.set("to", "UniProtKB")
  params.set("ids", accession)

  const res = await fetch("https://rest.uniprot.org/idmapping/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`UniProt mapping HTTP ${res.status} ${errText.slice(0, 200)}`)
  }
  const job = await res.json()
  const jobId = job.jobId
  if (!jobId) throw new Error("UniProt mapping: no job id returned")

  await pollUntilFinished(jobId)

  const resultsRes = await fetch(
    `https://rest.uniprot.org/idmapping/results/${jobId}?format=json`,
  )
  if (!resultsRes.ok) {
    throw new Error(`UniProt mapping results ${resultsRes.status}`)
  }
  const payload = await resultsRes.json()
  const rows = Array.isArray(payload?.results) ? payload.results : []
  const first = rows[0]
  const to = first?.to
  if (!to) return null
  if (typeof to === "string") return normalizeUniProtAccession(to.split(/\s/)[0])
  if (to.primaryAccession) return normalizeUniProtAccession(to.primaryAccession)
  return null
}

const FROM_DBS_TRY_ORDER = [
  "RefSeq_Protein",
  "RefSeq_Nucleotide",
  "EMBL-GenBank-DDBJ",
  "PDB",
  "Gene_Name",
]

/**
 * Best-effort GenBank / RefSeq / other ID → UniProt KB accession.
 * @param {string} petadexAccession accession from Petadex FASTA
 * @returns {Promise<{ accession: string | null, method: string, detail: string }>}
 */
export async function resolveUniProtFromPetadexAccession(petadexAccession) {
  const raw = (petadexAccession || "").trim()
  if (!raw || raw === "__demo__") {
    return { accession: null, method: "none", detail: "Demo mode" }
  }

  const cached =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(CACHE_PREFIX + raw)
      : null
  if (cached === "__none__") {
    return { accession: null, method: "cache", detail: "No mapping (cached)" }
  }
  if (cached && looksLikeUniProtAccession(cached)) {
    return {
      accession: cached,
      method: "cache",
      detail: "Cached UniProt mapping",
    }
  }

  if (looksLikeUniProtAccession(raw)) {
    return {
      accession: normalizeUniProtAccession(raw),
      method: "direct",
      detail: "Already looks like UniProt accession",
    }
  }

  let lastErr = ""
  for (const fromDb of FROM_DBS_TRY_ORDER) {
    try {
      const mapped = await mapOne(fromDb, raw)
      if (mapped && looksLikeUniProtAccession(mapped)) {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(CACHE_PREFIX + raw, mapped)
        }
        return {
          accession: mapped,
          method: "idmapping",
          detail: `Mapped via UniProt (${fromDb} → UniProtKB)`,
        }
      }
    } catch (e) {
      lastErr = e.message || String(e)
    }
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(CACHE_PREFIX + raw, "__none__")
  }
  return {
    accession: null,
    method: "failed",
    detail: lastErr || "No UniProt mapping for this accession",
  }
}

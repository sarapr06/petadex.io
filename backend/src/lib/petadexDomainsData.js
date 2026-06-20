/**
 * Petadex catalytic domain viewer — production tables (not sara_* prototype).
 */

import { pool } from '../db.js';
import { fetchEnzymeSequenceByOrfId, resolveOrfId } from './orfResolve.js';

const TRACK_COLORS = {
  domains: '#2e7dd6',
  signal: '#95a5a6',
};

/**
 * @param {number} start
 * @param {number} end
 * @param {number} seqLen
 */
function clampInterval(start, end, seqLen) {
  const L = Math.max(1, seqLen);
  let s = Math.max(1, Math.round(Number(start)));
  let e = Math.max(s, Math.round(Number(end)));
  if (!Number.isFinite(s)) s = 1;
  if (!Number.isFinite(e)) e = s;
  s = Math.min(s, L);
  e = Math.min(e, L);
  if (e < s) e = s;
  return { start: s, end: e };
}

/**
 * @param {string | null | undefined} hmmId
 */
function formatHmmLabel(hmmId) {
  const id = String(hmmId || '').trim();
  if (!id) return 'Petadex HMM';
  // Handles both `pazy_hmm_c1_260407` and sub-cluster `pazy_hmm_c1-1_260407`.
  const match = id.match(/pazy_hmm_c([\d]+(?:-[\d]+)*)_/i);
  if (match) return `PAZy HMM cluster ${match[1]}`;
  return id;
}

/**
 * @param {string | null | undefined} residues
 */
function formatCatalyticResidues(residues) {
  const raw = String(residues || '').trim();
  const inner = raw.match(/^\{(.+)\}$/);
  return inner ? inner[1] : raw;
}

/**
 * @param {Array<{ pazy_hmm_id?: string, domain_start?: number, domain_end?: number, catalytic_residues?: string }>} domainRows
 * @param {number} seqLen
 */
function domainTracksFromRows(domainRows, seqLen) {
  const features = domainRows.map((row) => {
    const { start, end } = clampInterval(row.domain_start, row.domain_end, seqLen);
    const hmm = formatHmmLabel(row.pazy_hmm_id);
    const cat = formatCatalyticResidues(row.catalytic_residues);
    const label = cat ? `${hmm} (${cat})` : hmm;
    return {
      label,
      start,
      end,
      color: TRACK_COLORS.domains,
    };
  });

  if (!features.length) return [];
  return [{ id: 'petadex-domains', title: 'Petadex catalytic domains', features }];
}

/**
 * @param {Array<{ signal?: string, cleave_after?: string | number }>} signalRows
 * @param {number} seqLen
 */
function signalTracksFromRows(signalRows, seqLen) {
  const features = signalRows
    .map((row) => {
      if (String(row.signal || '').toUpperCase() === 'NA') return null;
      const cleavage = Number(row.cleave_after);
      if (!Number.isFinite(cleavage) || cleavage <= 0) return null;
      const end = Math.min(seqLen, Math.max(1, Math.round(cleavage)));
      return {
        label: 'Signal peptide',
        start: 1,
        end,
        color: TRACK_COLORS.signal,
      };
    })
    .filter(Boolean);

  if (!features.length) return [];
  return [{ id: 'signal', title: 'Predicted signal sequence', features }];
}

export { resolveOrfId };

/**
 * @param {number} orfId
 */
export async function buildPetadexDomainsPayload(orfId) {
  const enzyme = await fetchEnzymeSequenceByOrfId(orfId);
  if (!enzyme) {
    const err = new Error(`No enzyme sequence for orf_id ${orfId}`);
    err.status = 404;
    throw err;
  }

  const { sequence, accession } = enzyme;
  const seqLen = sequence.length;

  const [domainsRes, signalRes] = await Promise.all([
    pool.query(
      `SELECT orf_id, pazy_hmm_id, domain_start, domain_end, catalytic_residues
       FROM petadex_catalytic_domains
       WHERE orf_id = $1
       ORDER BY domain_start`,
      [orfId],
    ),
    accession
      ? pool.query(
          `SELECT accession, signal, cleave_after
           FROM predicted_signal_sequence
           WHERE accession = $1
           LIMIT 1`,
          [accession],
        )
      : Promise.resolve({ rows: [] }),
  ]);

  const logicalTracks = [
    ...domainTracksFromRows(domainsRes.rows, seqLen),
    ...signalTracksFromRows(signalRes.rows, seqLen),
  ];

  return {
    orfId,
    accession,
    sequence,
    sequenceLength: seqLen,
    logicalTracks,
    meta: {
      domainCount: domainsRes.rows.length,
      signalCount: signalRes.rows.filter(
        (r) => String(r.signal || '').toUpperCase() !== 'NA',
      ).length,
      tables: ['petadex_catalytic_domains', 'predicted_signal_sequence'],
    },
  };
}

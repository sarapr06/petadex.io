/**
 * Sara_* prototype tables (Drylab test data only — not production Petadex domains).
 */

import { pool } from '../db.js';
import {
  saraSyntheticSequence,
  SARA_SYNTHETIC_LENGTH,
} from './saraSyntheticSequence.js';

const TRACK_COLORS = {
  domains: '#2e7dd6',
  motifs: '#c45c2a',
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
 * @param {Array<{ domain?: string, motif?: string, signal_sequence?: string, start_aa?: number, end_aa?: number, cleavage_site?: number }>} domainRows
 * @param {Array<{ motif?: string, start_aa?: number, end_aa?: number }>} motifRows
 * @param {Array<{ signal_sequence?: string, cleavage_site?: number }>} signalRows
 * @param {number} seqLen
 */
export function logicalTracksFromRows(domainRows, motifRows, signalRows, seqLen) {
  const tracks = [];

  const domainFeatures = domainRows.map((row) => {
    const { start, end } = clampInterval(row.start_aa, row.end_aa, seqLen);
    return {
      label: String(row.domain ?? 'Domain'),
      start,
      end,
      color: TRACK_COLORS.domains,
    };
  });
  if (domainFeatures.length) {
    tracks.push({ id: 'domains', title: 'Domains (sara test)', features: domainFeatures });
  }

  const motifFeatures = motifRows.map((row) => {
    const { start, end } = clampInterval(row.start_aa, row.end_aa, seqLen);
    return {
      label: String(row.motif ?? 'Motif'),
      start,
      end,
      color: TRACK_COLORS.motifs,
    };
  });
  if (motifFeatures.length) {
    tracks.push({ id: 'motifs', title: 'Important motifs (sara test)', features: motifFeatures });
  }

  const signalFeatures = signalRows.map((row) => {
    const cleavage = Number(row.cleavage_site);
    const end = Number.isFinite(cleavage)
      ? Math.min(seqLen, Math.max(1, Math.round(cleavage)))
      : 1;
    return {
      label: String(row.signal_sequence ?? 'Signal peptide'),
      start: 1,
      end,
      color: TRACK_COLORS.signal,
    };
  });
  if (signalFeatures.length) {
    tracks.push({ id: 'signal', title: 'Signal sequence (sara test)', features: signalFeatures });
  }

  return tracks;
}

/**
 * @param {number} orfId
 */
export async function buildSaraViewerPayload(orfId) {
  const [domainsRes, motifsRes, signalsRes] = await Promise.all([
    pool.query(
      `SELECT orf_id, domain, start_aa, end_aa
       FROM sara_domains WHERE orf_id = $1 ORDER BY start_aa`,
      [orfId],
    ),
    pool.query(
      `SELECT orf_id, motif, start_aa, end_aa
       FROM sara_important_motfis WHERE orf_id = $1 ORDER BY start_aa`,
      [orfId],
    ),
    pool.query(
      `SELECT orf_id, signal_sequence, cleavage_site
       FROM sara_signal_sequences WHERE orf_id = $1`,
      [orfId],
    ),
  ]);

  const sequence = saraSyntheticSequence(orfId, SARA_SYNTHETIC_LENGTH);
  const seqLen = sequence.length;
  const logicalTracks = logicalTracksFromRows(
    domainsRes.rows,
    motifsRes.rows,
    signalsRes.rows,
    seqLen,
  );

  return {
    orfId,
    sequence,
    sequenceLength: seqLen,
    syntheticSequence: true,
    logicalTracks,
    meta: {
      domainCount: domainsRes.rows.length,
      motifCount: motifsRes.rows.length,
      signalCount: signalsRes.rows.length,
      tables: ['sara_domains', 'sara_important_motfis', 'sara_signal_sequences'],
    },
  };
}

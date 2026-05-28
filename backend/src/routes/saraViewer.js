// backend/src/routes/saraViewer.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import {
  saraSyntheticSequence,
  SARA_SYNTHETIC_LENGTH,
} from '../lib/saraSyntheticSequence.js';

const router = Router();

const orfIdSchema = Joi.number().integer().min(1).required();

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
  // start and end are the start and end of the interval, seqLen is the length of the sequence
  // we need to clamp the interval to the sequence length
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
function logicalTracksFromRows(domainRows, motifRows, signalRows, seqLen) {
  // domainRows, motifRows, and signalRows are arrays of objects with start_aa and end_aa properties
  // we need to convert these to features that can be displayed in the viewer
  // seqLen is the length of the sequence 
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
    tracks.push({
      id: 'domains',
      title: 'Domains',
      features: domainFeatures,
    });
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
    tracks.push({
      id: 'motifs',
      title: 'Important motifs',
      features: motifFeatures,
    });
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
    tracks.push({
      id: 'signal',
      title: 'Signal sequence',
      features: signalFeatures,
    });
  }

  return tracks;
}

// GET distinct orf_ids across sara_* tables
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT orf_id FROM (
        SELECT orf_id FROM sara_domains
        UNION
        SELECT orf_id FROM sara_important_motfis
        UNION
        SELECT orf_id FROM sara_signal_sequences
      ) t
      ORDER BY orf_id ASC`
    );
    const orfIds = rows.map((r) => Number(r.orf_id)).filter((n) => Number.isFinite(n));
    res.json({ orfIds: orfIds.length ? orfIds : [1] });
  } catch (err) {
    next(err);
  }
});

// GET viewer payload for one orf_id
router.get('/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(
    Number(req.params.orfId)
  );
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const [domainsRes, motifsRes, signalsRes] = await Promise.all([
      pool.query(
        `SELECT orf_id, domain, start_aa, end_aa
         FROM sara_domains WHERE orf_id = $1 ORDER BY start_aa`,
        [orfId]
      ),
      pool.query(
        `SELECT orf_id, motif, start_aa, end_aa
         FROM sara_important_motfis WHERE orf_id = $1 ORDER BY start_aa`,
        [orfId]
      ),
      pool.query(
        `SELECT orf_id, signal_sequence, cleavage_site
         FROM sara_signal_sequences WHERE orf_id = $1`,
        [orfId]
      ),
    ]);

    const sequence = saraSyntheticSequence(orfId, SARA_SYNTHETIC_LENGTH);
    const seqLen = sequence.length;
    const logicalTracks = logicalTracksFromRows(
      domainsRes.rows,
      motifsRes.rows,
      signalsRes.rows,
      seqLen
    );

    res.json({
      orfId,
      sequence,
      sequenceLength: seqLen,
      syntheticSequence: true,
      logicalTracks,
      meta: {
        domainCount: domainsRes.rows.length,
        motifCount: motifsRes.rows.length,
        signalCount: signalsRes.rows.length,
        tables: [
          'sara_domains',
          'sara_important_motfis',
          'sara_signal_sequences',
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

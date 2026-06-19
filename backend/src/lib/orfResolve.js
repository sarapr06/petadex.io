import { pool } from '../db.js';

/**
 * Resolve catalytic ORF id from explicit id, enzyme id, or GenBank accession.
 *
 * @param {{ orfId?: number | null, enzymeId?: number | null, accession?: string | null }} input
 * @returns {Promise<number | null>}
 */
export async function resolveOrfId({ orfId, enzymeId, accession }) {
  const direct = Number(orfId ?? enzymeId);
  if (Number.isInteger(direct) && direct > 0) return direct;

  const acc = String(accession || '').trim();
  if (!acc) return null;

  const nr = await pool.query(
    `SELECT orf_id FROM nr_catalytic_orfs WHERE genbank_accession_id = $1 LIMIT 1`,
    [acc],
  );
  if (nr.rows[0]?.orf_id != null) return Number(nr.rows[0].orf_id);

  const enz = await pool.query(
    `SELECT enzyme_id FROM enzyme_fastaa WHERE genbank_accession_id = $1 LIMIT 1`,
    [acc],
  );
  if (enz.rows[0]?.enzyme_id != null) return Number(enz.rows[0].enzyme_id);

  return null;
}

/**
 * @param {number} orfId
 * @returns {Promise<{ sequence: string, accession: string | null } | null>}
 */
export async function fetchEnzymeSequenceByOrfId(orfId) {
  const { rows } = await pool.query(
    `SELECT translated_sequence, genbank_accession_id
     FROM enzyme_fastaa WHERE enzyme_id = $1`,
    [orfId],
  );
  const seq = rows[0]?.translated_sequence;
  if (typeof seq !== 'string' || !seq.length) return null;
  return {
    sequence: seq,
    accession: rows[0]?.genbank_accession_id ?? null,
  };
}

// backend/src/routes/petadexDomains.js
import { Router } from 'express';
import Joi from 'joi';
import {
  buildPetadexDomainsPayload,
  resolveOrfId,
} from '../lib/petadexDomainsData.js';

const router = Router();

const orfIdSchema = Joi.number().integer().min(1).required();
const accessionSchema = Joi.string().max(128).required();

async function respondWithPayload(orfId, res, next, extra = {}) {
  try {
    // Throws 404 only when the ORF/enzyme has no stored sequence (truly missing).
    const payload = await buildPetadexDomainsPayload(orfId);
    // Sequence exists: always 200. `annotated` distinguishes "has domains/signal"
    // from "real ORF but no catalytic annotations" so the UI can message accurately.
    res.json({
      ...payload,
      annotated: payload.logicalTracks.length > 0,
      ...extra,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message, reason: 'orf-not-found' });
    }
    next(err);
  }
}

// GET viewer payload by GenBank accession
router.get('/by-accession/:accession', async (req, res, next) => {
  const { error, value: accession } = accessionSchema.validate(req.params.accession);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const orfId = await resolveOrfId({ accession });
    if (!orfId) {
      return res.status(404).json({
        error: `No catalytic ORF mapping for accession ${accession}`,
      });
    }
    return respondWithPayload(orfId, res, next, {
      resolvedFrom: 'accession',
      accession,
    });
  } catch (err) {
    next(err);
  }
});

// GET viewer payload for one orf_id (= enzyme_id in enzyme_fastaa)
router.get('/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId));
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return respondWithPayload(orfId, res, next);
});

export default router;

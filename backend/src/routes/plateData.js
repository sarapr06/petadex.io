// backend/src/routes/plateData.js
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();
const schema = Joi.string().max(64).required();

// GET substrate comparison data across all genes for given media types
router.get('/substrate-comparison', async (req, res, next) => {
  const mediaString = req.query.media || 'BHET12.5,BHET25';
  const mediaSchema = Joi.string().max(128);
  const { error } = mediaSchema.validate(mediaString);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const mediaTypes = mediaString.split(',').map(m => m.trim());

  try {
    const { rows } = await pool.query(
      `SELECT
        aav.gene,
        gm.nickname,
        aav.accession,
        aav.source,
        aav.media,
        aav.timepoint_hours,
        AVG(aav.readout_value) AS average_readout,
        STDDEV_SAMP(aav.readout_value) AS stddev_readout,
        COUNT(*) AS sample_count
      FROM accession_activity_view aav
      LEFT JOIN gene_metadata gm ON aav.gene = gm.gene
      WHERE aav.media = ANY($1::text[])
        AND aav.readout_value IS NOT NULL
      GROUP BY
        aav.gene,
        gm.nickname,
        aav.accession,
        aav.source,
        aav.media,
        aav.timepoint_hours
      ORDER BY aav.gene, aav.media, aav.timepoint_hours`,
      [mediaTypes]
    );

    console.log('Substrate comparison:', rows.length, 'rows found');
    if (!rows.length) return res.status(404).json({ error: 'No substrate data found' });
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET activity metrics (peak - subsequent_min) per gene per substrate
// Activity represents the degradation signal: max intensity minus the minimum after the peak
router.get('/substrate-activity', async (req, res, next) => {
  const mediaString = req.query.media || 'BHET12.5,BHET25';
  const mediaSchema = Joi.string().max(128);
  const { error } = mediaSchema.validate(mediaString);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const mediaTypes = mediaString.split(',').map(m => m.trim());

  try {
    // Fetch averaged data per gene/media/timepoint
    const { rows } = await pool.query(
      `SELECT
        aav.gene,
        gm.nickname,
        aav.accession,
        aav.source,
        aav.media,
        aav.timepoint_hours,
        AVG(aav.readout_value) AS average_readout,
        COUNT(*) AS sample_count
      FROM accession_activity_view aav
      LEFT JOIN gene_metadata gm ON aav.gene = gm.gene
      WHERE aav.media = ANY($1::text[])
        AND aav.readout_value IS NOT NULL
      GROUP BY
        aav.gene,
        gm.nickname,
        aav.accession,
        aav.source,
        aav.media,
        aav.timepoint_hours
      ORDER BY aav.gene, aav.media, aav.timepoint_hours`,
      [mediaTypes]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'No substrate data found' });
    }

    // Group data by gene and media
    const geneMediaGroups = {};
    for (const row of rows) {
      const key = `${row.gene}|${row.media}`;
      if (!geneMediaGroups[key]) {
        geneMediaGroups[key] = {
          gene: row.gene,
          nickname: row.nickname,
          accession: row.accession,
          source: row.source,
          media: row.media,
          timepoints: []
        };
      }
      geneMediaGroups[key].timepoints.push({
        timepoint_hours: parseFloat(row.timepoint_hours),
        average_readout: parseFloat(row.average_readout),
        sample_count: parseInt(row.sample_count)
      });
    }

    // Calculate activity for each gene/media combination
    const activityResults = [];
    for (const key in geneMediaGroups) {
      const group = geneMediaGroups[key];
      const timepoints = group.timepoints.sort((a, b) => a.timepoint_hours - b.timepoint_hours);

      // Find global peak (max intensity)
      let peakIdx = 0;
      let peakValue = timepoints[0].average_readout;
      for (let i = 1; i < timepoints.length; i++) {
        if (timepoints[i].average_readout > peakValue) {
          peakValue = timepoints[i].average_readout;
          peakIdx = i;
        }
      }

      // Check if peak is at last timepoint (no subsequent data for degradation)
      if (peakIdx === timepoints.length - 1) {
        activityResults.push({
          gene: group.gene,
          nickname: group.nickname,
          accession: group.accession,
          source: group.source,
          media: group.media,
          activity: null,
          peak_value: peakValue,
          peak_timepoint: timepoints[peakIdx].timepoint_hours,
          min_value: null,
          min_timepoint: null,
          flag: 'peak_at_end',
          timepoint_count: timepoints.length
        });
        continue;
      }

      // Find minimum in subsequent timepoints
      let minIdx = peakIdx + 1;
      let minValue = timepoints[peakIdx + 1].average_readout;
      for (let i = peakIdx + 2; i < timepoints.length; i++) {
        if (timepoints[i].average_readout < minValue) {
          minValue = timepoints[i].average_readout;
          minIdx = i;
        }
      }

      const activity = peakValue - minValue;

      // Flag potential issues
      let flag = null;
      if (peakIdx === 0) {
        flag = 'peak_at_start';
      } else if (minIdx - peakIdx === 1) {
        flag = 'single_degradation_point';
      } else if (activity < 0) {
        flag = 'negative_activity';
      }

      activityResults.push({
        gene: group.gene,
        nickname: group.nickname,
        accession: group.accession,
        source: group.source,
        media: group.media,
        activity: activity,
        peak_value: peakValue,
        peak_timepoint: timepoints[peakIdx].timepoint_hours,
        min_value: minValue,
        min_timepoint: timepoints[minIdx].timepoint_hours,
        flag: flag,
        timepoint_count: timepoints.length
      });
    }

    // Sort by gene then media for consistent output
    activityResults.sort((a, b) => {
      if (a.gene !== b.gene) return a.gene.localeCompare(b.gene);
      return a.media.localeCompare(b.media);
    });

    console.log('Substrate activity:', activityResults.length, 'gene/media combinations');
    res.json(activityResults);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET average readout for a specific gene, grouped by plate with metadata
router.get('/gene/:gene/average', async (req, res, next) => {
  console.log('API request received for gene plate data:', req.params.gene);
  const { error, value } = schema.validate(req.params.gene);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        pd.plate,
        AVG(pd.readout_value) as average_readout,
        STDDEV_SAMP(pd.readout_value) as stddev_readout,
        COUNT(*) as sample_count,
        pd.measurement_type,
        pm.timepoint_hours,
        pm.temp_celsius,
        pm.ph,
        pm.media,
        pm.organism,
        pm.exp_id,
        pm.exp_description,
        pm.date_created,
        pm.date_read
      FROM plate_data pd
      LEFT JOIN plate_metadata pm ON pd.plate = pm.plate
      WHERE pd.gene = $1 AND pd.readout_value IS NOT NULL
      GROUP BY pd.plate, pd.measurement_type, pm.timepoint_hours, pm.temp_celsius,
               pm.ph, pm.media, pm.organism, pm.exp_id, pm.exp_description,
               pm.date_created, pm.date_read
      ORDER BY pm.timepoint_hours, pd.plate`,
      [value]
    );

    console.log('Query result:', rows.length, 'plate(s) found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    // Return all plate averages with their metadata
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET all plate data for a gene
router.get('/gene/:gene', async (req, res, next) => {
  console.log('API request received for gene plate data:', req.params.gene);
  const { error, value } = schema.validate(req.params.gene);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        gene,
        plate,
        plasmid,
        column,
        row,
        normalization_method,
        readout_value,
        colony_size,
        date_entered,
        measurement_type
      FROM plate_data
      WHERE gene = $1
      ORDER BY plate, row, column`,
      [value]
    );

    console.log('Query result:', rows.length, 'records found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET plate activity using materialized view (includes all metadata)
router.get('/activity/gene/:gene', async (req, res, next) => {
  console.log('API request received for gene activity data:', req.params.gene);
  const { error, value } = schema.validate(req.params.gene);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        gene,
        plate,
        readout_value,
        measurement_type,
        normalization_method,
        colony_size,
        row,
        column,
        plasmid,
        exp_id,
        exp_description,
        media,
        timepoint_hours,
        temp_celsius,
        ph,
        organism,
        control_genes,
        operator,
        date_created,
        date_read
      FROM plate_activity_view
      WHERE gene = $1
      ORDER BY plate, row, column`,
      [value]
    );

    console.log('Query result:', rows.length, 'records found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

// GET plate data by experiment ID
router.get('/experiment/:exp_id', async (req, res, next) => {
  console.log('API request received for experiment:', req.params.exp_id);
  const { error, value } = schema.validate(req.params.exp_id);
  if (error) {
    console.log('Validation error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        gene,
        plate,
        readout_value,
        measurement_type,
        normalization_method,
        colony_size,
        row,
        column,
        plasmid,
        exp_id,
        exp_description,
        media,
        timepoint_hours,
        temp_celsius,
        ph,
        organism,
        control_genes,
        operator,
        date_created,
        date_read
      FROM plate_activity_view
      WHERE exp_id = $1
      ORDER BY gene, plate, row, column`,
      [value]
    );

    console.log('Query result:', rows.length, 'records found');
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    next(err);
  }
});

export default router;
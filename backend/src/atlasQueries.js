/**
 * Atlas / family UMAP payloads: production uses `family_atlas` (materialized view);
 * some databases only have `family_umap_coordinates` + `enzyme_taxonomy`.
 */

export const UMAP_POINTS_FROM_FAMILY_ATLAS = `
  SELECT family_id, umap_x, umap_y, family_size,
         organism, taxonomy, country, component,
         cath_domain, domain_name
  FROM family_atlas`;

/**
 * ~65k rows; DISTINCT ON + hash join — typically a few seconds on RDS.
 */
export const UMAP_POINTS_FROM_BASE_TABLES = `
  WITH fam_tax AS (
    SELECT DISTINCT ON (family) family AS family_id, component, cath_domain, domain_name
    FROM enzyme_taxonomy
    ORDER BY family, enzyme_id
  )
  SELECT f.family_id, f.umap_x, f.umap_y, f.family_size,
         NULL::text AS organism,
         (COALESCE(t.domain_name::text, 'Unknown') || '; Unknown') AS taxonomy,
         NULL::text AS country,
         t.component,
         t.cath_domain,
         t.domain_name
  FROM family_umap_coordinates f
  LEFT JOIN fam_tax t ON t.family_id = f.family_id`;

export const FAMILY_METADATA_FROM_FAMILY_ATLAS = `
  SELECT family_id, genbank_accession_id, definition, organism, taxonomy,
         journal, collection_date, country, family_size, umap_x, umap_y
  FROM family_atlas
  WHERE family_id = $1
  LIMIT 1`;

export const FAMILY_METADATA_FROM_BASE_TABLES = `
  SELECT f.family_id, b.genbank_accession_id, b.definition, b.organism, b.taxonomy,
         b.journal, b.collection_date, b.country, f.family_size, f.umap_x, f.umap_y
  FROM family_umap_coordinates f
  LEFT JOIN LATERAL (
    SELECT ef.genbank_accession_id
    FROM enzyme_taxonomy et
    JOIN enzyme_fastaa ef ON ef.enzyme_id = et.enzyme_id
    WHERE et.family = f.family_id
    ORDER BY et.enzyme_id
    LIMIT 1
  ) gid ON true
  LEFT JOIN blast_nr_metadata b ON b.genbank_accession_id = gid.genbank_accession_id
  WHERE f.family_id = $1
  LIMIT 1`;

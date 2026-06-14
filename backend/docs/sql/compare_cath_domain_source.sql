-- Manual verification: compare CATH labels from family_atlas vs any static map.
-- Run in psql against the PETadex DB. Inspect rows where cath_domain is null or 'NA'.

SELECT
  component,
  cath_domain,
  domain_name,
  COUNT(*) AS family_rows
FROM family_atlas
WHERE component IS NOT NULL
GROUP BY component, cath_domain, domain_name
ORDER BY component, family_rows DESC;

-- The frontend falls back to COMPONENT_TO_CATH[component] in cathColors.js only when
-- cath_domain is missing; prefer fixing data or the MV over expanding the static map.

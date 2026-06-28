/**
 * CATH citation order is validated automatically in gatsby-node.js onPreBuild.
 *
 * - `npm run develop` / `npm run build` → prints warnings for out-of-order profiles
 * - `VALIDATE_CATH_REFS=strict npm run build` → fails the build on violations
 *
 * Numbers are assigned by first URL/PMC appearance top-to-bottom:
 * Overview → narrative sections → inline figure captions (where figures render).
 *
 * Duplicate resources (same PDB / DOI / PMC under different URLs) share one number.
 */

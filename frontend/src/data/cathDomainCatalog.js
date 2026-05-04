/**
 * Canonical Pfam-centered catalog for `/cath-domains` (literature review signup sheet order).
 * **23 profiles** (3HBOH … RoxA-like_Cyt-c). Narrative fields are living curation targets.
 *
 * Figures: add PNG/SVG under `frontend/static/cath/` and set `imageSrc: "/cath/yourfile.png"` on
 * an entry’s `figures[]` item. Pfam→atlas counts: edit `pfamAtlasMap.js` or set `atlasComponent`
 * on an entry when validated.
 *
 * @typedef {{ label: string, url?: string|null }} CathDomainReference
 * @typedef {{ label: string, cathId: string }} CathDomainLegendSegment
 * @typedef {{ caption: string, imageSrc?: string|null, alt?: string }} CathDomainFigure
 *
 * @typedef {Object} CathDomainCatalogEntry
 * @property {string} id  Stable id, e.g. pf-PF01425
 * @property {string} pfamAccession  Uppercase PFxxxxx
 * @property {string} profileHmm  Short Pfam family name (signup sheet)
 * @property {number|null} [atlasComponent]  PETadex atlas component when known
 * @property {string} cathId  Representative CATH node for visualization (refine per entry)
 * @property {string} displayName  Human-readable title
 * @property {string} lastUpdated  ISO date
 * @property {string} summary
 * @property {string} localization
 * @property {string} ptms
 * @property {string} catalyticResidues
 * @property {string} function
 * @property {string} labNotes
 * @property {CathDomainReference[]} references
 * @property {CathDomainLegendSegment[]} [legendSegments]
 * @property {(string|CathDomainFigure)[]} [figures]  Strings treated as caption-only figures
 */

const PF = acc => `https://www.ebi.ac.uk/interpro/entry/pfam/${acc}/`

/** @param {string} acc */
function pfamRefs(acc, extraLabel, extraUrl) {
  const refs = [
    {
      label: `Pfam / InterPro: ${acc}`,
      url: PF(acc),
    },
    {
      label: "Pfam: protein domain families database",
      url: "https://www.ebi.ac.uk/interpro/",
    },
  ]
  if (extraLabel && extraUrl) refs.push({ label: extraLabel, url: extraUrl })
  return refs
}

/** @type {CathDomainCatalogEntry[]} */
export const CATH_DOMAIN_CATALOG = [
  {
    id: "pf-PF10605",
    pfamAccession: "PF10605",
    profileHmm: "3HBOH",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "3-hydroxyisobutyryl-CoA hydrolase-related",
    lastUpdated: "2026-05-04",
    summary:
      "The 3HBOH domain family includes CoA-dependent hydrolase modules involved in valine/leucine catabolism and related pathways. PETadex sequences carrying this domain should be interpreted alongside pathway context and cofactor availability.",
    localization:
      "Typically cytosolic or matrix-localized in bacteria and mitochondria of eukaryotes; secretion is uncommon unless fused to signal peptides—verify per genome.",
    ptms:
      "Acetylation and oxidation of surface lysines/cysteines can occur; systematic PTMs for this Pfam are best cited from organism-specific proteomics.",
    catalyticResidues:
      "Conserved catalytic machinery follows the α/β hydrolase pattern (nucleophile–acid–His triad or dyad variants); map residues to a reference structure when annotating PETadex hits.",
    function:
      "Hydrolytic cleavage of 3-hydroxyisobutyryl-CoA and related thioesters; paralogs may accept altered acyl chains—use assays with physiological CoA thioesters where possible.",
    labNotes:
      "Express with cognate CoA ligases if reconstructing pathways; assay pH and divalent metals as for other CoA hydrolases.",
    references: pfamRefs("PF10605"),
    legendSegments: [{ label: "Representative CATH", cathId: "3.40.50.1820" }],
    figures: [{ caption: "Add domain topology or representative PDB ribbon after curation." }],
  },
  {
    id: "pf-PF00561",
    pfamAccession: "PF00561",
    profileHmm: "Abhydrolase_1",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Abhydrolase domain (α/β hydrolase fold)",
    lastUpdated: "2026-05-04",
    summary:
      "Abhydrolase_1 is the canonical α/β hydrolase domain spanning lipases, esterases, epoxide hydrolases, and dehalogenases. Plastic-degrading homologs often cluster here; substrate specificity is not predictable from sequence alone.",
    localization:
      "Extracellular, periplasmic, inner membrane–attached, or cytosolic depending on secretion signals and fusion architecture.",
    ptms:
      "Disulfides and N-linked glycans appear in secreted eukaryotic homologs; bacterial PET enzymes may lack glycosylation.",
    catalyticResidues:
      "Typical catalytic triad (Ser/Cys, Asp/Glu, His) or evolved variations; compare to PDB templates when assigning catalytic positions in PETadex alignments.",
    function:
      "Hydrolysis of ester, amide, or haloalkyl bonds depending on specialization; plastic activity requires docking assays against polyester substrates.",
    labNotes:
      "Profile HMM hits require boundary checks—catalytic domain may be embedded in multi-domain PETases.",
    references: pfamRefs(
      "PF00561",
      "Holmquist M. Alpha/beta-hydrolase fold enzymes: structures, functions and catalytic mechanisms. Curr Opin Struct Biol. 2000.",
      "https://doi.org/10.1016/S0959-440X(99)00076-1",
    ),
    legendSegments: [{ label: "α/β hydrolase", cathId: "3.40.50.1820" }],
    figures: [{ caption: "Schematic: nucleophilic elbow and oxyanion hole (replace with curated figure)." }],
  },
  {
    id: "pf-PF12695",
    pfamAccession: "PF12695",
    profileHmm: "Abhydrolase_5",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Abhydrolase-like domain 5",
    lastUpdated: "2026-05-04",
    summary:
      "Abhydrolase_5 groups divergent α/β hydrolase modules related to Abhydrolase_1 but with distinct insertion patterns and accessory motifs.",
    localization:
      "Follows host protein architecture—often cytosolic or secreted when part of lipolytic clusters.",
    ptms:
      "Modification profiles follow host organism; document if studying secreted fungal or bacterial enzyme.",
    catalyticResidues:
      "Verify catalytic triad spacing against Pfam seed alignment; some members may be inactive regulatory domains.",
    function:
      "Putative hydrolase activity on lipids or xenobiotic esters; biochemical validation recommended for PETadex sequences.",
    labNotes:
      "Co-expression with chaperones may improve folding for heterologous characterization.",
    references: pfamRefs("PF12695"),
    legendSegments: [{ label: "α/β hydrolase-like", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF01425",
    pfamAccession: "PF01425",
    profileHmm: "Amidase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Amidase / nitrilase-related signature amidase",
    lastUpdated: "2026-05-04",
    summary:
      "PF01425 amidases catalyze hydrolysis of amides to acids and ammonia; nitrilase-related members participate in nitrile detoxification and specialized metabolism.",
    localization:
      "Often cytosolic; industrial amidases may be secreted after engineering signal peptides.",
    ptms:
      "Cys oxidation can inactivate nucleophiles; metal cofactors (Co, Ni) in some subfamilies affect stability.",
    catalyticResidues:
      "Cys/Ser nucleophile typical for signature amidase branch; map to reference PDB for residue numbering in PETadex.",
    function:
      "Amide bond hydrolysis; relevance to polyester chemistry is indirect unless fused with polyester-binding modules.",
    labNotes:
      "Amide substrates differ from PET esters—pair predictions with substrate docking where PET relevance is claimed.",
    references: pfamRefs("PF01425"),
    legendSegments: [{ label: "Signature amidase", cathId: "3.40.50.1820" }],
    figures: [{ caption: "Replace with catalytic Cys/Ser environment after structural alignment." }],
  },
  {
    id: "pf-PF24708",
    pfamAccession: "PF24708",
    profileHmm: "AMS3",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "AMS3 domain",
    lastUpdated: "2026-05-04",
    summary:
      "AMS3 is a recently defined hydrolase-associated domain family; functional literature is still emerging—treat PETadex annotations as hypotheses pending assay.",
    localization: "Unknown without fusion context; annotate using predicted secretion signals.",
    ptms: "Insufficient conserved data—cite organism-specific studies.",
    catalyticResidues: "Align to nearest structural homolog to propose catalytic residues.",
    function: "Putative hydrolase accessory or catalytic domain—experimental validation required.",
    labNotes: "Prioritize structural modeling (AlphaFold) plus substrate screening.",
    references: pfamRefs("PF24708"),
    legendSegments: [{ label: "Hydrolase-associated", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF20434",
    pfamAccession: "PF20434",
    profileHmm: "BD-FAE",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "BD-FAE (bacterial degradation / feruloyl esterase–like)",
    lastUpdated: "2026-05-04",
    summary:
      "BD-FAE families combine features of feruloyl esterase and bacterial polyester-interacting enzymes in some reports—curate with primary literature on aromatic polyester turnover.",
    localization: "Often secreted from Gram-positive bacteria; check signalP predictions.",
    ptms: "Secreted bacterial forms typically lack eukaryotic PTMs.",
    catalyticResidues: "α/β hydrolase catalytic motif; map against feruloyl esterase PDB templates.",
    function: "Ester hydrolysis on aromatic moieties; potential relevance to terephthalate/aryl ester chemistry.",
    labNotes: "Compare KM on model esters vs PET oligomers when testing PET relevance.",
    references: pfamRefs("PF20434"),
    legendSegments: [{ label: "Esterase-like", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF00144",
    pfamAccession: "PF00144",
    profileHmm: "Beta-lactamase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Serine beta-lactamase domain",
    lastUpdated: "2026-05-04",
    summary:
      "Beta-lactamases use a serine hydrolase mechanism distinct from classic lipases but within the α/β hydrolase fold; PETadex hits may reflect remote homology or domain fusion artifacts.",
    localization: "Periplasmic in Gram-negative bacteria; cytoplasmic variants exist.",
    ptms: "Disulfides stabilize many Class A/C enzymes.",
    catalyticResidues: "Ser–Lys catalytic pair or Ser-containing triad depending on class.",
    function: "β-lactam ring hydrolysis; polyester activity is non-canonical and requires validation.",
    labNotes: "Use class-specific inhibitors to confirm identity in vitro.",
    references: pfamRefs(
      "PF00144",
      "Drawz SM, Bonomo RA. Expanding diversity of β-lactamases. Microbiol Spectr. 2016.",
      "https://doi.org/10.1128/microbiolspec.VMBF-0026-2015",
    ),
    legendSegments: [{ label: "β-lactamase", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF07224",
    pfamAccession: "PF07224",
    profileHmm: "Chlorophyllase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Chlorophyllase domain",
    lastUpdated: "2026-05-04",
    summary:
      "Chlorophyllases remove phytyl chains from chlorophyll; hydrolase chemistry differs from PET esterases but shares evolutionary ties with α/β hydrolase variants.",
    localization: "Chloroplast-targeted in plants; bacterial homologs depend on operon context.",
    ptms: "Chloroplast processing and transit peptides cleaved after import.",
    catalyticResidues: "Ser hydrolase chemistry—align to plant chlorophyllase structures.",
    function: "Chlorophyll dephytylation; PET relevance indirect.",
    labNotes: "Assay with chlorophyll derivatives rather than PET for functional confirmation.",
    references: pfamRefs("PF07224"),
    legendSegments: [{ label: "Chlorophyllase", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF07732",
    pfamAccession: "PF07732",
    profileHmm: "Cu-oxidase_3",
    atlasComponent: null,
    cathId: "3.90.1300.10",
    displayName: "Multicopper oxidase / laccase-like domain",
    lastUpdated: "2026-05-04",
    summary:
      "Cu-oxidase_3 includes multicopper oxidases (e.g. laccases) that oxidize phenolics using four copper centers—not an α/β hydrolase. PETadex placement may reflect modular enzymes or annotation overlap.",
    localization: "Secreted or outer-membrane-associated in many fungi and bacteria.",
    ptms: "Heavy glycosylation in fungal laccases affects stability and secretion.",
    catalyticResidues: "Copper-binding histidines/cysteines—distinct from serine hydrolases.",
    function: "One-electron oxidation of phenolic substrates; aromatic polymer modification distinct from ester hydrolysis.",
    labNotes: "Require Cu supplementation and redox mediators in assays; do not conflate with esterase kinetics.",
    references: pfamRefs(
      "PF07732",
      "Jones SM, Solomon EI. Electron transfer and reaction mechanism of laccases. Cell Mol Life Sci. 2015.",
      "https://doi.org/10.1007/s00018-015-1826-6",
    ),
    legendSegments: [{ label: "Multicopper oxidase", cathId: "3.90.1300.10" }],
    figures: [],
  },
  {
    id: "pf-PF01083",
    pfamAccession: "PF01083",
    profileHmm: "Cutinase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Cutinase / cutin hydrolase",
    lastUpdated: "2026-05-04",
    summary:
      "Cutinases hydrolyze cutin and related polyesters; they are central references for understanding polyesterase activity on PET model substrates.",
    localization: "Secreted fungal enzymes; bacterial cutinase-like proteins may lack classical secretion signals.",
    ptms: "Fungal cutinases are often glycosylated; stability enhanced by disulfides.",
    catalyticResidues: "Ser–His–Asp triad on minimal α/β scaffold; surface-exposed active site.",
    function: "Cutin and synthetic polyester hydrolysis; strong PET literature precedent for engineered variants.",
    labNotes: "Use pNP esters and PET films with controlled crystallinity for benchmarking.",
    references: pfamRefs(
      "PF01083",
      "Carvalho H et al. Cutinase structure and applications. Biotechnol Adv. 2019.",
      "https://doi.org/10.1016/j.biotechadv.2018.12.005",
    ),
    legendSegments: [{ label: "Cutinase", cathId: "3.40.50.1820" }],
    figures: [{ caption: "Surface-open active site (add PDB ribbon — e.g. 1CEX)." }],
  },
  {
    id: "pf-PF01738",
    pfamAccession: "PF01738",
    profileHmm: "DLH",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Dienelactone hydrolase family",
    lastUpdated: "2026-05-04",
    summary:
      "Dienelactone hydrolases resolve vinylogous lactones in xenobiotic degradation pathways; mechanistically α/β hydrolase–related.",
    localization: "Typically cytosolic in xenobiotic-degrading bacteria.",
    ptms: "Limited eukaryotic data—bacterial enzymes dominate literature.",
    catalyticResidues: "Standard triad mapping applies after alignment to DLH structures.",
    function: "Lactone ring hydrolysis; relevance to PET requires substrate-level evidence.",
    labNotes: "Use lactone model substrates before PET analogs.",
    references: pfamRefs("PF01738"),
    legendSegments: [{ label: "DLH", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF10503",
    pfamAccession: "PF10503",
    profileHmm: "Esterase_PHB",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Polyhydroxybutyrate depolymerase / PHB esterase",
    lastUpdated: "2026-05-04",
    summary:
      "PHB depolymerases hydrolyze intracellular polyhydroxyalkanoates; polyester chemistry parallels PET oligomer hydrolysis though polymer crystallinity differs.",
    localization: "Often periplasmic or extracellular depolymerases in PHA-accumulating bacteria.",
    ptms: "Sparse—function dominated by catalytic domain exposure to granule surface.",
    catalyticResidues: "α/β hydrolase triad; substrate-binding grooves tuned to short-chain esters.",
    function: "PHA chain-end hydrolysis; PET links are contextual (polyesterase toolbox).",
    labNotes: "Compare chain-length specificity vs PET oligomers explicitly.",
    references: pfamRefs("PF10503"),
    legendSegments: [{ label: "PHA esterase", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF12146",
    pfamAccession: "PF12146",
    profileHmm: "Hydrolase_4",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Hydrolase-like domain 4",
    lastUpdated: "2026-05-04",
    summary:
      "Hydrolase_4 captures divergent α/β hydrolase inserts; functional assignments require experiments beyond HMM membership.",
    localization: "Context-dependent.",
    ptms: "Unknown general theme.",
    catalyticResidues: "Predict via alignment to nearest PDB.",
    function: "Putative hydrolase—validate substrates.",
    labNotes: "Cross-check PETadex neighborhoods for fused binding domains.",
    references: pfamRefs("PF12146"),
    legendSegments: [{ label: "Hydrolase-like", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF01674",
    pfamAccession: "PF01674",
    profileHmm: "Lipase_2",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Lipase class 2 / α/β hydrolase lipase",
    lastUpdated: "2026-05-04",
    summary:
      "Lipase_2 covers bacterial lipases with lid motifs controlling substrate access—relevant to interfacial activation on hydrophobic polymers.",
    localization: "Extracellular or outer-membrane lipoproteins in many bacteria.",
    ptms: "Signal peptide removal essential for activity localization.",
    catalyticResidues: "Conserved triad; lid helices regulate active-site exposure.",
    function: "Triglyceride hydrolysis; interfacial activation principles inform PET film assays.",
    labNotes: "Include detergents / interfaces carefully—they alter lid states vs soluble assays.",
    references: pfamRefs(
      "PF01674",
      "Jaeger KE, Eggert T. Lipases for biotechnology. Curr Opin Biotechnol. 2002.",
      "https://doi.org/10.1016/S0958-1669(02)00358-8",
    ),
    legendSegments: [{ label: "Lipase", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF13472",
    pfamAccession: "PF13472",
    profileHmm: "Lipase_GDSL_2",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "GDSL lipase / esterase",
    lastUpdated: "2026-05-04",
    summary:
      "GDSL enzymes use a flexible catalytic triad (Ser-Gly-Asp-Ser-Leu motif) distinct from classic GXSXG lipases; many exhibit polyesterase activity.",
    localization: "Periplasmic or secreted in bacteria; plant homologs target lipid signaling.",
    ptms: "Disulfides and glycans depend on species; bacterial forms often simpler.",
    catalyticResidues: "Triad residues can reorder during catalysis—consult structural studies.",
    function: "Broad esterase/lipase activity including synthetic polyesters in characterized cases.",
    labNotes: "Ideal for comparing mechanism with classic cutinases in PET benchmarks.",
    references: pfamRefs(
      "PF13472",
      "Akoh CC et al. GDSL family of lipases. Prog Lipid Res. 2004.",
      "https://doi.org/10.1016/j.plipres.2004.05.002",
    ),
    legendSegments: [{ label: "GDSL", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF09995",
    pfamAccession: "PF09995",
    profileHmm: "MPAB_Lcp_cat",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Lcp / polyester hydrolase catalytic module",
    lastUpdated: "2026-05-04",
    summary:
      "Lcp-like catalytic domains depolymerize polyesters such as PHA and related polymers; PET literature discusses homologs acting on aromatic polyesters in some bacteria.",
    localization: "Secreted or attached to cell surface in polyester degraders.",
    ptms: "Check signal peptide cleavage and disulfides in structural models.",
    catalyticResidues: "Ser hydrolase-based mechanism—pair with substrate-channel residues.",
    function: "Exo/endo cleavage of polyester chains; biotechnologically relevant for recycling.",
    labNotes: "Use film thickness and amorphous fraction as controlled variables.",
    references: pfamRefs("PF09995"),
    legendSegments: [{ label: "Polyesterase module", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF03403",
    pfamAccession: "PF03403",
    profileHmm: "PAF-AH_p_II",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Platelet-activating factor acetylhydrolase IB / phospholipase A2-like",
    lastUpdated: "2026-05-04",
    summary:
      "PAF-AH catalytic domains hydrolyze sn-2 esters of phospholipids; α/β hydrolase fold with phospholipid-binding inserts.",
    localization: "Cytosolic or plasma-associated depending on isoform.",
    ptms: "Phosphorylation reported for regulatory control in mammals.",
    catalyticResidues: "Ser hydrolase center distinct from secreted PLA2 His/Asp pairs.",
    function: "Phospholipid acyl hydrolysis; PET relevance limited unless fused with polymer-binding modules.",
    labNotes: "Use phospholipid substrates when validating—not PET films alone.",
    references: pfamRefs("PF03403"),
    legendSegments: [{ label: "PAF-AH-like", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF00082",
    pfamAccession: "PF00082",
    profileHmm: "Peptidase_S8",
    atlasComponent: null,
    cathId: "2.40.10.10",
    displayName: "Subtilisin-like serine peptidase",
    lastUpdated: "2026-05-04",
    summary:
      "Peptidase_S8 subtilisins use a Ser–His–Asp triad in a β-barrel fold unrelated to α/β hydrolases—PETadex hits require fold verification (possible domain confusion).",
    localization: "Secreted proteases common; include signal peptide in constructs.",
    ptms: "Heavy glycosylation in fungal subtilisins.",
    catalyticResidues: "Catalytic triad in β-barrel pocket—not interchangeable with lipase numbering.",
    function: "Peptide bond hydrolysis; polyester activity uncommon—validate separately.",
    labNotes: "Use protease inhibitors and correct buffers when co-assaying with esterases.",
    references: pfamRefs(
      "PF00082",
      "Siezen RJ. Subtilases: superfamily of subtilisin-like serine proteases. Protein Sci. 1996.",
      "https://doi.org/10.1002/pro.5560050303",
    ),
    legendSegments: [{ label: "Subtilisin fold", cathId: "2.40.10.10" }],
    figures: [],
  },
  {
    id: "pf-PF03576",
    pfamAccession: "PF03576",
    profileHmm: "Peptidase_S58",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "S58 serine peptidase / nucleophilic hydrolase",
    lastUpdated: "2026-05-04",
    summary:
      "Peptidase_S8-like catalytic units appear in diverse modular enzymes; confirm fold class before mixing with α/β hydrolase PET mechanisms.",
    localization: "Depends on parent protein.",
    ptms: "Host-specific.",
    catalyticResidues: "Align to S58 reference structures.",
    function: "Peptide bond hydrolysis in canonical forms.",
    labNotes: "Curate remote hits carefully—may be annotation noise.",
    references: pfamRefs("PF03576"),
    legendSegments: [{ label: "Peptidase S58", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF06850",
    pfamAccession: "PF06850",
    profileHmm: "PHB_depo_C",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "PHA depolymerase C-terminal domain",
    lastUpdated: "2026-05-04",
    summary:
      "C-terminal accessory domains of PHB depolymerases mediate substrate binding to granules; often paired with catalytic domains.",
    localization: "Granule surface targeting.",
    ptms: "Limited.",
    catalyticResidues: "Typically non-catalytic binding module—do not assign triad here without structures.",
    function: "Substrate anchoring and processivity on PHA granules.",
    labNotes: "Assay full-length depolymerase vs catalytic domain alone.",
    references: pfamRefs("PF06850"),
    legendSegments: [{ label: "PHA binding", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF01522",
    pfamAccession: "PF01522",
    profileHmm: "Polysacc_deac_1",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Polysaccharide deacetylase",
    lastUpdated: "2026-05-04",
    summary:
      "Polysaccharide deacetylases remove acetyl groups from glycans; metal-dependent mechanisms differ from serine polyesterases.",
    localization: "Periplasmic or extracellular in capsule biosynthesis pathways.",
    ptms: "Follow host glycoprotein rules when fused.",
    catalyticResidues: "Metal-binding motifs—not classic triad; consult PDB.",
    function: "Deacetylation of polysaccharides; PET acetate side chains rarely analogous.",
    labNotes: "Provide divalent metals in assays if required by family.",
    references: pfamRefs("PF01522"),
    legendSegments: [{ label: "Deacetylase", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF02983",
    pfamAccession: "PF02983",
    profileHmm: "Pro_Al_protease",
    atlasComponent: null,
    cathId: "2.40.10.10",
    displayName: "Prolyl aminopeptidase / protease module",
    lastUpdated: "2026-05-04",
    summary:
      "Prolyl aminopeptidase domains cleave N-terminal prolines; fold distinct from α/β hydrolase PETases.",
    localization: "Cytosolic in many bacteria.",
    ptms: "Species-dependent.",
    catalyticResidues: "Ser/Cys nucleophile in aminopeptidase clan—verify clan assignment.",
    function: "N-terminal proline processing.",
    labNotes: "PET esterase claims need orthogonal validation.",
    references: pfamRefs("PF02983"),
    legendSegments: [{ label: "Aminopeptidase", cathId: "2.40.10.10" }],
    figures: [],
  },
  {
    id: "pf-PF21419",
    pfamAccession: "PF21419",
    profileHmm: "RoxA-like_Cyt-c",
    atlasComponent: null,
    cathId: "3.40.710.10",
    displayName: "RoxA-like cytochrome c / heme domain",
    lastUpdated: "2026-05-04",
    summary:
      "RoxA-like domains bind heme for oxidative chemistry relevant to rubber oxygenase pathways—not a classical hydrolase. PETadex inclusion may reflect multi-domain oxidoreductases.",
    localization: "Periplasmic cytochrome anchoring in bacteria.",
    ptms: "Covalent heme attachment to CXXCH motifs.",
    catalyticResidues: "Heme iron chemistry—distinct from serine triads.",
    function: "Oxidative cleavage of unsaturated polymers (rubber); PET oxidative pathways differ.",
    labNotes: "Requires redox cosubstrates and anaerobic/aerobic controls.",
    references: pfamRefs("PF21419"),
    legendSegments: [{ label: "Cytochrome c-like", cathId: "3.40.710.10" }],
    figures: [],
  },
]

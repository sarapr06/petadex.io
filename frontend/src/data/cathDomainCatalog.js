/**
 * Canonical Pfam-centered catalog for `/cath-domains` (literature review signup sheet order).
 * **23 profiles** (3HBOH … RoxA-like_Cyt-c). Narrative fields are living curation targets.
 *
 * Figures: add files under `frontend/static/cath/` and set `imageSrc: "/cath/yourfile.ext"` on
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
 * @property {string} [mechanisms]
 * @property {string} [interactingDomains]
 * @property {string} function
 * @property {string} [regulation]
 * @property {string} [variability]
 * @property {string} [structure]
 * @property {string} [labNotes]  Wet-lab / assay notes (renders as “Lab notes” when present)
 * @property {CathDomainReference[]} references
 * @property {CathDomainLegendSegment[]} [legendSegments]
 * @property {(string|CathDomainFigure)[]} [figures]  Strings treated as caption-only figures
 * @property {string[]} [pdbIds]  PDB IDs for Mol* / RCSB shortcuts (e.g. ["6TKX"])
 * @property {{ label: string, url: string }[]} [resourceLinks]  Extra curated outbound links (merged with auto PETadex/CATH/PDB links in the UI)
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
    displayName: "Beaver Dropping Feruloyl and Acetyl Xylan Esterase (BD-FAE), domain PF20434",
    lastUpdated: "2026-05-04",
    summary: "BD-FAE is a bifunctional esterase belonging to the α/β hydrolase superfamily. It is primarily observed to act on birchwood and corn fiber, and has a distinct structure from known CE1 structures despite functional similarities. The optimal pH and temperature are 6.0-7.0 and 40℃ respectively.",
    localization:
      "BD-FAE is a bacterial enzyme located in the gut environment of animals, with most homologs having a lipobox (lipid molecule covalently attached to cysteine) allowing BD-FAE to attach to the outer membrane and avoid drifting in the gut environment. BD-FAE was originally discovered within PULs (Polysaccharide Utilization Loci) of beaver and moose droppings. PULs are gene clusters primarily found in phylum Bacteroidetes of the gut to degrade complex dietary fibers, switching on and off depending on the food close to bacteroidete’s cell surfaces.",
    variability:
    "Of BD-FAE’s 200 homologs, the closest 33 involve xylan breakdown, while others are either alginate-targeting PULs or not encoded in PULs at all. All homologs are found on this link. The N-terminal tail is often removed to make the protein soluble and easier to purify, as the lipid-anchored version sticks to the cell membrane (Hameleers et al. 2021 study, E.coli lab work). Without the tail, BD-FAE is either a monomer or poorly folded, making it catalytically active but potentially less structurally stable. Commonly if not removed, the beginning of the N-terminal is a signal peptide cleaved after the protein reaches the periplasm signal peptidase.",
    ptms:
    "Post-translational modifications vary from the host cell, where scientists have chemically synthesized the DNA sequence from the unknown original bacterium to create the physical enzyme–currently in E.coli.",
    catalyticResidues:
      "BD-FAE belongs to the α/β hydrolase superfamily on a distinct branch from PETase. The family shares the same common fold, with the core typically consisting of 5-8 β-sheets connected by 6 α-helices. A catalytic triad is borne on loops on a central parallel β-sheet, with the typically arrangement being a nucleophile (on a sharp strand-to-helix turn between β5 and α3), acid (following β7), then base (following the last β-strand). Specifically for BD-FAE, the triad is Ser-Asp-His: Ser128, His269, and Asp237. BD-FAE’s single active site is a solvent-exposed shallow furrow handling both feruloyl and acetyl esterase activity (this is confirmed through research, where mutating the Serine to Alanine completely abolished both functions). An oxyanion hole (follows β3) composed of Gly53 and Ser128 NH-groups serves as a structural pocket within the active site. ",
    mechanisms:
      "Hydrolysis proceeds by serine nucleophilic attack on the ester carbonyl, tetrahedral intermediate formation, and acyl-enzyme turnover by water. This mechanism is consistent with feruloyl-ester cleavage chemistry and the triad architecture shown in Figure 1.",
    interactingDomains:
      "Commonly observed in carbohydrate-active enzyme contexts with carbohydrate-binding or polysaccharide-processing modules; domain context should be checked per protein architecture in PETadex before assigning accessory interactions.",
    function:
      "BD-FAE is a carbohydrate esterase and catalytically active enzyme capable of breaking the ester bonds from acetyl and feruloyl groups in complex biomasses like xylan (a hemicellulose polysaccharide that strengthens the cell wall through crosslinked networks). Acetyl breakdown is observed in acetylated glucuronoxylan (AcGX) from birchwood, while feruloyl breakdown is observed on acetylated and feruloylated xylooligosaccharides (AcFaXOS) in corn fiber. Acetyl and feruloyl groups exhibit steric hindrance (where their bulkiness prevents enzymes from attaching to and breaking down the cell wall in a chemical reaction). Thus, the removal of these side chains exposes the hemicellulose backbone, allowing other enzymes to effectively break down the biomass into simple sugars.",
    regulation:
    "Hybrid Two-Component Systems (HTCS) domain spans the inner membrane of the bacterium. When a fragment of feruloylated xylooligosaccharides (XOS) binds to HTCS, the transcription of BD-FAE gene cluster begins. XOS stems from basal expression, where the bacteria produces a small amount of BD-FAE and xylansases to clip small pieces off xylan fiber. Note that high levels of simple sugars trigger carbon catabolite repression, blocking the BD-FAE promoter and ignoring xylan decomposition. Additionally, there is product inhibition by ferulic acid.",
    structure:
      "The N-terminal tail of BD-FAE resembles Abhydrolase_3 (domain PF07859), while the C-terminal resembles peptidase_S9 (domain PF00326). By not showing remote homology related to the CE1 family, BD-FAE is suggested to be the founding member of a novel esterase family likely originating from domain shuffling. In crystal structure, the N-terminal(Gln2-Pro7) acts as a β-strand interacting with the β-sheets on other molecule’s surfaces, enabling oligomerization. This molecular packing yields a fourfold spiral-shaped homotetramer, with an interaction surface of 1055 Å² and with active sites pointing to the center of the spiral. This structure is predominantly observed in bacteroidetes.  See Figure 2 for the homotetramer arrangement and Figure 3 for the monomer view; use the Mol* and RCSB links above for interactive inspection.",
    labNotes:
      "Compared with acetylated substrates, BD-FAE shows higher relative activity on feruloylated substrates when removing ferulic or acetic acid from synthetic substrates; catalytic activity is comparable to type-A FAEs in Crépin's classification.\n\nResearch suggests:\n\n1. Steric hindrance: acetyl residues adjacent to feruloyl (a bulky aromatic) may be shielded from BD-FAE.\n\n2. Non-specific binding of the carbohydrate chain supports catalytic activity (lack of strict carbohydrate-chain recognition); substrate-binding discussion in Springer Biotechnol Biofuels (https://doi.org/10.1186/s13068-021-01976-0).\n\n3. Preference for xylan backbones: no BD-FAE activity was observed on AcGGM.",
    references: [
      {
        label: "Pfam / InterPro: PF20434 (BD-FAE family)",
        url: PF("PF20434"),
      },
      {
        label: "PMC: Biochemical properties of carbohydrate esterases (CEs) vs other characterized CEs",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8165983/",
      },
      {
        label: "PMC8165983 — Figure 2 (article figure panel)",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8165983/figure/Fig2/",
      },
      {
        label:
          "PMC: α/β-hydrolase nucleophile positioning and β-sheet context (serine nucleophile; loop after β8)",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/",
      },
      {
        label: "Wikipedia: Catalytic triad (Ser–His–Asp/Glu overview and substrate scope)",
        url: "https://en.wikipedia.org/wiki/Catalytic_triad",
      },
      {
        label: "PMC: Hemicellulose xylan / plant cell-wall polysaccharide context",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9898438/",
      },
      {
        label: "ScienceDirect: Trends in Biotechnology (related CE / biotechnology review)",
        url: "https://www.sciencedirect.com/science/article/abs/pii/S0966842X17301543",
      },
      {
        label: "InterPro: IPR029058 — carbohydrate esterase family 1, catalytic domain",
        url: "https://www.ebi.ac.uk/interpro/entry/InterPro/IPR029058/",
      },
      {
        label:
          "Springer (Biotechnol Biofuels): catalytic activity on acetylated vs related substrates",
        url: "https://doi.org/10.1186/s13068-021-01976-0",
      },
      {
        label:
          "RCSB PDB 6TKX — feruloyl esterase structure (use Mol* / RCSB 3D View for interactive model)",
        url: "https://www.rcsb.org/structure/6TKX",
      },
    ],
    legendSegments: [
      { label: "α/β hydrolase (representative CATH)", cathId: "3.40.50.1820" },
    ],
    pdbIds: ["6TKX"],
    resourceLinks: [
      {
        label: "InterPro: IPR029058 (CE family 1, catalytic domain)",
        url: "https://www.ebi.ac.uk/interpro/entry/InterPro/IPR029058/",
      },
      {
        label: "PMC11878206 (α/β-hydrolase nucleophile / β-sheet context)",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/",
      },
      {
        label: "Wikipedia: Catalytic triad",
        url: "https://en.wikipedia.org/wiki/Catalytic_triad",
      },
    ],
    figures: [
      {
        caption:
          "Figure 1 source: PMC11878206. Catalytic triad reference diagram showing nucleophile/base/acid combinations and example substrate classes (ester cleavage context matches feruloyl esterase chemistry).",
        imageSrc: "/cath/PF07859_triaddiagramforref.png",
        alt: "Triad residue classes and substrate schematics",
      },
      {
        caption:
          "Figure 2 source: RCSB PDB 6TKX (https://www.rcsb.org/structure/6TKX). Homotetramer view of feruloyl esterase from Bacteroides dorei; open interactive structure via the links above.",
        imageSrc: "/cath/PF07859_homeotetramer.jpg",
        alt: "Homotetramer ribbon structure PDB 6TKX",
      },
      {
        caption:
          "Figure 3 source: RCSB PDB 6TKX (https://www.rcsb.org/structure/6TKX). Monomer view (rainbow N→C); use Mol* or RCSB 3D View from the links above for rotation/zoom when aligning PETadex residues.",
        imageSrc: "/cath/PF07859_monomer.png",
        alt: "Monomer structure PDB 6TKX rainbow",
      },
    ],
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

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
 * @property {string} [moreInformation]  Optional extra context block rendered under summary
 * @property {{ imageSrc: string, caption: string, alt?: string }} [moreInformationFigure]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [postLocalizationTable]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [prePtmsTable]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [postCatalyticResiduesTable]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [postStructureTable]
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
    summary: "Curated by Claire Dumortier. BD-FAE is a bifunctional esterase belonging to the α/β hydrolase superfamily. It is primarily observed to act on birchwood and corn fiber, and has a distinct structure from known CE1 structures despite functional similarities. The optimal pH and temperature are 6.0-7.0 and 40℃ respectively.",
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
      "Compared with acetylated substrates, BD-FAE shows higher relative activity on feruloylated substrates when removing ferulic or acetic acid from synthetic substrates; catalytic activity is comparable to type-A FAEs in Crépin's classification.\n\nResearch suggests:\n\n1. Steric hindrance: acetyl residues adjacent to feruloyl (a bulky aromatic) may be shielded from BD-FAE.\n\n2. Non-specific binding of the carbohydrate chain supports catalytic activity (lack of strict carbohydrate-chain recognition); substrate-binding discussion in Springer Biotechnol Biofuels (https://link.springer.com/article/10.1186/s13068-021-01976-0).\n\n3. Preference for xylan backbones: no BD-FAE activity was observed on AcGGM.",
    references: [
      {
        label: "Pfam / InterPro: PF20434 (BD-FAE family)",
        url: PF("PF20434"),
      },
      {
        label: "PMC: Biochemical properties of carbohydrate esterases (CEs) vs other characterized CEs",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8165983/#:~:text=We%20determined%20the%20biochemical%20properties,from%20other%20biochemically%20characterized%20CEs.",
      },
      {
        label:
          "PMC: α/β-hydrolase nucleophile positioning and β-sheet context (serine nucleophile; loop after β8)",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/#:~:text=The%20nucleophile%2C%20mostly%20serine%2C%20is,variable%20loop%20after%20strand%20%CE%B28.",
      },
      {
        label: "Wikipedia: Catalytic triad (Ser–His–Asp/Glu overview and substrate scope)",
        url: "https://en.wikipedia.org/wiki/Catalytic_triad",
      },
      {
        label: "PMC: Hemicellulose xylan / plant cell-wall polysaccharide context",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9898438/#:~:text=The%20hemicellulose%20xylan%20is%20a,et%20al.%2C%202009).",
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
        url: "https://link.springer.com/article/10.1186/s13068-021-01976-0#:~:text=The%20overall%20catalytic%20activity%20of,as%20compared%20to%20acetylated%20substrates.",
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
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/#:~:text=The%20nucleophile%2C%20mostly%20serine%2C%20is,variable%20loop%20after%20strand%20%CE%B28.",
      },
      {
        label: "Wikipedia: Catalytic triad",
        url: "https://en.wikipedia.org/wiki/Catalytic_triad",
      },
    ],
    figures: [
      {
        caption:
          "Figure 1 source: PMC11878206 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/#:~:text=The%20nucleophile%2C%20mostly%20serine%2C%20is,variable%20loop%20after%20strand%20%CE%B28.) and Wikipedia catalytic triad (https://en.wikipedia.org/wiki/Catalytic_triad). Catalytic triad reference diagram showing nucleophile/base/acid combinations and example substrate classes (ester cleavage context matches feruloyl esterase chemistry).",
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
     "Curated by Alex Leonardos. Peptidase S58 proteins are N-terminal nucleophile (Ntn) hydrolases that undergo autoproteolytic processing to generate an active aminopeptidase. They are synthesized as a single-chain precursor that self-cleaves to produce α- and β-subunits, exposing a catalytic N-terminal Ser or Thr. These enzymes function primarily as aminopeptidases involved in peptide turnover and specialized substrate degradation, including β-peptides and synthetic oligomers. It is part of the α/β hydrolase family.",
    localization:
      "Has plastid localization and its isoforms are found in the endoplasmic reticulum for release from stressors. https://academic.oup.com/plphys/article/148/1/108/6107411",
    ptms:
      "Has disulphide bonds: two intramolecular disulfide bonds (Cys220-Cys264, Cys234-Cys238), one intermolecular disulfide bond (Cys270-Cys270'). It also has an N-terminal signal sequence: in the cloned Chenopodium album chlorophyllase, Tsuchiya et al. report a putative N-terminal signal sequence for the endoplasmic reticulum (consistent with extraplastidic localization) PMC24824.",
    catalyticResidues:
      "Ser145, Asp172, and His248 form the nucleophile–acid–His triad of an α/β hydrolase fold (Figure 1, panel C). The structural analysis also resolves a homodimer with His76 and Asp255 at the metal-coordinated interface (Figure 1A) and a nine-stranded β-sheet topology with catalytic and cysteine positions mapped (Figure 1B); panel C matches Fig. 2C in Jo et al. PMC10011514. Figure 2 shows an additional dimer view consistent with the 8FJD structure entry.",
    function: "Chlorophyll dephytylation; PET relevance indirect.",
    labNotes: "Assay with chlorophyll derivatives rather than PET for functional confirmation.",
    references: [
      ...pfamRefs("PF07224"),
      {
        label:
          "Schelbert S et al. Plant Physiol. 148(1):108–118 (chlorophyll breakdown / localization; source for Localization section)",
        url: "https://academic.oup.com/plphys/article/148/1/108/6107411",
      },
      {
        label:
          "Tsuchiya T et al. Cloning of chlorophyllase, the key enzyme in chlorophyll degradation: finding of a lipase motif and the induction by methyl jasmonate. Proc Natl Acad Sci U S A. 1999;96(26):15362–15367. doi:10.1073/pnas.96.26.15362",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC24824/",
      },
      {
        label:
          "Jo M et al. A structure-function analysis of chlorophyllase reveals a mechanism for activity regulation dependent on disulfide bonds. J Biol Chem. 2023;299(3):102958. doi:10.1016/j.jbc.2023.102958",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10011514/",
      },
      {
        label: "RCSB PDB 8FJD — Triticum aestivum chlorophyllase",
        url: "https://www.rcsb.org/structure/8FJD",
      },
    ],
    legendSegments: [{ label: "Chlorophyllase", cathId: "3.40.50.1820" }],
    pdbIds: ["8FJD"],
    figures: [
      {
        caption:
          "Composite from Jo et al., J Biol Chem (2023), Fig. 2 — chlorophyllase dimer/surface (A), topology with triad S145/D172/H248 and cysteines (B), active-site detail (C). Full article: https://pmc.ncbi.nlm.nih.gov/articles/PMC10011514/",
        imageSrc: "/cath/PF07224_figure_jbc2023_structure.png",
        alt: "Chlorophyllase structure: dimer, topology diagram, catalytic triad close-up",
      },
      {
        caption:
          "Figure 2 source: RCSB PDB 8FJD (https://www.rcsb.org/structure/8FJD). Additional chlorophyllase dimer rendering aligned with the structure and analysis in Jo et al. (2023) https://pmc.ncbi.nlm.nih.gov/articles/PMC10011514/",
        imageSrc: "/cath/PF07224_figure2_dimer.png",
        alt: "Chlorophyllase dimer rendering",
      },
    ],
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
    atlasComponent: 1,
    cathId: "3.40.50.1820",
    displayName: "Lipase class 2 / α/β hydrolase lipase",
    lastUpdated: "2026-05-04",
    summary:
      "Curated by Kathleen. Lipase_2 covers bacterial lipases with lid motifs controlling substrate access—relevant to interfacial activation on hydrophobic polymers.",
    localization: "Lipase_2 is commonly found in digestive enzymes and bacteria/fungi that degrade plant biomass. It is associated with lipid-water interfaces and is often found in extracellular or secreted enzymes. The enzyme stays inactive until it binds to a lipid-water interface, where it then becomes active and hydrolyzes the lipid.",
    ptms: "It contains N-Linked glycosylation for stability/secretion making it more resistant to proteases and have better folding efficiency, commonly found in eukaryotes. It has disulfide bond for structural stability, which is important for survival in environment like gut. It undergoes -	Proteolytic processing, cleaving to activate from precursor forms.",
    catalyticResidues: "Conserved triad (Ser, His, Asp/Glu) and belongs to the classic α/β hydrolase fold.",
    mechanisms: "The enzyme performs ester hydrolysis to break down lipids, where serine attacks ester bond to form intermediate where substrate is cleaved and fatty acid is released. Water is then hydrolyzed to an intermediate to regenerate the enzyme. It undergoes interfacial activation to break down the lipid-water interface to form an active enzyme.",
    interactingDomains: "Some variants have potential interactions with lipid binding domains and membrane associated regions. One such domain is colipase which is found in pancreatic lipase and helps in binding lipid droplets for better hydrolysis.",
    function: "Plays a big role in digestion, lipid remodelling and pathogenesis as bacteria uses lipases to invade tissues. It hydrolyses triglyceride into glycerol and fatty acids so stored fat is usable as energy with the following chain:	\nTriglycerides -> diacylglycerol -> monoacylglycerol -> glycerol and fatty acids",
    regulation:"Interfacial activation where lid domain only opens and activates upon contact with lipid surface. Colipase-dependent activation is required in presence of bile salts. -	Optimal pH varies by organism (ex. In humans pancreatic lipase optimal pH : ~7-8, gastric lipase : ~3-6). In animals its secretion is affected by hormones.",
    variability:"The catalytic triad and α/β hydrolase fold is relatively conserved however the surface loops and lid domains are variable to account for the different types of lipids.",
    structure:
      "α/β hydrolase fold with a helical lid element that shields the active site in the closed state and opens upon lipid binding; the open state is catalytically active. It contains a hydrophobic active-site pocket for lipid binding (Figure 1).",
    references: [
      {
        label: "RCSB PDB: 2OXE",
        url: "https://www.rcsb.org/structure/2OXE",
      },
      {
        label: "InterPro PF01674 structure (PDB table)",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF01674/structure/PDB/#table",
      },
      {
        label: "DOI: 10.1016/S1367-5931(02)00297-1",
        url: "https://doi.org/10.1016/S1367-5931(02)00297-1",
      },
      {
        label: "PubMed: 12323363",
        url: "https://pubmed.ncbi.nlm.nih.gov/12323363/",
      },
      {
        label: "Catalysts 2020, 10(7), 747 (DOI)",
        url: "https://doi.org/10.3390/catal10070747",
      },
      {
        label: "UniProt: P22394",
        url: "https://www.uniprot.org/uniprotkb/P22394/entry",
      },
    ],
    legendSegments: [{ label: "Lipase", cathId: "3.40.50.1820" }],
    pdbIds: ["2OXE"],
    figures: [
      {
        caption: "Figure 1. Representative Lipase_2 structure provided by curator.",
        imageSrc: "/cath/PF01674_lipase2_structure.png",
        alt: "Lipase_2 ribbon structure colored from N to C terminus",
      },
    ],
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
    atlasComponent: 1,
    cathId: "3.40.50.1820",
    displayName: "Platelet-activating factor acetylhydrolase IB / phospholipase A2-like",
    lastUpdated: "2026-05-04",
    summary:
    "WORK IN PROGRESS: Curated by Amy Dengler. PAF-AH_p_II refers to platelet-activating factor acetylhydrolases, which break down platelet-activating factor, a specialized phosppholipid involved in signalling (see Function below). As such, they are a type of phospholipase A2",
    localization: "Cytosolic or plasma-associated depending on isoform.",
    ptms: "Phosphorylation reported for regulatory control in mammals.",
    catalyticResidues: "Ser hydrolase center distinct from secreted PLA2 His/Asp pairs.",
    function: "Phospholipid acyl hydrolysis; PET relevance limited unless fused with polymer-binding modules.",
    labNotes: "Use phospholipid substrates when validating—not PET films alone.",
    references: [
      ...pfamRefs("PF03403"),
      {
        label: "RCSB PDB 3D59 — human plasma platelet-activating factor acetylhydrolase",
        url: "https://www.rcsb.org/structure/3D59",
      },
    ],
    legendSegments: [{ label: "PAF-AH-like", cathId: "3.40.50.1820" }],
    pdbIds: ["3D59"],
    figures: [],
  },
  {
    id: "pf-PF00082",
    pfamAccession: "PF00082",
    profileHmm: "Peptidase_S8",
    atlasComponent: 11,
    cathId: "2.40.10.10",
    displayName: "Peptidase_S8 Pfam",
    lastUpdated: "2026-05-04",
    summary:
    "Curated by Angela Jiang. Peptidase_S8 Pfam, also known as the “Subtilase family”, encompasses subtilisin-like serine proteases that have an Asp-His-Ser catalytic triad (though independently of and non-homologous to trypsin-like proteases) as well as an α/β fold containing a seven-stranded parallel β-sheet.",
    moreInformation:
      "The family can be further divided into two subfamilies, S8A which can be represented by proteinase K, and S8B which can be presented by kexin. Most well-known subtilases belong to S8A (where further classification has also been proposed), where S8B has a slightly different active site motif and exhibits higher substrate specificity.\nPeptidase_S8 is structurally similar and closely related to Peptidase_S53, another family of serine proteases represented by sedolisin found in Pseudomonas bacteria. However, many members of S53 have a Ser-Glu-Asp catalytic site instead and are often acidic. S53 proteins are classified as a different family by MEROPS; however, S53 and S8 are under the same SB clan and are often discussed together in various papers.\n\nSubtilases have a broad taxonomic range and are found across all three domains of life (Archaea, Bacteria, and Eukaryotes). S8A are found across all kingdoms, whereas S8B are primarily found in eukaryotes.",
    moreInformationFigure: {
      imageSrc: "/cath/PF00082_figure1ab_subtilisin.png",
      caption:
        "Figure 1ab. 3D structure of subtilisin BPN', or subtilisin Carlsberg from Bacillus species, often chosen as the representative of the family",
      alt: "Subtilisin BPN' and subtilisin Carlsberg 3D structures",
    },
    prePtmsTable: {
      caption: "Table 1. Common localization and functions of Peptidase_S8",
      headers: ["Origin", "Common localization", "Examples", "Notes on common biological function"],
      rows: [
        [
          "Bacteria",
          "Extracellular",
          "Subtilisin (Bacillus)",
          "Secreted enzymes for nutrient acquisition",
        ],
        [
          "Archaea",
          "Extracellular / periplasmic",
          "Aqualysin (thermophiles)",
          "Similar to bacterial secretion",
        ],
        [
          "Fungi",
          "Extracellular",
          "Plasmodium SUB1",
          "Often for nutrient acquisition",
        ],
        [
          "Plants",
          "Cell wall/apoplast (intercellular)",
          "Arabidopsis subtilases",
          "Growth and development, and immune defense",
        ],
        [
          "Animals",
          "Secretory pathway (trans-Golgi network, plasma membrane, endosomes, lysosome, extracellular, etc.)",
          "Furin",
          "Enzymes for protein processing",
        ],
      ],
    },
    localization: "In bacteria, archaea, and fungi, subtilases are often involved in nutrition and most are secreted extracellularly for catalysis via the Sec pathway. Other possible though less common localizations include cell-surface attached (e.g. lactocepin), intracellular (e.g. lantibiotic leader peptidases), and perislamic space in Gram-negative bacteria (e.g. Carboxyl-terminal processing protease A). In other eukaryotes, localization is more complicated. In plants, subtilases have functions in roles like growth & development and immune defense; they are generally secreted into the apoplast, the intercellular space consisting of cell wall, xylem cells, and space. As for animals, subtilases are usually found within the secretory pathway as endopeptidases that cleave the N-terminal proline of proteins to release the protein.",
    postLocalizationTable: {
      caption: "Representative members and subfamilies",
      headers: [
        "Subgroup",
        "Representative proteins (structures)",
        "Usual substrate preference",
        "Typical localization pattern",
        "Notable architectural / regulatory features",
      ],
      rows: [
        [
          "S8A (subtilisin-like, broad)",
          "Subtilisin BPN' (1SBT), Proteinase K (1IC6), plant SBT3 (3I6S)",
          "Often cleave after hydrophobic residues; casein is a common experimental substrate",
          "Often secreted in microbes; plant subtilases are often secretory-pathway / extracellular-facing",
          "Common pre-pro-enzyme logic with signal peptide (frequent, not universal), inhibitory/chaperoning propeptide, and catalytic domain; many members show Ca2+-dependent stabilization; some proteins carry large inserts or extra modules such as PA and FnIII-like domains",
        ],
        [
          "S8B (kexin/furin convertases)",
          "Kex2 (1OT5), Furin (1P8J, 4OMD)",
          "Cleave at basic, often dibasic, motifs rather than the broader hydrophobic preference typical of many S8A enzymes",
          "Secretory pathway, especially trans-Golgi network / endosomal membranes for furin-like enzymes",
          "Core organization is catalytic subtilisin-like domain + P domain; the P domain is a jelly-roll-like fold and, together with Ca2+ and surface loops, helps shape stringent basic-site specificity",
        ],
      ],
    },
    ptms:
      "Preproenzyme architecture and processing:\n- Many PF00082 proteins are synthesized as preproenzymes with a signal peptide (when secreted), a propeptide/prodomain, and then the catalytic subtilase domain.\n- The propeptide functions as an intramolecular chaperone and inhibitory segment before maturation.\n- See Figure 2 for the propeptide/proteinase inhibitor I9 context.\n\nZymogen activation and cleavage:\n- Activation is typically multi-step: folding assistance by the prodomain, autoprocessing at the prodomain-catalytic boundary, then prodomain release/degradation.\n- Cleavage and full activation can be separable steps in subtilase systems.\n\nGlycosylation:\n- N-glycosylation is common in eukaryotic secretory-pathway subtilases.\n- Reported roles include folding, trafficking, secretion efficiency, and zymogen maturation.\n\nDisulfide bonds:\n- Disulfides occur in a subset of PF00082 proteins, especially secretory-pathway members.\n- Number and positions are protein-specific rather than family-defining and are best verified per sequence/structure.",
    catalyticResidues:
      "Catalytic residue identities, motifs, and conservation:\n- MEROPS family-level summary for S8: catalytic triad ordered Asp -> His -> Ser (sequence order).\n- S8A motifs often include Asp-Thr/Ser-Gly, His-Gly-Thr-His, and serine-region motif Gly-Thr-Ser-Met-Ala-X-Pro.\n- S8B motifs often include Asp-Asp-Gly, His-Gly-Thr-Arg, and serine-region motif Gly-Thr-Ser-Ala/Val-Ala/Ser-Pro.\n- S8A and S8B differ in surrounding sequence context of catalytic residues; S8B members such as kexin/furin are functionally distinct and commonly cleave after dibasic sites.\n- PROSITE catalytic signatures: PS00136 (SUBTILASE_ASP), PS00137 (SUBTILASE_HIS), PS00138 (SUBTILASE_SER).\n\nCatalytic mechanism and pH behavior:\n1. Activation of Ser nucleophile: His acts as general base to deprotonate catalytic Ser hydroxyl; Asp stabilizes and aligns His (charge relay).\n2. Acylation: Ser O- attacks peptide carbonyl -> tetrahedral intermediate (oxyanion stabilized) -> collapse -> acyl-enzyme; leaving group exits.\n3. Deacylation: water activated by His attacks acyl-enzyme carbonyl -> second tetrahedral intermediate -> collapse -> product release and Ser regeneration.\n- As with other serine proteases, an oxyanion hole stabilizes tetrahedral intermediates during both acylation and deacylation.\n- Core chemistry is conserved across the family, but substrate specificity varies: many S8 enzymes prefer cleavage after hydrophobic residues, while S8B members such as kexin/furin commonly cleave after dibasic sites.\n- Most S8 members are active at neutral to mildly alkaline pH; thermophilic/alkaliphilic members are common in practical enzyme sets.\n- Two calcium-binding sites contribute to thermal stability in many S8 members.",
    postCatalyticResiduesTable: {
      caption: "Catalytic residues and consensus motifs",
      headers: [
        "Functional element",
        "PROSITE / MEROPS motif summary",
        "What it marks",
        "Example positions",
      ],
      rows: [
        [
          "Asp region (S8)",
          "PROSITE PS00136; MEROPS notes Asp-Thr/Ser-Gly in S8A and Asp-Asp-Gly in S8B",
          "Catalytic Asp of the Asp-His-Ser triad",
          "1SBT Asp32; 1OT5 Asp175",
        ],
        [
          "His region (S8)",
          "PROSITE PS00137; MEROPS notes His-Gly-Thr-His in S8A vs His-Gly-Thr-Arg in S8B",
          "Catalytic His acting as general base/acid",
          "1SBT His64; 1OT5 His213",
        ],
        [
          "Ser region (S8)",
          "PROSITE PS00138; MEROPS notes Gly-Thr-Ser-Met-Ala-X-Pro-type motifs in S8A and Gly-Thr-Ser-Ala/Val-Ala/Ser-Pro in S8B",
          "Catalytic Ser nucleophile",
          "1SBT Ser221; 1OT5 Ser385",
        ],
      ],
    },
    postStructureTable: {
      caption: "Selected PDB structures spanning PF00082",
      headers: [
        "PDB",
        "System (subgroup)",
        "Method / resolution",
        "Bound ligands / inhibitors",
        "Why it is useful",
      ],
      rows: [
        [
          "1SBT",
          "Subtilisin BPN' (S8A)",
          "X-ray, 2.50 A",
          "No major inhibitor emphasized on the structure summary",
          "Classic subtilisin-fold reference structure",
        ],
        [
          "1IC6",
          "Proteinase K (S8A)",
          "X-ray, 0.98 A",
          "Includes Ca2+ in the solved structure",
          "Atomic-resolution view of the Asp-His-Ser network and a concrete example of Ca2+-stabilized S8 architecture",
        ],
        [
          "1SCJ",
          "Subtilisin E-propeptide complex (S8A)",
          "X-ray, 2.0 A",
          "No external inhibitor; trapped autoprocessed complex",
          "Shows the 77-residue propeptide bound after cleavage, supporting its role as intramolecular chaperone/inhibitor during maturation",
        ],
        [
          "3I6S",
          "Plant SBT3 (S8A-like)",
          "X-ray, 2.50 A",
          "Glycan components present in the structure; primary paper discusses inhibitor-bound comparisons",
          "Shows a 132 aa PA-domain insertion plus a C-terminal FnIII-like domain; PA domain is linked to homodimerization and activation",
        ],
        [
          "1OT5",
          "Kex2 (S8B)",
          "X-ray, 2.4 A",
          "Ac-Ala-Lys-boroArg peptidyl boronic-acid inhibitor",
          "Clean structural example of catalytic domain + P domain; jelly-roll-like P domain plus buried Ca2+ help explain stringent basic-site specificity",
        ],
        [
          "1P8J",
          "Furin ectodomain (S8B)",
          "X-ray, 2.60 A",
          "dec-RVKR-cmk",
          "Defines the furin P domain as an eight-stranded jelly-roll and ties loop architecture to recognition of Arg/Lys-rich cleavage motifs",
        ],
        [
          "4OMD",
          "Human furin (S8B)",
          "X-ray, 2.70 A",
          "Competitive inhibitor Phac-RVR-Amba",
          "Useful disease-relevance / inhibitor-design furin structure",
        ],
      ],
    },
    function: "Peptide bond hydrolysis; polyester activity uncommon—validate separately.",
    labNotes: "Use protease inhibitors and correct buffers when co-assaying with esterases.",
    references: [
      {
        label: "PF00082 / S8 family: MEROPS family S8",
        url: "https://www.ebi.ac.uk/merops/cgi-bin/famsum?family=S8",
      },
      {
        label: "PF00082 / S8 family: InterPro PF00082",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF00082",
      },
      {
        label: "PF00082 / S8 family: InterPro IPR010259",
        url: "https://www.ebi.ac.uk/interpro/entry/InterPro/IPR010259/",
      },
      {
        label: "PF00082 / S8 family: NCBI SPARCLE architecture viewer",
        url: "https://www.ncbi.nlm.nih.gov/Structure/sparcle/archview.html?archid=12477846",
      },
      {
        label: "PF00082 / S8 family: MEROPS family S53 (related SB clan family)",
        url: "https://www.ebi.ac.uk/merops/cgi-bin/famsum?family=S53",
      },
      {
        label: "Motif references: PROSITE PS00136 (SUBTILASE_ASP)",
        url: "https://prosite.expasy.org/PS00136",
      },
      {
        label: "Motif references: PROSITE PS00137 (SUBTILASE_HIS)",
        url: "https://prosite.expasy.org/PS00137",
      },
      {
        label: "Motif references: PROSITE PS00138 (SUBTILASE_SER)",
        url: "https://prosite.expasy.org/PS00138",
      },
      {
        label: "Motif references: PROSITE PDOC00125",
        url: "https://prosite.expasy.org/PDOC00125",
      },
      {
        label: "Review/paper: PMC9549277",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9549277/",
      },
      {
        label: "Review/paper: PMC11593635",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11593635/",
      },
      {
        label: "Review/paper: PMC2675663",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2675663/",
      },
      {
        label: "Review/paper: PubMed 21527438",
        url: "https://pubmed.ncbi.nlm.nih.gov/21527438/",
      },
      {
        label: "Review/paper: Furin disulfide-bond folding analysis (ResearchGate)",
        url: "https://www.researchgate.net/publication/352650591_Disulfide_Bonds_In_the_Catalytic_Domain_Of_Furin_Are_Necessary_for_Compartment-Specific_Folding_Events",
      },
      {
        label: "Review/paper: Journal of Lipid Research article PDF",
        url: "https://www.jlr.org/article/S0022-2275%2820%2930607-6/pdf?utm_source=chatgpt.com",
      },
      {
        label: "Classic review: Siezen RJ. Subtilases: superfamily of subtilisin-like serine proteases. Protein Sci. 1996.",
        url: "https://doi.org/10.1002/pro.5560050303",
      },
      {
        label: "Specific proteins: structures can be explored by IDs in RCSB PDB",
        url: "https://www.rcsb.org/",
      },
    ],
    legendSegments: [{ label: "Subtilisin fold", cathId: "2.40.10.10" }],
    pdbIds: ["1SBT"],
    figures: [
      {
        caption:
          "Figure 1ab. 3D structure of subtilisin BPN', or subtilisin Carlsberg from Bacillus species, often chosen as the representative of the family",
        imageSrc: "/cath/PF00082_figure1ab_subtilisin.png",
        alt: "Subtilisin BPN' and subtilisin Carlsberg 3D structures",
      },
      {
        caption: "Figure 2. The propeptide/proteinase inhibitor I9",
        imageSrc: "/cath/PF00082_figure2_i9.png",
        alt: "Propeptide or proteinase inhibitor I9 view",
      },
    ],
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

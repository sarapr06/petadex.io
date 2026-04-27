/* PETadex Home — Prototype A — Tools-led
   Hero (AtlasMap + value prop + CTAs) → "Start here" four tool cards
   → stats strip → What's in PETadex → Citation block.
*/

const { useState: useStateA, useEffect: useEffectA } = React;

// ---------- Site header ------------------------------------------------------
function SiteHeader({ active = "atlas" }) {
  const NAV = [
    { id: "sequence", label: "Sequence" },
    { id: "enzymes",  label: "Enzymes" },
    { id: "search",   label: "Search" },
    { id: "substrate",label: "Substrate" },
    { id: "metadata", label: "Metadata" },
    { id: "atlas",    label: "Atlas" },
  ];
  return (
    <header className="sticky top-0 z-30 h-16 bg-[color:var(--background)]/85 backdrop-blur-md border-b border-default">
      <div className="h-full max-w-[1400px] mx-auto px-5 flex items-center justify-between">
        <a href="#" className="shrink-0 flex items-center gap-2 text-fg" aria-label="PETadex">
          <span className="text-[22px] font-semibold tracking-tight" style={{letterSpacing: "-0.01em"}}>
            <span className="text-fg">PET</span><span className="text-[color:var(--accent)]">a</span><span className="text-fg">dex</span>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-x-6" aria-label="Main navigation">
          {NAV.map(item => (
            <a key={item.id} href="#"
               className={`relative text-sm transition-colors ${active === item.id ? "text-fg" : "text-muted hover:text-fg"}`}>
              {item.label}
              {active === item.id && <span className="nav-active" />}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-x-2">
          <button className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-raised transition-colors" aria-label="Toggle theme">
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </button>
          <a href="#" className="hidden sm:inline-flex h-9 items-center px-3 rounded-lg text-xs font-mono text-muted hover:text-fg hover:bg-raised transition-colors border border-default">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            github
          </a>
        </div>
      </div>
    </header>
  );
}

// ---------- Hero -------------------------------------------------------------
function Hero() {
  return (
    <section className="relative" data-screen-label="01a Hero">
      {/* AtlasMap fills the hero — fixed height for predictable framing */}
      <div className="relative h-[640px] w-full bg-[#0e0e0e] border-b border-default">
        <AtlasMap
          showSidebar={false}
          showTopBar={false}
          showSearch={false}
          showLegend={false}
          interactive={true}
        />
        {/* Vignette to keep left side legible */}
        <div className="pointer-events-none absolute inset-0 hero-vignette" />

        {/* Overlay: value prop + CTAs (left) */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="max-w-[1400px] w-full mx-auto px-5">
            <div className="max-w-[560px] pointer-events-auto fadein">
              <div className="label mb-4">Open · Free · Community-driven</div>
              <h1 className="text-fg font-semibold tracking-tight leading-[1.05]"
                  style={{fontSize: "clamp(2.4rem, 4.4vw, 3.6rem)"}}>
                Every plastic-degrading enzyme,<br/>
                <span className="text-[color:var(--accent)]">in one atlas.</span>
              </h1>
              <p className="mt-5 text-base text-muted max-w-[480px] leading-relaxed">
                64,730 enzyme families. 350+ characterized PETases. One interface to
                <span className="text-fg"> search</span>, <span className="text-fg">align</span>,
                <span className="text-fg"> compare substrates</span>, and
                <span className="text-fg"> trace evolution</span>.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href="#start" className="btn btn-primary">
                  Start exploring
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h10.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </a>
                <a href="#cite" className="btn btn-ghost font-mono text-xs">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  How to cite
                </a>
                <span className="text-[11px] font-mono text-muted hidden sm:inline-flex items-center gap-2">
                  <span className="legend-dot pulse-dot" style={{background: "#22c55e"}} />
                  v0.4 · April 2026
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating: top-right legend chip + atlas affordance */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
          <div className="legend-chip pointer-events-auto">
            <span className="legend-dot" style={{background: "#4F8FE8"}} />
            Family Atlas <span className="text-fg ml-1">live</span>
          </div>
          <div className="legend-chip pointer-events-auto">
            scroll · drag · click
          </div>
        </div>

        {/* Floating: bottom legend strip */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden md:flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 rounded-lg bg-[color:rgba(0,0,0,0.55)] border border-default backdrop-blur-md pointer-events-auto">
          {[
            { c: "#4F8FE8", l: "α/β hydrolase" },
            { c: "#2ECC71", l: "DD-peptidase" },
            { c: "#E74C4C", l: "Amidase" },
            { c: "#9B5BE0", l: "Trypsin-like" },
            { c: "#F2C94C", l: "Arylesterase" },
            { c: "#F2994A", l: "Cupredoxin" },
            { c: "#6FB7E8", l: "L-aa peptidase" },
          ].map(x => (
            <span key={x.l} className="legend-chip border-0 bg-transparent">
              <span className="legend-dot" style={{background: x.c}} /> {x.l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- "Start here" tool cards -----------------------------------------
function ToolCards() {
  const cards = [
    {
      id: "atlas",
      eyebrow: "01 · Atlas",
      title: "Browse the family atlas",
      sub: "Explore 64,730 families in 2D UMAP space. Color by domain, phylum, or CATH component.",
      kbd: "A",
      cta: "Open Atlas →",
      Thumb: window.AtlasThumb,
    },
    {
      id: "search",
      eyebrow: "02 · Search",
      title: "Find homologs by sequence",
      sub: "Paste a FASTA sequence; MMseqs2 returns nearest neighbors with alignments and activity context.",
      kbd: "S",
      cta: "Run a search →",
      Thumb: window.SequenceThumb,
    },
    {
      id: "substrate",
      eyebrow: "03 · Substrate",
      title: "Compare BHET activity",
      sub: "Side-by-side scatter of measured activity at 12.5 / 25 / 50 mM BHET. Click any gene to drill in.",
      kbd: "B",
      cta: "Compare substrates →",
      Thumb: window.SubstrateThumb,
    },
    {
      id: "family",
      eyebrow: "04 · Family",
      title: "Trace a family tree",
      sub: "Newick-rendered phylogenies for every family, with member tables and centroid sequences.",
      kbd: "F",
      cta: "Open a family →",
      Thumb: window.FamilyThumb,
    },
  ];

  return (
    <section id="start" className="relative py-20 border-b border-default" data-screen-label="01b Tool cards">
      <div className="max-w-[1400px] mx-auto px-5">
        <div className="flex items-end justify-between flex-wrap gap-y-4 mb-10">
          <div>
            <div className="label mb-2">Start here</div>
            <h2 className="text-fg text-3xl font-semibold tracking-tight">Four ways into the data</h2>
          </div>
          <p className="text-muted text-sm max-w-md">
            PETadex is a launchpad, not a paper. Pick the tool that matches your question — the rest of the data is one click away.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ id, eyebrow, title, sub, kbd, cta, Thumb }) => (
            <a key={id} href="#"
               className="card card-hover flex flex-col group relative">
              <div className="mini-thumb">
                {Thumb && <Thumb />}
                <div className="absolute top-2 left-2 legend-chip">
                  {eyebrow}
                </div>
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted border border-default bg-[rgba(0,0,0,0.5)]">
                  ⌘ {kbd}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-fg text-base font-semibold leading-snug">{title}</h3>
                <p className="text-muted text-[13px] mt-1.5 leading-relaxed flex-1">{sub}</p>
                <div className="mt-3 text-[13px] font-medium text-[color:var(--accent)] group-hover:translate-x-0.5 transition-transform">
                  {cta}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Stats strip ------------------------------------------------------
function StatsStrip() {
  const stats = [
    { v: "64,730",  k: "Enzyme families",   sub: "UMAP-embedded centroids" },
    { v: "350+",    k: "Characterized PETases", sub: "with experimental activity" },
    { v: "12,884",  k: "Sequences in fastaa",   sub: "amino-acid + provenance" },
    { v: "3",       k: "BHET substrates",       sub: "12.5 / 25 / 50 mM assays" },
    { v: "189",     k: "Sample countries",      sub: "geo metadata + dates" },
  ];
  return (
    <section className="bg-raised border-b border-default" data-screen-label="01c Stats">
      <div className="max-w-[1400px] mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-5 divide-x divide-[color:var(--border)]">
        {stats.map((s, i) => (
          <div key={i} className={`px-5 ${i === 0 ? "pl-0" : ""} ${i === stats.length - 1 ? "pr-0" : ""}`}>
            <div className="text-fg text-[28px] font-semibold tracking-tight tabular-nums">{s.v}</div>
            <div className="text-fg text-[13px] mt-1">{s.k}</div>
            <div className="text-muted text-[11px] font-mono mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- What's in PETadex -----------------------------------------------
function WhatsInside() {
  const rows = [
    { t: "Sequences",     d: "Curated amino-acid sequences from NCBI BLAST-NR + literature",     k: "fastaa · enzyme_fastaa · enzyme_taxonomy" },
    { t: "Structures",    d: "Predicted & experimental structures via Molstar + 3DMol viewers",  k: "PDB · Molstar · 3DMol.js" },
    { t: "Activity",      d: "Plate-reader BHET hydrolysis at three substrate concentrations",   k: "plate_data · plate_metadata · plate_activity_view" },
    { t: "Provenance",    d: "Geographic origin, BioSample / SRA links, sampling dates",         k: "with_sra_and_biosample_loc_metadata" },
    { t: "Embeddings",    d: "UMAP coordinates + CATH-domain colorings for every family",        k: "family_atlas (materialized view)" },
    { t: "Phylogenies",   d: "Pre-computed Newick trees per family from S3-backed alignments",   k: "family/:id/tree" },
  ];
  return (
    <section className="py-20 border-b border-default" data-screen-label="01d What's inside">
      <div className="max-w-[1400px] mx-auto px-5">
        <div className="flex items-end justify-between flex-wrap gap-y-4 mb-10">
          <div>
            <div className="label mb-2">What's in PETadex</div>
            <h2 className="text-fg text-3xl font-semibold tracking-tight">Six layers of data, one schema</h2>
          </div>
          <a href="#" className="text-[13px] text-[color:var(--accent)] hover:opacity-80 font-mono">
            View the full schema →
          </a>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-[11px] uppercase tracking-widest font-semibold">
                <th className="px-5 py-3 w-[15%]">Layer</th>
                <th className="px-5 py-3 w-[55%]">What's there</th>
                <th className="px-5 py-3 w-[30%]">Tables / endpoints</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-[color:var(--surface-raised)] transition-colors">
                  <td className="px-5 py-4 text-fg font-medium">{r.t}</td>
                  <td className="px-5 py-4 text-muted">{r.d}</td>
                  <td className="px-5 py-4 text-[12px] font-mono text-[color:var(--accent)]/85">{r.k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ---------- Citation block ---------------------------------------------------
function Citation() {
  const bibtex = `@misc{petadex2026,
  title  = {PETadex: an open atlas of plastic-degrading enzymes},
  author = {The PETadex contributors},
  year   = {2026},
  url    = {https://petadex.net},
  note   = {v0.4 (Apr 2026)}
}`;
  const [copied, setCopied] = useStateA(false);
  const onCopy = () => {
    navigator.clipboard?.writeText(bibtex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <section id="cite" className="py-20 bg-sunken border-b border-default" data-screen-label="01e Citation">
      <div className="max-w-[1400px] mx-auto px-5 grid lg:grid-cols-[1fr_1.4fr] gap-10 items-start">
        <div>
          <div className="label mb-2">Cite</div>
          <h2 className="text-fg text-3xl font-semibold tracking-tight">Use it, share it, cite it.</h2>
          <p className="text-muted text-sm mt-4 leading-relaxed max-w-md">
            PETadex is open-source under the MIT license. If a paper or pre-print uses our data,
            tools, or atlases, please cite the entry below.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a href="#" className="btn btn-ghost"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>License (MIT)</a>
            <a href="#" className="btn btn-ghost"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>Source on GitHub</a>
          </div>
        </div>
        <div className="card relative">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-default text-[11px] font-mono text-muted">
            <span>citation.bib</span>
            <button onClick={onCopy} className="hover:text-fg transition-colors flex items-center gap-1.5">
              {copied
                ? <><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>copied</>
                : <><svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="11" height="11" rx="1.5"/><path d="M14 6V4.5A1.5 1.5 0 0 0 12.5 3h-7A1.5 1.5 0 0 0 4 4.5v8A1.5 1.5 0 0 0 5.5 14H7"/></svg>copy</>
              }
            </button>
          </div>
          <pre className="cite-block px-4 py-4 m-0 overflow-x-auto whitespace-pre">
{`@misc{petadex2026,
  `}<span className="text-fg">title</span>{`  = {PETadex: an open atlas of plastic-degrading enzymes},
  `}<span className="text-fg">author</span>{` = {The PETadex contributors},
  `}<span className="text-fg">year</span>{`   = {2026},
  `}<span className="text-fg">url</span>{`    = {https://petadex.net},
  `}<span className="text-fg">note</span>{`   = {v0.4 (Apr 2026)}
}`}
          </pre>
        </div>
      </div>
    </section>
  );
}

// ---------- Footer -----------------------------------------------------------
function SiteFooter() {
  return (
    <footer className="py-8">
      <div className="max-w-[1400px] mx-auto px-5 flex flex-wrap items-center justify-between gap-4 text-[12px]">
        <p className="text-muted">© 2026 PETadex — an open community resource</p>
        <nav className="flex flex-wrap items-center gap-5">
          <a href="#" className="text-muted hover:text-fg transition-colors">Database</a>
          <a href="#" className="text-muted hover:text-fg transition-colors">GitHub</a>
          <a href="#" className="text-muted hover:text-fg transition-colors">Contribute</a>
          <a href="#" className="text-muted hover:text-fg transition-colors">Status</a>
        </nav>
      </div>
    </footer>
  );
}

// ---------- App --------------------------------------------------------------
function App() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-fg">
      <SiteHeader />
      <Hero />
      <ToolCards />
      <StatsStrip />
      <WhatsInside />
      <Citation />
      <SiteFooter />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

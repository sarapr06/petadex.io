/* Mini thumbnails for tool cards.
   Each is a small live SVG/canvas/component that hints at the tool.
   - AtlasThumb:    miniature UMAP scatter (clusters from AtlasMap, no interaction)
   - SequenceThumb: animated FASTA-style sequence with input box framing
   - SubstrateThumb: scatter of dots split across the diagonal (BHET25 vs BHET50)
   - FamilyThumb:   simple radial dendrogram preview
*/

const { useEffect: useEffectT, useRef: useRefT, useState: useStateT, useMemo: useMemoT } = React;

// --------- Atlas mini-thumb (uses CLUSTERS from atlas-map.jsx) --------
function AtlasThumb() {
  const ref = useRefT(null);
  useEffectT(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0e0e0e"; ctx.fillRect(0, 0, w, h);

    // tiny gaussian per cluster
    const rand = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); }; })();
    const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

    const clusters = window.ATLAS_CLUSTERS || [];
    ctx.globalCompositeOperation = "lighter";
    for (const c of clusters) {
      const n = Math.max(8, Math.round(c.n * 0.18));
      for (let i = 0; i < n; i++) {
        const x = c.cx + gauss() * c.sx;
        const y = c.cy + gauss() * c.sy;
        const px = w/2 + x * Math.min(w,h) * 1.0;
        const py = h/2 + (y - 0.18) * Math.min(w,h) * 1.0;
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);
  return <canvas ref={ref} className="block w-full h-full" />;
}

// --------- Sequence search mini-thumb -------------------------------
function SequenceThumb() {
  const seq = "MNFPRASRLMQAAVLGGLMAVSAAATAQTNPYARGPNPTAASLEASAGPFTVRSFTVSRPSGYGAGTVYYPTNAGGTVGAIAIVPGYTARQSSIKWWGPRLASHGFVVITIDTNS";
  const [typed, setTyped] = useStateT("");
  useEffectT(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % (seq.length + 8);
      setTyped(seq.slice(0, i));
    }, 40);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="absolute inset-0 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
        <span className="legend-dot" style={{ background: "var(--accent)" }} />
        FASTA · Protein
      </div>
      <div className="flex-1 rounded-md border border-default bg-[color:var(--surface-sunken)] p-2 font-mono text-[10px] leading-[1.6] text-fg overflow-hidden">
        <div className="text-muted">&gt;query|IsPETase</div>
        <div className="break-all">
          {typed}
          <span className="inline-block w-[6px] h-[10px] -mb-[1px] ml-[1px] bg-[color:var(--accent)] align-middle pulse-dot" />
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-muted">
        <span>{typed.length} / 10,000 aa</span>
        <span className="px-1.5 py-0.5 rounded bg-[color:var(--accent-subtle)] text-[color:var(--accent)] border border-[color:var(--accent)]/30">
          MMseqs2
        </span>
      </div>
    </div>
  );
}

// --------- Substrate scatter mini-thumb -----------------------------
function SubstrateThumb() {
  const dots = useMemoT(() => {
    const arr = [];
    let s = 1234;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 70; i++) {
      const x = rnd();
      // bias along diagonal w/ noise
      const y = Math.max(0, Math.min(1, x + (rnd() - 0.5) * 0.5));
      arr.push({ x, y, r: 1.5 + rnd() * 2.5 });
    }
    return arr;
  }, []);
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <rect width="160" height="100" fill="#0e0e0e" />
      {/* axes */}
      <line x1="14" y1="86" x2="150" y2="86" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="14" y1="86" x2="14" y2="10"  stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      {/* diagonal reference */}
      <line x1="14" y1="86" x2="150" y2="10" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="2 2" />
      {/* dots — colored by which side of diagonal */}
      {dots.map((d, i) => {
        const px = 14 + d.x * 136;
        const py = 86 - d.y * 76;
        const above = d.y > d.x;
        const fill = above ? "#A23B72" : "#2E86AB";
        return <circle key={i} cx={px} cy={py} r={d.r} fill={fill} fillOpacity="0.75" />;
      })}
      {/* axis labels */}
      <text x="78" y="97"  fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="ui-monospace, monospace" textAnchor="middle">BHET25 →</text>
      <text x="6"  y="48"  fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="ui-monospace, monospace" textAnchor="middle" transform="rotate(-90 6 48)">↑ BHET50</text>
    </svg>
  );
}

// --------- Family / dendrogram mini-thumb ---------------------------
function FamilyThumb() {
  // a simple radial tree built procedurally
  const lines = useMemoT(() => {
    const out = [];
    const cx = 80, cy = 50;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r1 = 14 + (i % 3) * 4;
      const r2 = 38 + (i % 4) * 3;
      out.push({
        x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
        x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2,
        a, r2,
      });
      // subdivisions
      for (let j = -1; j <= 1; j += 2) {
        const a2 = a + j * 0.10;
        const r3 = r2 + 6 + (i % 3) * 2;
        out.push({
          x1: cx + Math.cos(a) * r2, y1: cy + Math.sin(a) * r2,
          x2: cx + Math.cos(a2) * r3, y2: cy + Math.sin(a2) * r3,
          a: a2, r2: r3,
          tip: true,
        });
      }
    }
    return out;
  }, []);
  return (
    <svg viewBox="0 0 160 100" className="absolute inset-0 w-full h-full">
      <rect width="160" height="100" fill="#0e0e0e" />
      <circle cx="80" cy="50" r="3" fill="var(--accent)" />
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.tip ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.30)"}
              strokeWidth={l.tip ? 0.6 : 0.8} />
      ))}
      {lines.filter(l => l.tip).map((l, i) => (
        <circle key={i} cx={l.x2} cy={l.y2} r="1.2"
                fill={i % 4 === 0 ? "var(--accent)" : "#4F8FE8"} fillOpacity="0.9" />
      ))}
    </svg>
  );
}

window.AtlasThumb = AtlasThumb;
window.SequenceThumb = SequenceThumb;
window.SubstrateThumb = SubstrateThumb;
window.FamilyThumb = FamilyThumb;

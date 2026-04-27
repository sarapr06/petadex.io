/* AtlasMap — canvas-based UMAP cluster visualization
   Generates ~2000 fake points arranged in clusters that visually echo
   the real PETadex Family Atlas screenshot (alpha/beta hydrolase = big blue
   cluster, amidase = green, trypsin-like = red, etc).

   Interactive: pan (drag), zoom (wheel), hover for tooltip, click to focus.
   Color modes: component | domain | phylum | none.
*/

const { useEffect, useRef, useState, useMemo, useCallback } = React;

// ---------- Cluster definitions ----------------------------------------------
// Each cluster has a center, spread, count, and a base color.
// Roughly mirrors the screenshot: a giant central blue blob, a green & red
// upper pair, plus several smaller satellites.
const CLUSTERS = [
  { id: "ab-hydrolase",  label: "Alpha/Beta Hydrolase",     cath: "3.40.50.1820", color: "#4F8FE8", cx:  0.30, cy:  0.05, sx: 0.18, sy: 0.16, n: 720 },
  { id: "ab-hydrolase-2",label: "Alpha/Beta Hydrolase",     cath: "3.40.50.1820", color: "#4F8FE8", cx: -0.18, cy: -0.02, sx: 0.07, sy: 0.07, n: 110 },
  { id: "dd-pep",        label: "DD-peptidase/beta-lact.",   cath: "3.40.710.10",  color: "#2ECC71", cx: -0.30, cy:  0.50, sx: 0.08, sy: 0.07, n: 240 },
  { id: "amidase",       label: "Amidase signature",         cath: "3.90.1300.10", color: "#E74C4C", cx:  0.34, cy:  0.55, sx: 0.07, sy: 0.07, n: 220 },
  { id: "trypsin",       label: "Trypsin-like",              cath: "2.40.10.10",   color: "#9B5BE0", cx: -0.42, cy: -0.05, sx: 0.05, sy: 0.06, n: 95  },
  { id: "arylesterase",  label: "Arylesterase (TBDX)",       cath: "—",            color: "#F2C94C", cx:  0.04, cy:  0.42, sx: 0.05, sy: 0.04, n: 70  },
  { id: "arylesterase-2",label: "Arylesterase (TBDX)",       cath: "—",            color: "#F2C94C", cx: -0.05, cy: -0.30, sx: 0.04, sy: 0.04, n: 60  },
  { id: "cupredoxin",    label: "Cupredoxins — blue copper", cath: "2.60.40.420",  color: "#F2994A", cx:  0.02, cy:  0.05, sx: 0.025, sy: 0.025, n: 40  },
  { id: "lamino",        label: "L-amino peptidase D-ALA",   cath: "3.60.70.12",   color: "#6FB7E8", cx:  0.42, cy:  0.42, sx: 0.05, sy: 0.04, n: 80  },
  { id: "urease",        label: "Urease-like (TB02)",        cath: "—",            color: "#EC4899", cx: -0.10, cy:  0.35, sx: 0.02, sy: 0.02, n: 18  },
  { id: "stray-1",       label: "Other",                     cath: "—",            color: "#14B8A6", cx:  0.40, cy: -0.30, sx: 0.02, sy: 0.02, n: 12  },
  { id: "stray-2",       label: "Other",                     cath: "—",            color: "#9B5BE0", cx:  0.45, cy:  0.05, sx: 0.015, sy: 0.015, n: 8  },
];

// Domain mapping (Bacteria/Archaea/Eukaryota/Viruses) — from CLAUDE.md spec
const DOMAINS = [
  { id: "Bacteria",   color: "#4ECDC4", weight: 0.78 },
  { id: "Archaea",    color: "#FF6B6B", weight: 0.06 },
  { id: "Eukaryota",  color: "#FFD93D", weight: 0.13 },
  { id: "Viruses",    color: "#B482FF", weight: 0.02 },
  { id: "Unknown",    color: "#94a3b8", weight: 0.01 },
];

const PHYLA = [
  { id: "Pseudomonadota",   color: "#3b82f6" },
  { id: "Bacillota",        color: "#10b981" },
  { id: "Actinomycetota",   color: "#f59e0b" },
  { id: "Bacteroidota",     color: "#8b5cf6" },
  { id: "Cyanobacteriota",  color: "#06b6d4" },
  { id: "Acidobacteriota",  color: "#ec4899" },
  { id: "Chloroflexota",    color: "#84cc16" },
  { id: "Verrucomicrobiota",color: "#f43f5e" },
  { id: "Other",            color: "#64748b" },
];

// Box-Muller for gaussian point distributions
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Seeded RNG so the cluster shapes are stable across renders
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
function seededGaussian(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generatePoints() {
  const rand = mulberry32(42);
  const points = [];
  for (const c of CLUSTERS) {
    for (let i = 0; i < c.n; i++) {
      // Slightly elongated blobs for the big hydrolase cluster — picked an angle.
      const angle = c.id === "ab-hydrolase" ? Math.PI * 0.08 : 0;
      const gx = seededGaussian(rand) * c.sx;
      const gy = seededGaussian(rand) * c.sy;
      const x = c.cx + gx * Math.cos(angle) - gy * Math.sin(angle);
      const y = c.cy + gx * Math.sin(angle) + gy * Math.cos(angle);

      // Assign a domain & phylum (weighted random)
      const r = rand();
      let acc = 0, domain = DOMAINS[0].id;
      for (const d of DOMAINS) { acc += d.weight; if (r < acc) { domain = d.id; break; } }
      const phylum = PHYLA[Math.floor(rand() * PHYLA.length)].id;

      // Family size — power-law-ish, used for point radius
      const size = 1 + Math.floor(Math.pow(rand(), 3) * 24);

      points.push({
        id: `${c.id}-${i}`,
        cluster: c.id,
        clusterLabel: c.label,
        cath: c.cath,
        component: c.id,
        baseColor: c.color,
        x, y,
        domain,
        phylum,
        size,
      });
    }
  }
  return points;
}

// 20-color stable hash for phylum
function phylumColor(p) {
  const found = PHYLA.find(x => x.id === p);
  return found ? found.color : "#64748b";
}
function domainColor(d) {
  const found = DOMAINS.find(x => x.id === d);
  return found ? found.color : "#94a3b8";
}

// Main viz component
function AtlasMap({
  showLegend = true,
  showSidebar = true,
  showTopBar = true,
  showSearch = true,
  defaultColorBy = "component",
  initialZoom = 1,
  initialCenter = { x: 0, y: 0.18 },  // bias slightly down so the big blob centers
  interactive = true,
  className = "",
  pointBoost = 1,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 1000, h: 600, dpr: 1 });
  const [colorBy, setColorBy] = useState(defaultColorBy);
  const [hover, setHover] = useState(null);          // { px, py, point }
  const points = useMemo(() => generatePoints(), []);

  // Camera state — zoom + center (in normalized data space)
  const [cam, setCam] = useState({ zoom: initialZoom, cx: initialCenter.x, cy: initialCenter.y });
  const dragRef = useRef(null);

  // Resize
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setSize({ w: Math.max(200, Math.floor(width)), h: Math.max(200, Math.floor(height)), dpr });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Project data → canvas pixel coords
  const project = useCallback((x, y) => {
    const { w, h } = size;
    const scale = Math.min(w, h) * 0.9 * cam.zoom;
    return [
      w / 2 + (x - cam.cx) * scale,
      h / 2 + (y - cam.cy) * scale,
    ];
  }, [size, cam]);

  const colorFor = useCallback((p) => {
    if (colorBy === "none")     return "#64748b";
    if (colorBy === "domain")   return domainColor(p.domain);
    if (colorBy === "phylum")   return phylumColor(p.phylum);
    return p.baseColor; // component
  }, [colorBy]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h, dpr } = size;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background — dark card
    ctx.fillStyle = "#0e0e0e";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid (very faint)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let gx = 0; gx < w; gx += gridStep) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (let gy = 0; gy < h; gy += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    // Points — use globalAlpha for soft overlap, additive-ish look
    ctx.globalCompositeOperation = "lighter";
    for (const p of points) {
      const [px, py] = project(p.x, p.y);
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;
      const r = (1.4 + Math.log2(p.size + 1) * 0.45) * pointBoost * Math.min(2, cam.zoom);
      ctx.fillStyle = colorFor(p);
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // Hover highlight — bright ring
    if (hover) {
      const [px, py] = project(hover.point.x, hover.point.y);
      const r = (1.4 + Math.log2(hover.point.size + 1) * 0.45) * pointBoost * Math.min(2, cam.zoom);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [size, points, project, colorFor, cam, hover, pointBoost]);

  // ---- Interaction ----------------------------------------------------------
  const onPointerDown = (e) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy };
  };
  const onPointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    if (dragRef.current) {
      const { w, h } = size;
      const scale = Math.min(w, h) * 0.9 * cam.zoom;
      const dx = (e.clientX - dragRef.current.x) / scale;
      const dy = (e.clientY - dragRef.current.y) / scale;
      setCam(c => ({ ...c, cx: dragRef.current.cx - dx, cy: dragRef.current.cy - dy }));
      return;
    }

    // Hover hit-test (cheap: scan top N nearest-ish points)
    let best = null, bestD = 64; // pixel² threshold
    for (const p of points) {
      const [px, py] = project(p.x, p.y);
      const dx = px - localX, dy = py - localY;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) setHover({ px: localX, py: localY, point: best });
    else if (hover) setHover(null);
  };
  const onPointerUp = (e) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  };
  const onWheel = (e) => {
    if (!interactive) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    setCam(c => ({ ...c, zoom: Math.min(8, Math.max(0.5, c.zoom * factor)) }));
  };

  // Keep wheel passive=false
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => onWheel(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  });

  // Build sidebar tree
  const clusterGroups = useMemo(() => {
    const seen = new Map();
    for (const c of CLUSTERS) {
      const k = c.label + "|" + c.cath;
      if (!seen.has(k)) seen.set(k, { label: c.label, cath: c.cath, color: c.color, components: [], total: 0 });
      const g = seen.get(k);
      g.components.push({ id: c.id, n: c.n });
      g.total += c.n;
    }
    return Array.from(seen.values());
  }, []);

  // Reset camera when colorBy changes (no — keep it; just re-render)
  // total point count
  const total = points.length;

  return (
    <div className={`relative flex w-full h-full bg-[#0e0e0e] overflow-hidden ${className}`}>
      {/* Sidebar — family list */}
      {showSidebar && (
        <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-default text-[11px] font-mono overflow-y-auto bg-[#0e0e0e]">
          {clusterGroups.map((g, gi) => (
            <div key={gi} className="px-3 py-2 border-b border-default/60">
              <div className="flex items-start justify-between gap-2 leading-tight">
                <div className="flex items-start gap-2">
                  <span className="legend-dot mt-1" style={{ background: g.color }} />
                  <span className="text-fg font-semibold">{g.label}<br/><span className="text-muted">({g.cath})</span></span>
                </div>
                <span className="text-muted tabular-nums">{g.total.toLocaleString()}</span>
              </div>
              <ul className="mt-1.5 pl-3.5 space-y-0.5">
                {g.components.slice(0, 8).map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="legend-dot" style={{ background: g.color, opacity: 0.7 - i * 0.08 }} />
                      Component&nbsp;{i + 1}
                    </span>
                    <span className="tabular-nums">{c.n.toLocaleString()}</span>
                  </li>
                ))}
                {g.components.length > 8 && (
                  <li className="text-muted/60">+{g.components.length - 8} more</li>
                )}
              </ul>
            </div>
          ))}
        </aside>
      )}

      {/* Main canvas area */}
      <div className="relative flex-1" ref={wrapRef}>
        {/* Top bar */}
        {showTopBar && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-3 pointer-events-none">
            <div className="pointer-events-auto">
              <div className="text-fg font-semibold text-sm leading-tight">Family Atlas</div>
              <div className="text-muted text-[11px] mt-0.5 font-mono">
                UMAP embedding of plastic-degrading enzyme families ({total.toLocaleString()} centroids)
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="label">Color by</span>
                <div className="seg pointer-events-auto">
                  {[
                    { id: "component", label: "Component" },
                    { id: "domain",    label: "Domain" },
                    { id: "phylum",    label: "Phylum" },
                    { id: "none",      label: "None" },
                  ].map(o => (
                    <button
                      key={o.id}
                      aria-pressed={colorBy === o.id}
                      onClick={() => setColorBy(o.id)}
                    >{o.label}</button>
                  ))}
                </div>
              </div>
            </div>
            {showSearch && (
              <div className="pointer-events-auto w-64">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="input pl-8 py-1.5 text-xs"
                    placeholder="Search family / organism…"
                    onKeyDown={e => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="block w-full h-full select-none"
          style={{ cursor: interactive ? (dragRef.current ? "grabbing" : "grab") : "default" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { setHover(null); dragRef.current = null; }}
        />

        {/* Hover tooltip */}
        {hover && (
          <div
            className="absolute z-20 pointer-events-none rounded-md border border-default px-2.5 py-1.5 text-[11px] font-mono"
            style={{
              left: Math.min(hover.px + 12, size.w - 220),
              top:  Math.min(hover.py + 12, size.h - 80),
              background: "rgba(10,10,10,0.95)",
              color: "var(--foreground)",
              minWidth: 180,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="legend-dot" style={{ background: colorFor(hover.point) }} />
              <span className="text-fg">{hover.point.clusterLabel}</span>
            </div>
            <div className="text-muted mt-1">CATH {hover.point.cath || "—"}</div>
            <div className="text-muted">Domain: <span className="text-fg">{hover.point.domain}</span></div>
            <div className="text-muted">Phylum: <span className="text-fg">{hover.point.phylum}</span></div>
            <div className="text-muted">Family size: <span className="text-fg">{hover.point.size * 47}</span></div>
          </div>
        )}

        {/* Bottom-right footer / hint */}
        {showTopBar && (
          <div className="absolute bottom-2 right-3 text-[10px] font-mono text-muted/70">
            {total.toLocaleString()} families · scroll to zoom · drag to pan
          </div>
        )}
      </div>
    </div>
  );
}

window.AtlasMap = AtlasMap;
window.ATLAS_CLUSTERS = CLUSTERS;
window.ATLAS_DOMAINS = DOMAINS;

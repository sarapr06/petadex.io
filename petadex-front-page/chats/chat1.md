# Tools-led Research Launchpad

_Started 2026-04-27 05:21 UTC_

---

## User

### Prototype A — Tools-led

**Hypothesis.** Researchers landing from a citation or search want to
get to work, not read about the resource. The page is a launchpad.

**Treatment.** Hero (AtlasMap + value prop + CTAs) → "How to use it"
moves immediately under the fold, as four cards with thumbnails:
Atlas, Sequence search, Substrate comparison, Family browser. Stats
strip and "What's in PETadex" appear below. Citation block at the
bottom.

**Deliberately omits.** No long-form prose explaining the resource;
the AtlasMap and the tool cards are expected to do that work.

## Assistant

I'll explore the attached resources first to understand the context.

_[tool: local_ls]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_ls]_

I have enough context. Let me read the most relevant files for the home page design — the existing index, SiteHeader, AtlasMap, and global styles.

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: snip]_

I have the full context I need. Let me build Prototype A — Tools-led — as an interactive React prototype with the AtlasMap as the hero centerpiece.

**Plan / system:**
- **Aesthetic:** PETadex dark mode (slate-near-black `oklch(0.14 0 0)` background, `#c94141` red accent), system sans for body, Courier mono for labels & technical text. This matches the screenshot exactly.
- **Hero:** big header with the AtlasMap embedded full-bleed, value prop overlaid left, CTA buttons. Need a working canvas-based UMAP cluster viz with pan/zoom — I'll generate ~2000 fake points in clusters matching the colors in the reference image.
- **Below the fold:** "Start here" — 4 tool cards with mini live thumbnails (Atlas mini, sequence search box, scatter, family tree).
- **Stats strip + What's in PETadex** + **Citation block.**
- Realistic interactions: pan/zoom on hero atlas, working sequence-search input that validates and routes, toggleable color-by mode.

Let me build it.

_[tool: update_todos]_

Let me start by writing the assumptions doc and the main HTML scaffold, then layer in components.

_[tool: write_file]_

Now the AtlasMap component. This is the centerpiece — a real interactive UMAP canvas with pan/zoom matching the screenshot.

_[tool: write_file]_

_[tool: snip]_

Now the thumbnails component for the 4 tool cards.

_[tool: write_file]_

_[tool: snip]_

Now the main app — header, hero with embedded AtlasMap, tool cards, stats, what's-in-PETadex, citation, footer.

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

I built **Prototype A — Tools-led** as a hi-fi interactive prototype.

**What's there:**
- **Hero** — full-bleed AtlasMap (real interactive UMAP canvas: pan/drag, scroll-zoom, hover tooltips, color-by-component swatches in the floating legend) with the value prop and CTAs overlaid on the left.
- **Four tool cards** ("Start here") — Atlas, Sequence search, Substrate comparison, Family browser — each with a live mini-thumbnail (animated FASTA typewriter, BHET25 vs BHET50 scatter, radial dendrogram, mini UMAP).
- **Stats strip**, **What's in PETadex** (six-row data-layer table with table/endpoint refs from the schema), **Citation** block with copy-to-clipboard BibTeX.
- Header with the exact PETadex nav (Sequence / Enzymes / Search / Substrate / Metadata / Atlas, Atlas active with red underline) and a footer.

**Aesthetic** matches the repo's dark mode tokens exactly — `oklch(0.14 0 0)` background, `oklch(0.64 0.17 22)` red accent, system sans + monospace for technical text. Cluster colors sampled from your AtlasMap screenshot.

**Deliberate omissions** per your hypothesis: no long marketing prose, no use-case quotes, no "powered by open science" filler — the AtlasMap and tool cards do that work.

_[tool: fork_verifier_agent]_

_[tool: snip]_

_[tool: snip]_

Prototype A is delivered and the verifier is running. Nothing is pending on my end — feel free to point me at what you'd like to iterate on (a hero variation, a different first-fold treatment, Prototype B, etc).


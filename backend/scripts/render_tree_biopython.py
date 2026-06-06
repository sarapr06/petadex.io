#!/usr/bin/env python3
"""Render a Newick tree to SVG on stdout using Biopython Phylo + matplotlib."""

import sys
from io import StringIO


def main() -> int:
    newick = sys.stdin.read().strip()
    if not newick:
        print("Empty Newick input", file=sys.stderr)
        return 1

    if not newick.endswith(";"):
        newick = newick + ";"

    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from Bio import Phylo
    except ImportError:
        print(
            "biopython/matplotlib not installed — run: pip install -r backend/scripts/requirements-trees.txt",
            file=sys.stderr,
        )
        return 2

    try:
        handle = StringIO(newick)
        tree = Phylo.read(handle, "newick")
    except Exception as exc:
        print(f"Biopython parse error: {exc}", file=sys.stderr)
        return 1

    try:
        n_tips = tree.count_terminals()
        fig_h = max(4.0, n_tips * 0.45)
        fig = plt.figure(figsize=(14, fig_h))
        ax = fig.add_subplot(1, 1, 1)
        Phylo.draw(tree, axes=ax, do_show=False, show_confidence=False)
        ax.set_title("")
        ax.margins(x=0.08, y=0.06)
        fig.tight_layout(pad=1.2)
        fig.savefig(sys.stdout.buffer, format="svg", bbox_inches="tight", pad_inches=0.35)
        plt.close(fig)
    except Exception as exc:
        print(f"Biopython render error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())

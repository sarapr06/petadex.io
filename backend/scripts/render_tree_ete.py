#!/usr/bin/env python3
"""Render a Newick tree to SVG on stdout using ETE3."""

import argparse
import html
import math
import os
import re
import sys
import tempfile


def leaf_label_fsize(n_tips: int) -> int:
    """Leaf label point size for both rectangular and radial layouts."""
    if n_tips <= 4:
        return 5
    if n_tips <= 12:
        return 4
    return 3


def radial_min_leaf_separation(n_tips: int) -> int:
    """Push branch tips outward so long accession labels clear the tree centre."""
    if n_tips <= 4:
        return 100
    if n_tips <= 8:
        return 80
    if n_tips <= 16:
        return 60
    return 45


def radial_scale(n_tips: int) -> int:
    return max(40, min(80, 400 // max(n_tips, 1)))


def display_name(raw_name: str) -> str:
    """Strip HyPhy-style {Foreground} tags from Newick labels."""
    if not raw_name:
        return ""
    return raw_name.split("{", 1)[0]


def radial_label_pad_width(fsize: int) -> int:
    """Invisible gap between the leaf node and the accession label (SVG px)."""
    return max(10, int(fsize * 3))


def apply_radial_leaf_labels(tree, n_tips: int) -> None:
    from ete3.treeview import RectFace, TextFace

    fsize = leaf_label_fsize(n_tips)
    pad_w = radial_label_pad_width(fsize)
    for leaf in tree.iter_leaves():
        label = display_name(leaf.name)
        if not label:
            continue
        # RectFace pushes TextFace outward along the branch (matches white panel bg).
        leaf.add_face(
            RectFace(pad_w, 2, fgcolor="white", bgcolor="white"),
            column=0,
            position="branch-right",
        )
        tf = TextFace(label, fsize=fsize, ftype="Arial")
        leaf.add_face(tf, column=1, position="branch-right")


def apply_rect_leaf_labels(tree, n_tips: int) -> None:
    from ete3.treeview import TextFace

    fsize = leaf_label_fsize(n_tips)
    for leaf in tree.iter_leaves():
        label = display_name(leaf.name)
        if not label:
            continue
        tf = TextFace(label, fsize=fsize, ftype="Arial")
        leaf.add_face(tf, column=0, position="branch-right")


CIRCLE_G_RE = re.compile(
    r'<g fill="#0030c1"[^>]*transform="matrix\(([^)]+)\)"[^>]*>\s*'
    r'<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"\s*/>\s*</g>',
    re.S,
)

TEXT_LABEL_RE = re.compile(
    r'<text[^>]*>([A-Z][A-Za-z0-9_.-]{4,})</text>',
)


def leaf_tooltip(node) -> str:
    name = display_name(node.name)
    return name or "Sequence"


def internal_tooltip(node) -> str:
    tips = [display_name(l.name) for l in node.get_leaves() if display_name(l.name)]
    if not tips:
        return "Internal node"
    if len(tips) == 1:
        return f"Internal node · {tips[0]}"
    if len(tips) <= 4:
        return f"Internal node · {', '.join(tips)}"
    return f"Internal node · {len(tips)} sequences ({', '.join(tips[:3])}, …)"


def _matrix_translate(matrix: str) -> tuple[float, float]:
    parts = [float(x) for x in matrix.split(",")]
    return parts[4], parts[5]


def _circle_global_xy(matrix: str, cx: str, cy: str) -> tuple[float, float]:
    parts = [float(x) for x in matrix.split(",")]
    cx_f, cy_f = float(cx), float(cy)
    sx = parts[0] * cx_f + parts[2] * cy_f + parts[4]
    sy = parts[1] * cx_f + parts[3] * cy_f + parts[5]
    return sx, sy


def _viewbox_center(svg: str) -> tuple[float, float]:
    match = re.search(r'viewBox="([^"]+)"', svg)
    if not match:
        return 0.0, 0.0
    x, y, w, h = (float(v) for v in match.group(1).split())
    return x + w / 2, y + h / 2


def _parse_text_labels(svg: str) -> dict[str, tuple[float, float]]:
    labels: dict[str, tuple[float, float]] = {}
    for match in TEXT_LABEL_RE.finditer(svg):
        name = match.group(1)
        chunk = svg[max(0, match.start() - 700) : match.start()]
        matrices = re.findall(r'transform="matrix\(([^)]+)\)"', chunk)
        if not matrices:
            continue
        labels[name] = _matrix_translate(matrices[-1])
    return labels


def _parse_node_circles(svg: str) -> list[dict]:
    circles = []
    for match in CIRCLE_G_RE.finditer(svg):
        matrix = match.group(1)
        cx, cy, r = match.group(2), match.group(3), match.group(4)
        sx, sy = _circle_global_xy(matrix, cx, cy)
        circles.append(
            {
                "start": match.start(),
                "end": match.end(),
                "block": match.group(0),
                "x": sx,
                "y": sy,
                "local_cx": cx,
                "local_cy": cy,
                "r": r,
            }
        )
    return circles


def _assign_nodes_to_circles(tree, svg: str) -> dict[int, object]:
    circles = _parse_node_circles(svg)
    if not circles:
        return {}

    labels = _parse_text_labels(svg)
    leaf_by_name = {
        display_name(n.name): n for n in tree.iter_leaves() if display_name(n.name)
    }

    assignments: dict[int, object] = {}
    used: set[int] = set()

    for name, (lx, ly) in labels.items():
        node = leaf_by_name.get(name)
        if node is None:
            continue
        best_i = min(
            range(len(circles)),
            key=lambda i: math.hypot(circles[i]["x"] - lx, circles[i]["y"] - ly),
        )
        if best_i in used:
            continue
        assignments[best_i] = node
        used.add(best_i)

    internals = [n for n in tree.traverse() if not n.is_leaf()]
    unused = [i for i in range(len(circles)) if i not in used]
    if internals and unused and len(internals) == len(unused):
        if any(getattr(n, "rad", None) is not None for n in internals):
            cx, cy = _viewbox_center(svg)
            unused.sort(
                key=lambda i: math.hypot(
                    circles[i]["x"] - cx, circles[i]["y"] - cy
                )
            )
            internals.sort(key=lambda n: float(getattr(n, "rad", 0) or 0))
        else:
            unused.sort(key=lambda i: circles[i]["x"])
            internals.sort(key=lambda n: n.get_distance(tree))
        for node, idx in zip(internals, unused):
            assignments[idx] = node

    return assignments


def _inject_circle_block(block: str, kind: str, label: str) -> str:
    title = html.escape(label)
    attr_label = html.escape(label, quote=True)
    hit_r = max(8.0, float(re.search(r'r="([^"]+)"', block).group(1)) * 4)
    local_cx = re.search(r'cx="([^"]+)"', block).group(1)
    local_cy = re.search(r'cy="([^"]+)"', block).group(1)

    opening = block.split(">", 1)[0] + ">"
    if 'class="petadex-tree-node"' not in opening:
        opening = opening.replace(
            '<g fill="#0030c1"',
            f'<g fill="#0030c1" class="petadex-tree-node" data-node-kind="{kind}" '
            f'data-node-label="{attr_label}"',
            1,
        )
    body = block[len(opening) : -4]  # drop </g>
    hit = (
        f'<title>{title}</title>'
        f'<circle cx="{local_cx}" cy="{local_cy}" r="{hit_r:.2f}" '
        f'fill="transparent" class="petadex-tree-node-hit" pointer-events="all"/>'
    )
    return f"{opening}{body}{hit}</g>"


def annotate_svg_nodes(svg: str, tree) -> str:
    """Add hover metadata and larger hit targets on ETE3 node circles."""
    circles = _parse_node_circles(svg)
    assignments = _assign_nodes_to_circles(tree, svg)
    if not assignments:
        return svg

    parts = []
    cursor = 0
    for i, circle in enumerate(circles):
        parts.append(svg[cursor : circle["start"]])
        block = circle["block"]
        node = assignments.get(i)
        if node is not None:
            kind = "leaf" if node.is_leaf() else "internal"
            label = leaf_tooltip(node) if node.is_leaf() else internal_tooltip(node)
            block = _inject_circle_block(block, kind, label)
        parts.append(block)
        cursor = circle["end"]
    parts.append(svg[cursor:])
    return "".join(parts)


def build_tree_style(layout: str, n_tips: int):
    from ete3.treeview import TreeStyle

    ts = TreeStyle()
    ts.show_branch_length = False
    ts.show_scale = False

    if layout == "radial":
        ts.mode = "c"
        ts.show_leaf_name = False
        ts.allow_face_overlap = True
        ts.min_leaf_separation = radial_min_leaf_separation(n_tips)
        ts.scale = radial_scale(n_tips)
        margin = max(90, min(130, 70 + n_tips * 4))
        ts.margin_left = margin
        ts.margin_right = margin
        ts.margin_top = margin
        ts.margin_bottom = margin
    else:
        ts.mode = "r"
        ts.show_leaf_name = False
        ts.orientation = 0
        ts.branch_vertical_margin = max(10, min(18, 180 // max(n_tips, 1)))
        ts.margin_left = 24
        ts.margin_right = 140
        ts.margin_top = 24
        ts.margin_bottom = 24
        ts.scale = 90

    return ts


def main() -> int:
    parser = argparse.ArgumentParser(description="Render Newick to SVG with ETE3")
    parser.add_argument(
        "--layout",
        choices=("rectangular", "radial"),
        default="rectangular",
        help="Tree layout: rectangular (default) or radial/circular",
    )
    args = parser.parse_args()

    newick = sys.stdin.read().strip()
    if not newick:
        print("Empty Newick input", file=sys.stderr)
        return 1

    if not newick.endswith(";"):
        newick = newick + ";"

    try:
        from ete3 import Tree
    except ImportError as exc:
        print(
            "ete3/PyQt5 not installed — run: pip install -r backend/scripts/requirements-trees.txt",
            file=sys.stderr,
        )
        print(f"Import detail: {exc}", file=sys.stderr)
        return 2

    try:
        tree = Tree(newick, format=1)
    except Exception as exc:
        print(f"ETE3 parse error: {exc}", file=sys.stderr)
        return 1

    ts = build_tree_style(args.layout, len(tree))
    if args.layout == "radial":
        apply_radial_leaf_labels(tree, len(tree))
    else:
        apply_rect_leaf_labels(tree, len(tree))

    with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
        out_path = tmp.name

    try:
        tree.render(out_path, tree_style=ts)
        with open(out_path, "r", encoding="utf-8") as fh:
            svg = fh.read()
        sys.stdout.write(annotate_svg_nodes(svg, tree))
    except Exception as exc:
        print(f"ETE3 render error: {exc}", file=sys.stderr)
        return 1
    finally:
        if os.path.exists(out_path):
            os.unlink(out_path)

    return 0


if __name__ == "__main__":
    sys.exit(main())

/**
 * Shared Newick parsing and conversion utilities for tree viewers.
 */

/**
 * Parse a Newick string into a plain JS tree { name?, branchLength?, children? }.
 * @param {string} s
 */
export function parseNewick(s) {
  const ancestors = []
  let tree = {}
  const tokens = s.split(/\s*(;|\(|\)|,|:)\s*/)
  let prevToken = ""

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim()
    if (!token) continue

    switch (token) {
      case "(": {
        const child = {}
        tree.children = tree.children || []
        tree.children.push(child)
        ancestors.push(tree)
        tree = child
        break
      }
      case ")":
        tree = ancestors.pop()
        break
      case ",": {
        const sibling = {}
        ancestors[ancestors.length - 1].children.push(sibling)
        tree = sibling
        break
      }
      case ":":
        break
      default:
        if (token === ";") break
        if (prevToken === "(" || prevToken === "," || prevToken === ")") {
          tree.name = token
        } else if (prevToken === ":") {
          tree.branchLength = parseFloat(token) || 0
        }
    }
    prevToken = token
  }
  return tree
}

/**
 * @param {{ name?: string, branchLength?: number, children?: unknown[] }} node
 */
export function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

/** @param {{ name?: string, branchLength?: number, children?: unknown[] }} node */
export function countTips(node) {
  return countLeaves(node)
}

/** @param {string | undefined} rawName */
export function displayAccession(rawName) {
  if (!rawName || rawName === "root") return ""
  return rawName.split("{", 1)[0]
}

/**
 * @param {{ name?: string, children?: { name?: string, children?: unknown[] }[] }} datum
 * @returns {string[]}
 */
export function tipAccessionsFromDatum(datum) {
  if (!datum.children?.length) {
    const n = displayAccession(datum.name)
    return n ? [n] : []
  }
  return datum.children.flatMap(tipAccessionsFromDatum)
}

/**
 * Hover label for a tree node (leaf accession or internal clade summary).
 * @param {{ name?: string, children?: unknown[] }} datum
 */
export function treeNodeTooltip(datum) {
  const tips = tipAccessionsFromDatum(datum)
  const isLeaf = !datum.children?.length
  if (isLeaf) {
    return displayAccession(datum.name) || "Sequence"
  }
  if (!tips.length) return "Internal node"
  if (tips.length === 1) return `Internal node · ${tips[0]}`
  if (tips.length <= 4) return `Internal node · ${tips.join(", ")}`
  return `Internal node · ${tips.length} sequences (${tips.slice(0, 3).join(", ")}, …)`
}

/**
 * Convert parsed Newick node to react-d3-tree RawNodeDatum shape.
 * @param {{ name?: string, branchLength?: number, children?: unknown[] }} node
 */
export function toReactD3Datum(node) {
  const datum = {
    name: node.name || "root",
    attributes:
      node.branchLength != null ? { length: String(node.branchLength) } : {},
  }
  if (node.children?.length) {
    datum.children = node.children.map(toReactD3Datum)
  }
  return datum
}

/**
 * @param {string} newick
 */
export function parseNewickToReactD3(newick) {
  const root = parseNewick(newick.trim())
  return toReactD3Datum(root)
}

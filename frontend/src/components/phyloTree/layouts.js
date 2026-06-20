export function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

/** Horizontal phylogram: branch length on x, even leaf spacing on y */
export function buildPhylogram(root, treeW, treeH) {
  root.each(node => {
    const bl = node.data.branchLength != null ? node.data.branchLength : 0
    node.distFromRoot = (node.parent ? node.parent.distFromRoot : 0) + bl
  })

  const maxDist = root.descendants().reduce((m, n) => Math.max(m, n.distFromRoot), 1e-10)

  root.each(node => {
    node.y = (node.distFromRoot / maxDist) * treeW
  })

  const leaves = []
  root.eachBefore(node => {
    if (!node.children || node.children.length === 0) leaves.push(node)
  })

  const n = leaves.length
  leaves.forEach((leaf, i) => {
    leaf.x = n <= 1 ? treeH / 2 : (i / (n - 1)) * treeH
  })

  root.eachAfter(node => {
    if (node.children && node.children.length > 0) {
      const childX = node.children.map(c => c.x)
      node.x = (Math.min(...childX) + Math.max(...childX)) / 2
    }
  })

  return root
}

/** Radial phylogram: branch length → radius, leaves evenly on arc */
export function buildRadialTree(root, radius) {
  root.each(node => {
    const bl = node.data.branchLength != null ? node.data.branchLength : 0
    node.distFromRoot = (node.parent ? node.parent.distFromRoot : 0) + bl
  })
  const maxDist = root
    .descendants()
    .reduce((m, n) => Math.max(m, n.distFromRoot), 1e-10)
  root.each(node => {
    node.radius = (node.distFromRoot / maxDist) * radius
  })

  const leaves = []
  root.eachBefore(node => {
    if (!node.children || node.children.length === 0) leaves.push(node)
  })
  const n = leaves.length
  const gap = (12 * Math.PI) / 180
  const span = 2 * Math.PI - gap
  leaves.forEach((leaf, i) => {
    leaf.angle =
      n <= 1 ? -Math.PI / 2 : -Math.PI / 2 + gap / 2 + (i / (n - 1)) * span
  })
  root.eachAfter(node => {
    if (node.children && node.children.length > 0) {
      const a = node.children.map(c => c.angle)
      node.angle = (Math.min(...a) + Math.max(...a)) / 2
    }
  })
  return root
}

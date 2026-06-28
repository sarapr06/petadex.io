/** Tokenizer-based Newick parser → nested { name, branchLength, children } */
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

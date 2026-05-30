/**
 * Project residue positions to viewer coordinates and layout callout boxes.
 */

const CALLOUT_GAP_PX = 64

/**
 * @param {import('molstar/lib/mol-model/loci').Loci} modelLoci
 * @returns {Promise<[number, number, number] | null>}
 */
export async function worldPositionFromModelLoci(modelLoci) {
  const { StructureElement, Unit } = await import(
    'molstar/lib/mol-model/structure',
  )
  const { Loci } = await import('molstar/lib/mol-model/loci')
  const { Vec3 } = await import('molstar/lib/mol-math/linear-algebra')
  const { OrderedSet } = await import('molstar/lib/mol-data/int')

  if (!modelLoci || Loci.isEmpty(modelLoci) || !StructureElement.Loci.is(modelLoci)) {
    return null
  }

  const residueLoci = StructureElement.Loci.firstResidue(modelLoci)
  const positions = []
  const tmp = Vec3()

  for (const { unit, indices } of residueLoci.elements) {
    if (!Unit.isAtomic(unit)) continue
    const { elements } = unit
    OrderedSet.forEach(indices, idx => {
      const loc = StructureElement.Location.create(unit, elements[idx])
      StructureElement.Location.position(tmp, loc)
      positions.push(Vec3.clone(tmp))
    })
  }

  if (!positions.length) {
    const loc = StructureElement.Loci.getFirstLocation(modelLoci)
    if (!loc) return null
    StructureElement.Location.position(tmp, loc)
    return [tmp[0], tmp[1], tmp[2]]
  }

  const center = Vec3()
  for (const p of positions) {
    Vec3.add(center, center, p)
  }
  Vec3.scale(center, center, 1 / positions.length)
  return [center[0], center[1], center[2]]
}

/**
 * @param {number[] | { x: number, y: number, z: number }} position
 * @returns {[number, number, number] | null}
 */
export function normalizeWorldPosition(position) {
  if (!position) return null
  if (Array.isArray(position) && position.length >= 3) {
    return [position[0], position[1], position[2]]
  }
  if (
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    typeof position.z === 'number'
  ) {
    return [position.x, position.y, position.z]
  }
  return null
}

/**
 * @param {import('molstar/lib/mol-plugin').PluginUIContext} plugin
 * @param {HTMLElement} containerEl
 * @param {[number, number, number]} worldPos
 * @returns {{ x: number, y: number } | null}
 */
export function projectWorldToContainer(plugin, containerEl, worldPos) {
  const canvas3d = plugin?.canvas3d
  if (!canvas3d?.camera || !containerEl) return null

  const canvas = containerEl.querySelector('canvas')
  if (!canvas) return null

  const out = [0, 0, 0]
  canvas3d.camera.project(out, worldPos)

  const canvasRect = canvas.getBoundingClientRect()
  const containerRect = containerEl.getBoundingClientRect()

  const clientX = canvasRect.left + out[0]
  const clientY = canvasRect.top + (canvasRect.height - out[1])

  return {
    x: clientX - containerRect.left,
    y: clientY - containerRect.top,
  }
}

/**
 * World-space offset toward camera so screen gap stays ~CALLOUT_GAP_PX when zooming.
 * @param {import('molstar/lib/mol-plugin').PluginUIContext} plugin
 * @param {[number, number, number]} worldPos
 * @returns {[number, number, number]}
 */
export function calloutWorldPosition(plugin, worldPos) {
  const camera = plugin?.canvas3d?.camera
  if (!camera) return worldPos

  const pos = worldPos
  const dir = [
    camera.position[0] - pos[0],
    camera.position[1] - pos[1],
    camera.position[2] - pos[2],
  ]
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1
  const gap = CALLOUT_GAP_PX * camera.getPixelSize(pos)
  return [
    pos[0] + (dir[0] / len) * gap,
    pos[1] + (dir[1] / len) * gap,
    pos[2] + (dir[2] / len) * gap,
  ]
}

/**
 * @param {{ x: number, y: number }} anchor container coords of residue
 * @param {{ x: number, y: number }} label container coords of callout anchor
 * @param {number} containerW
 * @param {number} containerH
 * @param {{ w: number, h: number }} box
 */
export function layoutCalloutBox(anchor, label, containerW, containerH, box) {
  const pad = 8
  let left = label.x - box.w / 2
  let top = label.y - box.h / 2
  left = Math.max(pad, Math.min(left, containerW - box.w - pad))
  top = Math.max(pad, Math.min(top, containerH - box.h - pad))

  const boxCenter = { x: left + box.w / 2, y: top + box.h / 2 }
  const arrowEnd = nearestPointOnRect(boxCenter, box.w, box.h, anchor)

  return {
    anchor,
    box: { left, top, width: box.w, height: box.h },
    boxCenter,
    arrowEnd,
  }
}

/**
 * @param {{ x: number, y: number }} center
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number }} point
 */
function nearestPointOnRect(center, w, h, point) {
  const halfW = w / 2
  const halfH = h / 2
  const left = center.x - halfW
  const right = center.x + halfW
  const top = center.y - halfH
  const bottom = center.y + halfH

  const cx = Math.max(left, Math.min(point.x, right))
  const cy = Math.max(top, Math.min(point.y, bottom))
  return { x: cx, y: cy }
}

/**
 * @param {import('molstar/lib/mol-plugin').PluginUIContext} plugin
 * @param {HTMLElement} containerEl
 * @param {[number, number, number]} worldPos
 * @param {{ w: number, h: number }} boxSize
 */
export function computeCalloutLayout(plugin, containerEl, worldPos, boxSize) {
  const containerRect = containerEl.getBoundingClientRect()
  const anchor = projectWorldToContainer(plugin, containerEl, worldPos)
  if (!anchor) return null

  const labelWorld = calloutWorldPosition(plugin, worldPos)
  const label = projectWorldToContainer(plugin, containerEl, labelWorld)
  if (!label) return null

  return layoutCalloutBox(
    anchor,
    label,
    containerRect.width,
    containerRect.height,
    boxSize,
  )
}

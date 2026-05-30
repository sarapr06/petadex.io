/**
 * Map Mol* hover/click events to annotated residue records.
 */

import {
  normalizeWorldPosition,
  worldPositionFromModelLoci,
} from './molstarAnnotationCallout.js'

/**
 * @param {import('molstar/lib/mol-model/loci').Loci} modelLoci
 * @returns {Promise<number | null>}
 */
export async function seqPosFromModelLoci(modelLoci) {
  const { StructureElement, StructureProperties } = await import(
    'molstar/lib/mol-model/structure',
  )
  const { Loci } = await import('molstar/lib/mol-model/loci')

  if (!modelLoci || Loci.isEmpty(modelLoci)) return null

  if (!StructureElement.Loci.is(modelLoci)) return null

  const loc = StructureElement.Loci.getFirstLocation(modelLoci)
  if (!loc) return null

  try {
    const seqPos = StructureProperties.residue.label_seq_id(loc)
    return typeof seqPos === 'number' && Number.isFinite(seqPos) ? seqPos : null
  } catch {
    return null
  }
}

/**
 * @param {unknown} current Mol* Representation.Loci or model Loci
 * @returns {import('molstar/lib/mol-model/loci').Loci | null}
 */
export function modelLociFromInteraction(current) {
  if (!current) return null
  if (current.loci) return current.loci
  if (current.kind) return current
  return null
}

/**
 * @param {Array<{ seqPos: number }>} annotations
 */
export function annotationBySeqPos(annotations) {
  const map = new Map()
  for (const ann of annotations || []) {
    if (ann?.seqPos != null) map.set(ann.seqPos, ann)
  }
  return map
}

/**
 * @param {import('molstar/lib/mol-plugin').PluginUIContext} plugin
 * @param {{
 *   annotations: Array<{ seqPos: number }>,
 *   onHover: (payload: {
 *     annotation: object,
 *     worldPos: [number, number, number],
 *   } | null) => void,
 *   onClick: (payload: {
 *     annotation: object,
 *     worldPos: [number, number, number],
 *   } | null) => void,
 * }} handlers
 * @returns {import('rxjs').Subscription[]}
 */
export function attachAnnotationInteractivity(plugin, { annotations, onHover, onClick }) {
  if (!plugin?.behaviors?.interaction || !annotations?.length) return []

  const bySeqPos = annotationBySeqPos(annotations)
  const subs = []

  const resolve = async (current, position, callback) => {
    const modelLoci = modelLociFromInteraction(current)
    if (!modelLoci) {
      callback(null)
      return
    }
    const seqPos = await seqPosFromModelLoci(modelLoci)
    const annotation = seqPos != null ? bySeqPos.get(seqPos) : undefined
    if (!annotation) {
      callback(null)
      return
    }

    let worldPos = normalizeWorldPosition(position)
    if (!worldPos) {
      worldPos = await worldPositionFromModelLoci(modelLoci)
    }
    if (!worldPos) {
      callback(null)
      return
    }

    callback({ annotation, worldPos })
  }

  subs.push(
    plugin.behaviors.interaction.hover.subscribe(ev => {
      resolve(ev.current, ev.position, payload => onHover(payload))
    }),
  )

  subs.push(
    plugin.behaviors.interaction.click.subscribe(ev => {
      resolve(ev.current, ev.position, payload => onClick(payload))
    }),
  )

  return subs
}

/**
 * @param {import('rxjs').Subscription[]} subs
 */
export function detachAnnotationInteractivity(subs) {
  for (const sub of subs || []) {
    try {
      sub.unsubscribe()
    } catch {
      /* ignore */
    }
  }
}

/**
 * Reproject callouts when the camera zooms or rotates.
 * @param {import('molstar/lib/mol-plugin').PluginUIContext} plugin
 * @param {() => void} onCameraChange
 */
export function attachCameraReproject(plugin, onCameraChange) {
  const camera = plugin?.canvas3d?.camera
  if (!camera?.stateChanged) return null

  return camera.stateChanged.subscribe(() => {
    onCameraChange()
  })
}

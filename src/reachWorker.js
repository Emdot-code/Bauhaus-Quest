// Runs the walking analysis in the background so the 3D view keeps moving while it works.

import { makeProjection, prepareBuildings, prepareCells, computeCircleReach } from './reach.js'

let city = null

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    const project = makeProjection(data.center)
    city = {
      buildings: prepareBuildings(data.buildings, project),
      cells: prepareCells(data.zensus, project),
    }
    self.postMessage({ type: 'ready' })
    return
  }
  if (data.type === 'reach') {
    const { id, point } = data
    try {
      const r = computeCircleReach(city.buildings, city.cells, point)
      self.postMessage(
        { type: 'reach', id, point, start: { xy: point }, areas: r.areas, level: r.level, distance: r.distance },
        [r.level.buffer, r.distance.buffer],
      )
    } catch (err) {
      self.postMessage({ type: 'reach', id, point, error: String(err?.message ?? err) })
    }
  }
}

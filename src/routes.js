// Routes to the campus along the pedestrian network: on foot from the train station, and the
// city bus from the station through its stops.
//
// Walking: one shortest-path search from the station gives a tree of routes; streets that several
// routes share are drawn once, and arrows on them line up because the distance from the station
// is the same whichever destination you walk to.
//
// Bus: the bus is drawn along the shortest path between consecutive stops. Buses keep to roads,
// so on a few corners the real bus may take a different street.

const WALK_SPEED_M_PER_MIN = 80 // 4.8 km/h, the same as the walking reach in reach.js

function makeNetwork(graphJson, project) {
  const nodes = new Map(graphJson.nodes.map((n) => [n.id, { id: n.id, xy: project([n.lon, n.lat]), edges: [] }]))
  for (const e of graphJson.edges) {
    if (!e.walkable) continue
    const pts = e.coords.map(project)
    nodes.get(e.from).edges.push({ to: e.to, length: e.length, pts })
    nodes.get(e.to).edges.push({ to: e.from, length: e.length, pts: [...pts].reverse() })
  }
  return nodes
}

function nearestNode(nodes, [x, y]) {
  let best = null
  let bestD = Infinity
  for (const n of nodes.values()) {
    const d = Math.hypot(n.xy[0] - x, n.xy[1] - y)
    if (d < bestD) {
      best = n
      bestD = d
    }
  }
  return best
}

// Shortest distances from one node, and for each node the edge used to reach it.
function shortestFrom(nodes, startId) {
  const dist = new Map([[startId, 0]])
  const via = new Map()
  const done = new Set()
  const queue = [[0, startId]]
  while (queue.length) {
    queue.sort((a, b) => b[0] - a[0]) // the network is small; a sorted list is enough
    const [d, id] = queue.pop()
    if (done.has(id)) continue
    done.add(id)
    for (const e of nodes.get(id).edges) {
      const nd = d + e.length
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd)
        via.set(e.to, { from: id, pts: e.pts, d0: d, d1: nd })
        queue.push([nd, e.to])
      }
    }
  }
  return { dist, via }
}

// The edges from the start to `endId`, in walking order.
function pathTo(via, endId) {
  const steps = []
  for (let id = endId; via.has(id); id = via.get(id).from) steps.push(via.get(id))
  return steps.reverse()
}

// Splits edges into straight pieces, each with its distance along the route at both ends.
function toPieces(steps, shift = 0) {
  const pieces = []
  for (const { pts, d0, d1 } of steps) {
    const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
    const total = lens.reduce((a, b) => a + b, 0) || 1
    let d = d0
    lens.forEach((len, i) => {
      const step = (len / total) * (d1 - d0)
      let a = pts[i]
      let b = pts[i + 1]
      if (shift) {
        // move the piece sideways, to the right of the direction of travel
        const nx = ((b[1] - a[1]) / (len || 1)) * shift
        const ny = (-(b[0] - a[0]) / (len || 1)) * shift
        a = [a[0] + nx, a[1] + ny]
        b = [b[0] + nx, b[1] + ny]
      }
      pieces.push({ a, b, d0: d, d1: d + step })
      d += step
    })
  }
  return pieces
}

// The point at distance `d` along a list of pieces.
function pointAt(pieces, d) {
  const p = pieces.find((q) => d >= q.d0 && d <= q.d1) ?? pieces[pieces.length - 1]
  const f = p.d1 > p.d0 ? (d - p.d0) / (p.d1 - p.d0) : 0
  return [p.a[0] + (p.b[0] - p.a[0]) * f, p.a[1] + (p.b[1] - p.a[1]) * f]
}

// On foot: from the station to each target ({ key, xy }).
export function buildWalkRoutes(graphJson, project, stationXY, targets) {
  const nodes = makeNetwork(graphJson, project)
  const start = nearestNode(nodes, stationXY)
  const { dist, via } = shortestFrom(nodes, start.id)

  const used = new Map()
  const walks = {}
  for (const t of targets) {
    const end = nearestNode(nodes, t.xy)
    const steps = pathTo(via, end.id)
    const metres = dist.get(end.id)
    const path = toPieces(steps)
    // at(f): the point a share f of the way along, for placing a label
    walks[t.key] = { metres, minutes: Math.round(metres / WALK_SPEED_M_PER_MIN), at: (f) => pointAt(path, metres * f) }
    for (const s of steps) used.set(s, s)
  }
  return { pieces: toPieces([...used.values()]), walks }
}

// By bus: through `stops` ({ key, xy }) in order, offset to the side so it doesn't hide the walk.
export function buildBusRoute(graphJson, project, stops, shift = 9) {
  const nodes = makeNetwork(graphJson, project)
  const ends = stops.map((s) => nearestNode(nodes, s.xy))
  const steps = []
  let offset = 0
  for (let i = 0; i + 1 < ends.length; i++) {
    const { dist, via } = shortestFrom(nodes, ends[i].id)
    for (const s of pathTo(via, ends[i + 1].id)) steps.push({ ...s, d0: s.d0 + offset, d1: s.d1 + offset })
    offset += dist.get(ends[i + 1].id)
  }
  const pieces = toPieces(steps, shift)
  return {
    pieces,
    metres: offset,
    at: (f) => pointAt(pieces, offset * f),
    stops: ends.map((n, i) => ({ ...stops[i], xy: n.xy })),
  }
}

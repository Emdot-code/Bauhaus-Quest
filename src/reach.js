// The walking analysis: projection to metres, the street graph, the walk itself,
// the 25 m band around the reached streets, and the residents counted from the census cells.
// No drawing happens here.

import 'jsts/org/locationtech/jts/monkey.js'
import GeometryFactory from 'jsts/org/locationtech/jts/geom/GeometryFactory.js'
import Coordinate from 'jsts/org/locationtech/jts/geom/Coordinate.js'

export const WALK_SPEED_M_PER_MIN = 80 // 4.8 km/h
export const MINUTES = [5, 10, 15]
export const BAND_M = 25 // band on each side of a reached street
export const MAX_SNAP_M = 100 // farthest a click may be from a walkable street

const gf = new GeometryFactory()

export { makeProjection } from './projection.js'

// ---------- jsts helpers ----------

function ring(points) {
  const coords = points.map(([x, y]) => new Coordinate(x, y))
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first.x !== last.x || first.y !== last.y) coords.push(new Coordinate(first.x, first.y))
  return gf.createLinearRing(coords)
}

// A GeoJSON Polygon's rings (already projected to metres) as a jsts polygon.
export function toJstsPolygon(rings) {
  const [outer, ...holes] = rings
  return gf.createPolygon(ring(outer), holes.map(ring))
}

// A jsts (multi)polygon as a list of polygons, each a list of rings of [x, y] points.
export function polygonsOf(geom) {
  const out = []
  for (let i = 0; i < geom.getNumGeometries(); i++) {
    const p = geom.getGeometryN(i)
    if (p.getGeometryType() !== 'Polygon' || p.isEmpty()) continue
    const rings = [p.getExteriorRing()]
    for (let h = 0; h < p.getNumInteriorRing(); h++) rings.push(p.getInteriorRingN(h))
    out.push(rings.map((r) => r.getCoordinates().map((c) => [c.x, c.y])))
  }
  return out
}

// ---------- the street graph ----------

export function buildGraph(graphJson, project) {
  const nodes = new Map()
  for (const n of graphJson.nodes) nodes.set(n.id, { id: n.id, xy: project([n.lon, n.lat]), edges: [] })
  const edges = []
  for (const e of graphJson.edges) {
    if (!e.walkable) continue
    const a = nodes.get(e.from)
    const b = nodes.get(e.to)
    if (!a || !b) continue
    const edge = {
      id: e.id,
      from: e.from,
      to: e.to,
      length: e.length,
      line: e.coords.map(project), // from `from` to `to`
    }
    edges.push(edge)
    a.edges.push(edge)
    b.edges.push(edge)
  }
  // Only nodes on at least one walkable edge can be a start.
  const walkableNodes = [...nodes.values()].filter((n) => n.edges.length > 0)
  return { nodes, edges, walkableNodes }
}

function distToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// The nearest walkable node to a point, or null if no walkable street lies within MAX_SNAP_M.
export function findStart(graph, p) {
  let nearestStreet = Infinity
  for (const e of graph.edges) {
    for (let i = 0; i + 1 < e.line.length; i++) {
      nearestStreet = Math.min(nearestStreet, distToSegment(p, e.line[i], e.line[i + 1]))
    }
  }
  if (nearestStreet > MAX_SNAP_M) return { node: null, streetDistance: nearestStreet }
  let best = null
  let bestD = Infinity
  for (const n of graph.walkableNodes) {
    const d = Math.hypot(n.xy[0] - p[0], n.xy[1] - p[1])
    if (d < bestD) {
      bestD = d
      best = n
    }
  }
  return { node: best, streetDistance: nearestStreet, nodeDistance: bestD }
}

// Shortest walking distance in metres from the start node to every node, up to maxDist.
function dijkstra(graph, startId, maxDist) {
  const dist = new Map([[startId, 0]])
  const heap = [[0, startId]]
  const push = (item) => {
    heap.push(item)
    let i = heap.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (heap[parent][0] <= heap[i][0]) break
      ;[heap[parent], heap[i]] = [heap[i], heap[parent]]
      i = parent
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length > 0) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]
        i = m
      }
    }
    return top
  }
  while (heap.length > 0) {
    const [d, id] = pop()
    if (d > dist.get(id)) continue
    for (const e of graph.nodes.get(id).edges) {
      const other = e.from === id ? e.to : e.from
      const nd = d + e.length
      if (nd <= maxDist && nd < (dist.get(other) ?? Infinity)) {
        dist.set(other, nd)
        push([nd, other])
      }
    }
  }
  return dist
}

// The point at distance s (in the edge's own metres) along an edge's line.
function pointAlong(line, length, s) {
  const t = Math.max(0, Math.min(1, length === 0 ? 0 : s / length))
  // Spread the edge's length over its drawn line in proportion to each piece.
  const pieces = []
  let total = 0
  for (let i = 0; i + 1 < line.length; i++) {
    const l = Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1])
    pieces.push(l)
    total += l
  }
  let target = t * total
  for (let i = 0; i < pieces.length; i++) {
    if (target <= pieces[i] || i === pieces.length - 1) {
      const f = pieces[i] === 0 ? 0 : Math.min(1, target / pieces[i])
      return [line[i][0] + f * (line[i + 1][0] - line[i][0]), line[i][1] + f * (line[i + 1][1] - line[i][1])]
    }
    target -= pieces[i]
  }
  return line[line.length - 1]
}

// The part of a line between distances s0 and s1 along it.
function subLine(line, length, s0, s1) {
  const pts = [pointAlong(line, length, s0)]
  if (line.length > 2) {
    // keep the inner vertices that lie between s0 and s1
    let acc = 0
    let total = 0
    const cum = [0]
    for (let i = 0; i + 1 < line.length; i++) {
      total += Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1])
      cum.push(total)
    }
    for (let i = 1; i < line.length - 1; i++) {
      acc = (cum[i] / total) * length
      if (acc > s0 && acc < s1) pts.push(line[i])
    }
  }
  pts.push(pointAlong(line, length, s1))
  return pts
}

// The street pieces reached within `budget` metres, given the node distances.
// An edge is walked in from either end; a piece that is reached from both ends joins up.
function reachedPieces(graph, dist, budget) {
  const pieces = []
  for (const e of graph.edges) {
    const du = dist.get(e.from)
    const dv = dist.get(e.to)
    const fromU = du !== undefined && du <= budget ? budget - du : -1 // metres walkable from `from`
    const fromV = dv !== undefined && dv <= budget ? budget - dv : -1 // metres walkable from `to`
    if (fromU < 0 && fromV < 0) continue
    if (fromU + fromV >= e.length || fromU >= e.length || fromV >= e.length) {
      pieces.push(e.line)
      continue
    }
    if (fromU >= 0) pieces.push(subLine(e.line, e.length, 0, fromU))
    if (fromV >= 0) pieces.push(subLine(e.line, e.length, e.length - fromV, e.length))
  }
  return pieces
}

// ---------- plane geometry ----------

function bboxOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function signedArea(points) {
  let a = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    a += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1])
  }
  return a / 2
}

function pointInRing([px, py], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function pointInPolygon(p, rings) {
  if (!pointInRing(p, rings[0])) return false
  for (let h = 1; h < rings.length; h++) if (pointInRing(p, rings[h])) return false
  return true
}

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

function segmentsCross(a, b, c, d) {
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))
}

function segmentDistance(a, b, c, d) {
  if (segmentsCross(a, b, c, d)) return 0
  return Math.min(distToSegment(a, c, d), distToSegment(b, c, d), distToSegment(c, a, b), distToSegment(d, a, b))
}

// Clip a ring to a convex polygon (Sutherland–Hodgman). The clipped ring's area is exact
// even for a concave ring, which is all we need it for.
function clipRing(ring, clip) {
  const ccw = signedArea(clip) > 0 ? 1 : -1 // signedArea is positive for counter-clockwise
  let out = ring
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const a = clip[i]
    const b = clip[(i + 1) % clip.length]
    const inside = (p) => ccw * cross(a, b, p) >= 0
    const input = out
    out = []
    for (let j = 0; j < input.length; j++) {
      const p = input[j]
      const q = input[(j + 1) % input.length]
      const pin = inside(p)
      const qin = inside(q)
      if (pin) out.push(p)
      if (pin !== qin) {
        const cp = cross(a, b, p)
        const cq = cross(a, b, q)
        const t = cp / (cp - cq)
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
      }
    }
  }
  return out
}

// ---------- a quick lookup of street pieces by place ----------

const GRID_M = 50

function segmentIndex(pieces) {
  const segs = []
  for (const p of pieces) for (let i = 0; i + 1 < p.length; i++) segs.push([p[i], p[i + 1]])
  const grid = new Map()
  segs.forEach(([a, b], s) => {
    const x0 = Math.floor(Math.min(a[0], b[0]) / GRID_M)
    const x1 = Math.floor(Math.max(a[0], b[0]) / GRID_M)
    const y0 = Math.floor(Math.min(a[1], b[1]) / GRID_M)
    const y1 = Math.floor(Math.max(a[1], b[1]) / GRID_M)
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const key = x + ',' + y
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(s)
      }
  })
  const stamp = new Int32Array(segs.length)
  let query = 0
  // The segments whose boxes come near a box.
  const near = (bb) => {
    query++
    const found = []
    for (let x = Math.floor(bb.minX / GRID_M); x <= Math.floor(bb.maxX / GRID_M); x++)
      for (let y = Math.floor(bb.minY / GRID_M); y <= Math.floor(bb.maxY / GRID_M); y++) {
        const list = grid.get(x + ',' + y)
        if (!list) continue
        for (const s of list) {
          if (stamp[s] === query) continue
          stamp[s] = query
          found.push(segs[s])
        }
      }
    return found
  }
  return near
}

// Does a building footprint lie within `band` metres of any reached street piece?
// This is the same as touching the band, measured exactly rather than on its drawn outline.
function touchesBand(building, near, band) {
  const bb = building.bbox
  const segs = near({ minX: bb.minX - band, minY: bb.minY - band, maxX: bb.maxX + band, maxY: bb.maxY + band })
  if (segs.length === 0) return false
  for (const [a, b] of segs) {
    if (pointInPolygon(a, building.rings)) return true
    for (const ring of building.rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        if (segmentDistance(a, b, ring[j], ring[i]) <= band) return true
      }
    }
  }
  return false
}

// ---------- the city layers used by the analysis ----------

const openRing = (r) => {
  const first = r[0]
  const last = r[r.length - 1]
  return first[0] === last[0] && first[1] === last[1] ? r.slice(0, -1) : r
}

export function prepareBuildings(buildingsJson, project) {
  return buildingsJson.features.map((f) => {
    const rings = f.geometry.coordinates.map((r) => openRing(r.map(project)))
    return { id: f.properties.id, use: f.properties.use, height: f.properties.height, rings, bbox: bboxOf(rings[0]) }
  })
}

export function prepareCells(zensusJson, project) {
  return zensusJson.features.map((f) => {
    const ring = openRing(f.geometry.coordinates[0].map(project))
    return { id: f.properties.id, population: f.properties.population, ring, area: Math.abs(signedArea(ring)), bbox: bboxOf(ring) }
  })
}

// The part of a cell's area that lies inside the area's polygons, in m².
function areaInside(cell, polygons) {
  let sum = 0
  for (const rings of polygons) {
    const bb = bboxOf(rings[0])
    if (bb.maxX < cell.bbox.minX || bb.minX > cell.bbox.maxX || bb.maxY < cell.bbox.minY || bb.minY > cell.bbox.maxY) continue
    rings.forEach((r, h) => {
      const a = Math.abs(signedArea(clipRing(openRing(r), cell.ring)))
      sum += h === 0 ? a : -a // holes take area away
    })
  }
  return Math.max(0, sum)
}

// ---------- the reach ----------

// Everything shown for a click: the three areas, the buildings touching each and the residents.
export function computeReach(graph, buildings, cells, startNode) {
  const maxBudget = Math.max(...MINUTES) * WALK_SPEED_M_PER_MIN
  const dist = dijkstra(graph, startNode.id, maxBudget)

  // level[i] = index of the smallest area building i touches (0 = 5 min), or -1
  const level = new Int8Array(buildings.length).fill(-1)
  let candidates = buildings.map((_, i) => i)

  // Work from the largest area inwards: a building outside 15 min can't touch 10 min.
  const areas = []
  for (let k = MINUTES.length - 1; k >= 0; k--) {
    const minutes = MINUTES[k]
    const budget = minutes * WALK_SPEED_M_PER_MIN
    const pieces = reachedPieces(graph, dist, budget).filter((p) => p.length >= 2)

    // The area: a 25 m band on each side of every reached piece, joined into one shape.
    const lines = pieces.map((p) => gf.createLineString(p.map(([x, y]) => new Coordinate(x, y))))
    // Joining the lines first makes the band faster; 8 steps per quarter circle keeps
    // the rounded ends and corners within 15 cm of a true circle.
    const shape = gf.createMultiLineString(lines).union().buffer(BAND_M, 8)
    const polygons = polygonsOf(shape)

    const near = segmentIndex(pieces)
    const touching = candidates.filter((i) => touchesBand(buildings[i], near, BAND_M))
    for (const i of touching) level[i] = k
    candidates = touching

    let residents = 0
    let cellsWithout = 0
    let cellsCounted = 0
    for (const c of cells) {
      const inside = areaInside(c, polygons)
      if (inside < 0.01) continue
      if (c.population === null || c.population === undefined) {
        cellsWithout++
        continue
      }
      cellsCounted++
      residents += c.population * Math.min(1, inside / c.area)
    }

    areas[k] = {
      minutes,
      budget,
      polygons,
      areaM2: shape.getArea(),
      buildingCount: touching.length,
      residents: Math.round(residents / 10) * 10,
      residentsExact: residents,
      cellsCounted,
      cellsWithout,
    }
  }
  return { start: startNode, areas, level }
}


// ---------- the reach as circles ----------

// Shortest distance from point p to a building's outline, or 0 if p is inside it.
function distanceToBuilding(b, [px, py]) {
  let inside = false
  let best = Infinity
  const r = b.rings[0]
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [ax, ay] = r[j]
    const [bx, by] = r[i]
    if (by > py !== ay > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(ax + t * dx - px, ay + t * dy - py))
  }
  return inside ? 0 : best
}

// The same counts as computeReach, but each area is a circle around the click: the distance
// walked in that time in a straight line, at 80 m per minute. It ignores the street network.
export function computeCircleReach(buildings, cells, center) {
  const level = new Int8Array(buildings.length).fill(-1)
  const near = buildings.map((b) => distanceToBuilding(b, center))
  const areas = []
  for (let k = MINUTES.length - 1; k >= 0; k--) {
    const minutes = MINUTES[k]
    const radius = minutes * WALK_SPEED_M_PER_MIN
    const circle = Array.from({ length: 128 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2
      return [center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)]
    })
    const polygons = [[circle]]

    let count = 0
    near.forEach((d, i) => {
      if (d <= radius) {
        level[i] = k
        count++
      }
    })

    let residents = 0
    let cellsWithout = 0
    for (const c of cells) {
      const inside = areaInside(c, polygons)
      if (inside < 0.01) continue
      if (c.population === null || c.population === undefined) {
        cellsWithout++
        continue
      }
      residents += c.population * Math.min(1, inside / c.area)
    }
    areas[k] = { minutes, radius, polygons, buildingCount: count, residents: Math.round(residents / 10) * 10, cellsWithout }
  }
  // distance from the click to every building, for shading them on a gradient
  return { areas, level, distance: Float32Array.from(near) }
}

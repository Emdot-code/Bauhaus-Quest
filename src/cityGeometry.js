// Turns the city kit into Three.js geometry. In 3D, x points east, y up and -z north.

import * as THREE from 'three'
import { USE_COLORS, FALLBACK_USE_COLOR, REACH_MAX_M, reachColorAt } from './palette.js'

const to3 = ([x, y], h) => [x, h, -y]

function signedArea(ring) {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1])
  return a / 2 // positive for counter-clockwise
}

function cleanRing(ring, wantCCW) {
  const out = []
  for (const p of ring) {
    const q = out[out.length - 1]
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p)
  }
  if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop()
  const ccw = signedArea(out) > 0
  return ccw === wantCCW ? out : out.reverse()
}

// Buildings merged into one mesh: walls and a flat roof at `height`, with a colour per vertex from
// the building's use. `ranges[i]` says which vertices belong to building i, so it can be recoloured.
// A building with `skip` keeps its place in `ranges` but gets no geometry (the campus glows separately).
export function buildBuildings(buildings) {
  const pos = []
  const nrm = []
  const ranges = []
  for (const b of buildings) {
    const start = pos.length / 3
    ranges.push([start, 0])
    if (b.skip) continue
    const h = Math.max(b.height, 0.5)
    const outer = cleanRing(b.rings[0], true)
    const holes = b.rings.slice(1).map((r) => cleanRing(r, false)).filter((r) => r.length >= 3)
    if (outer.length < 3) continue
    // walls: outward normal of edge a→b is (dy, -dx) on the plan, (dy, 0, dx) in 3D
    for (const ring of [outer, ...holes]) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]
        const c = ring[(i + 1) % ring.length]
        const dx = c[0] - a[0]
        const dy = c[1] - a[1]
        const len = Math.hypot(dx, dy) || 1
        const n = [dy / len, 0, dx / len]
        const a0 = to3(a, 0), c0 = to3(c, 0), c1 = to3(c, h), a1 = to3(a, h)
        pos.push(...a0, ...c0, ...c1, ...a0, ...c1, ...a1)
        for (let k = 0; k < 6; k++) nrm.push(...n)
      }
    }
    // roof
    const contour = outer.map(([x, y]) => new THREE.Vector2(x, y))
    const holeVecs = holes.map((r) => r.map(([x, y]) => new THREE.Vector2(x, y)))
    const all = [...outer, ...holes.flat()]
    for (const tri of THREE.ShapeUtils.triangulateShape(contour, holeVecs)) {
      for (const idx of tri) {
        pos.push(...to3(all[idx], h))
        nrm.push(0, 1, 0)
      }
    }
    ranges[ranges.length - 1][1] = pos.length / 3 - start
  }

  const baseColors = new Float32Array(pos.length)
  const c = new THREE.Color()
  buildings.forEach((b, i) => {
    c.set(USE_COLORS[b.use] ?? FALLBACK_USE_COLOR)
    const [start, count] = ranges[i]
    for (let v = start; v < start + count; v++) {
      baseColors[v * 3] = c.r
      baseColors[v * 3 + 1] = c.g
      baseColors[v * 3 + 2] = c.b
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(baseColors.slice(), 3))
  geometry.computeBoundingSphere()
  return { geometry, ranges, baseColors }
}

// Recolour the buildings for a walk: every building within 15 minutes gets the gradient colour
// for its distance from the click; the others keep their use colour. `distance` is null for none.
export function paintBuildings({ geometry, ranges, baseColors }, distance) {
  const attr = geometry.getAttribute('color')
  const arr = attr.array
  arr.set(baseColors)
  if (distance) {
    const s = new THREE.Color()
    for (let i = 0; i < ranges.length; i++) {
      const d = distance[i]
      if (!(d <= REACH_MAX_M)) continue
      s.set(reachColorAt(d / REACH_MAX_M))
      const [start, count] = ranges[i]
      for (let v = start; v < start + count; v++) {
        arr[v * 3] = s.r
        arr[v * 3 + 1] = s.g
        arr[v * 3 + 2] = s.b
      }
    }
  }
  attr.needsUpdate = true
}

// Outlines of each floor, every `step` metres up the walls: the "detailed" look of the campus.
export function buildFloorLines(buildings, step = 3.5) {
  const pos = []
  for (const b of buildings) {
    for (let h = step; h < b.height - 0.5; h += step) {
      for (const ring of b.rings) {
        for (let i = 0; i + 1 < ring.length; i++) pos.push(...to3(ring[i], h), ...to3(ring[i + 1], h))
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return geometry
}

// The street network as thin lines just above the ground.
export function buildStreets(graphJson, project, y = 0.4) {
  const pos = []
  for (const e of graphJson.edges) {
    if (!e.walkable) continue
    const pts = e.coords.map(project)
    for (let i = 0; i + 1 < pts.length; i++) pos.push(...to3(pts[i], y), ...to3(pts[i + 1], y))
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return geometry
}


// The routes as a flat ribbon `width` metres wide, lying just above the ground.
export function buildRibbon(pieces, width, y) {
  const pos = []
  for (const { a, b } of pieces) {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = (-dy / len) * (width / 2)
    const ny = (dx / len) * (width / 2)
    const p1 = to3([a[0] + nx, a[1] + ny], y), p2 = to3([a[0] - nx, a[1] - ny], y)
    const p3 = to3([b[0] - nx, b[1] - ny], y), p4 = to3([b[0] + nx, b[1] + ny], y)
    pos.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return geometry
}

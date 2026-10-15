// The 3D view: Weimar at night. Buildings in muted colours by use, the walking reach,
// and in neon the university (as game checkpoints), the train station and the routes to campus.

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { buildRibbon, paintBuildings } from './cityGeometry.js'
import { BACKGROUND_COLOR, BUS_COLOR, GROUND_COLOR, GUIDE_COLOR, REACH_COLORS, ROUTE_COLOR, STREET_COLOR } from './palette.js'

const noRaycast = () => null

// A neon colour pushed above 1, so the bloom pass makes it glow.
const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k)

// Clicks that end a drag (orbiting) don't count.
const isClick = (e) => e.delta <= 4

// Campus buildings are drawn this much taller than they are, so they stand out like checkpoints.
export const CHECKPOINT_STRETCH = 1.3

function Ground({ size, onPick }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        if (!isClick(e)) return
        e.stopPropagation()
        onPick([e.point.x, -e.point.z])
      }}
    >
      <planeGeometry args={size} />
      <meshBasicMaterial color={GROUND_COLOR} />
    </mesh>
  )
}

function City({ city, distance }) {
  useEffect(() => {
    paintBuildings(city, distance)
  }, [city, distance])
  return (
    <mesh geometry={city.geometry} raycast={noRaycast}>
      <meshLambertMaterial vertexColors />
    </mesh>
  )
}

function StartPin({ xy }) {
  return (
    <group position={[xy[0], 0, -xy[1]]}>
      <mesh position={[0, 20, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.8, 0.8, 40, 8]} />
        <meshBasicMaterial color={REACH_COLORS[0]} />
      </mesh>
      <mesh position={[0, 42, 0]} raycast={noRaycast}>
        <sphereGeometry args={[5, 16, 12]} />
        <meshBasicMaterial color={REACH_COLORS[0]} />
      </mesh>
    </group>
  )
}

// A glowing building. As a checkpoint it is stretched upwards, has a glowing line at every floor,
// a ring on the ground, and, until it is found, a light beam, a ripple and a spinning diamond.
// Once found it flies a flag.
function NeonBuilding({ stop, color, found, selected, hovered, checkpoint, onSelect, onHover, children }) {
  const material = useRef()
  const lines = useRef()
  const floors = useRef()
  const edges = useMemo(() => new THREE.EdgesGeometry(stop.geometry, 25), [stop.geometry])
  useEffect(() => () => edges.dispose(), [edges])
  const stretch = checkpoint ? CHECKPOINT_STRETCH : 1
  const top = stop.top * stretch

  useFrame(({ clock }) => {
    const pulse = found ? 0 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4)
    // checkpoints keep their bodies a little darker so the glowing floor lines show
    const k = checkpoint ? 0.55 : 1
    const glow = k * (selected ? 3.2 : hovered ? 2.7 : found ? 1.7 : 0.9 + 0.9 * pulse)
    material.current.emissiveIntensity = glow
    lines.current.color.copy(hdr(color, selected || hovered ? 5 : found ? 3 : 1.6 + 1.6 * pulse))
    if (floors.current) floors.current.color.copy(hdr(color, selected || hovered ? 5 : found ? 3.5 : 2 + 1.5 * pulse))
  })

  const events = {
    onClick: (e) => {
      e.stopPropagation()
      if (isClick(e)) onSelect(stop.key)
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      onHover(stop.key, e.nativeEvent)
    },
    onPointerMove: (e) => {
      e.stopPropagation()
      onHover(stop.key, e.nativeEvent)
    },
    onPointerOut: () => onHover(null),
  }

  const [cx, cz] = stop.center
  return (
    <group>
      <group scale={[1, stretch, 1]}>
        <mesh geometry={stop.geometry} {...events}>
          <meshLambertMaterial
            ref={material}
            color={new THREE.Color(color).multiplyScalar(0.25)}
            emissive={color}
            toneMapped={false}
          />
        </mesh>
        <lineSegments geometry={edges} raycast={noRaycast}>
          <lineBasicMaterial ref={lines} toneMapped={false} />
        </lineSegments>
        {checkpoint && stop.floorLines && (
          <lineSegments geometry={stop.floorLines} raycast={noRaycast}>
            <lineBasicMaterial ref={floors} toneMapped={false} />
          </lineSegments>
        )}
      </group>
      {checkpoint && (
        // kept small, so neighbouring checkpoints on the main campus don't overlap too much
        <GroundRing center={stop.center} radius={Math.min(stop.extent * 0.7, 45) + 8} color={color} ripple={!found} />
      )}
      {checkpoint && !found && <Beam position={[cx, top, cz]} color={color} />}
      {checkpoint && !found && <Marker position={[cx, top + 26, cz]} color={color} events={events} />}
      {checkpoint && found && <Flag position={[cx, top, cz]} color={color} />}
      {children}
    </group>
  )
}

// A glowing ring on the ground around a checkpoint, with a ripple running outwards while it's unfound.
function GroundRing({ center, radius, color, ripple }) {
  const wave = useRef()
  const waveMat = useRef()
  useFrame(({ clock }) => {
    if (!wave.current) return
    const t = (clock.elapsedTime * 0.6) % 1
    wave.current.scale.setScalar(1 + t * 0.7)
    waveMat.current.opacity = 0.7 * (1 - t)
  })
  return (
    <group position={[center[0], 0.7, center[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh raycast={noRaycast} renderOrder={7}>
        <ringGeometry args={[radius, radius + 2.5, 64]} />
        <meshBasicMaterial color={hdr(color, 2)} toneMapped={false} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh raycast={noRaycast} renderOrder={6}>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {ripple && (
        <mesh ref={wave} raycast={noRaycast} renderOrder={7}>
          <ringGeometry args={[radius, radius + 1.5, 64]} />
          <meshBasicMaterial ref={waveMat} color={hdr(color, 1.6)} toneMapped={false} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// A column of light above an unfound checkpoint, so it can be spotted from far away.
function Beam({ position, color }) {
  const mat = useRef()
  useFrame(({ clock }) => {
    mat.current.opacity = 0.07 + 0.04 * Math.sin(clock.elapsedTime * 2.4)
  })
  const height = 160
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} raycast={noRaycast}>
      <cylinderGeometry args={[0.8, 1.8, height, 12, 1, true]} />
      <meshBasicMaterial
        ref={mat}
        color={hdr(color, 1)}
        toneMapped={false}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// A flag on the roof of a checkpoint you have found.
function Flag({ position, color }) {
  const cloth = useRef()
  useFrame(({ clock }) => {
    cloth.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.25
  })
  const flag = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(14, -4.5)
    s.lineTo(0, -9)
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])
  return (
    <group position={position}>
      <mesh position={[0, 12, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.5, 0.5, 24, 6]} />
        <meshBasicMaterial color={hdr('#ffffff', 1.5)} toneMapped={false} />
      </mesh>
      <mesh ref={cloth} geometry={flag} position={[0, 24, 0]} raycast={noRaycast}>
        <meshBasicMaterial color={hdr(color, 2.2)} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// A spinning, bobbing diamond above every building that is still to be found.
function Marker({ position, color, events }) {
  const ref = useRef()
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    ref.current.rotation.y = t * 1.5
    ref.current.position.y = position[1] + Math.sin(t * 2) * 3
  })
  return (
    <mesh ref={ref} position={position} {...events}>
      <octahedronGeometry args={[9, 0]} />
      <meshBasicMaterial color={hdr(color, 2.5)} toneMapped={false} />
    </mesh>
  )
}

// Keeps page elements (the labels) floating above points in the 3D city.
function ScreenAnchors({ anchors, refs }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const a of anchors) {
      const el = refs.current[a.key]
      if (!el) continue
      v.set(...a.position).project(camera)
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
      el.style.display = visible ? '' : 'none'
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -100%)`
    }
  })
  return null
}

// A route: a glowing ribbon with small arrows running along it in the direction of travel.
const ARROW_SPACING = 30 // metres between arrows
const ARROW_SPEED = 28 // metres per second, so the arrows visibly flow

function chevron() {
  const s = new THREE.Shape()
  const pts = [[-3, 4], [-0.6, 4], [3.4, 0], [-0.6, -4], [-3, -4], [1, 0]]
  s.moveTo(...pts[0])
  for (const p of pts.slice(1)) s.lineTo(...p)
  s.closePath()
  const g = new THREE.ShapeGeometry(s)
  g.rotateX(-Math.PI / 2) // lie flat; plan x stays east, plan y becomes -z (north)
  return g
}

function Route({ pieces, color, width = 4.5, y = 0.5, speed = ARROW_SPEED }) {
  const ribbon = useMemo(() => buildRibbon(pieces, width, y), [pieces, width, y])
  const arrow = useMemo(chevron, [])
  const max = useMemo(() => pieces.reduce((n, p) => n + Math.ceil((p.d1 - p.d0) / ARROW_SPACING) + 1, 0), [pieces])
  const mesh = useRef()
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const scale = useMemo(() => new THREE.Vector3(1.2, 1.2, 1.2), [])
  const at = useMemo(() => new THREE.Vector3(), [])

  useEffect(
    () => () => {
      ribbon.dispose()
      arrow.dispose()
    },
    [ribbon, arrow],
  )

  useFrame(({ clock }) => {
    const offset = (clock.elapsedTime * speed) % ARROW_SPACING
    let n = 0
    for (const { a, b, d0, d1 } of pieces) {
      if (d1 <= d0) continue
      q.setFromAxisAngle(up, Math.atan2(b[1] - a[1], b[0] - a[0]))
      for (let d = Math.ceil((d0 - offset) / ARROW_SPACING) * ARROW_SPACING + offset; d < d1; d += ARROW_SPACING) {
        const f = (d - d0) / (d1 - d0)
        at.set(a[0] + (b[0] - a[0]) * f, y + 0.3, -(a[1] + (b[1] - a[1]) * f))
        mesh.current.setMatrixAt(n++, m.compose(at, q, scale))
      }
    }
    mesh.current.count = n
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <mesh geometry={ribbon} raycast={noRaycast} renderOrder={5}>
        <meshBasicMaterial color={hdr(color, 0.9)} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
      </mesh>
      <instancedMesh ref={mesh} args={[arrow, undefined, max]} raycast={noRaycast} frustumCulled={false} renderOrder={6}>
        <meshBasicMaterial color={hdr(color, 3)} toneMapped={false} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}

// A bus stop: a glowing orange pole with a sign on top.
function BusStop({ xy }) {
  return (
    <group position={[xy[0], 0, -xy[1]]}>
      <mesh position={[0, 11, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.7, 0.7, 22, 8]} />
        <meshBasicMaterial color={hdr(BUS_COLOR, 1.6)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 24, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[4, 4, 1.2, 24]} />
        <meshBasicMaterial color={hdr(BUS_COLOR, 2.6)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <ringGeometry args={[6, 8, 32]} />
        <meshBasicMaterial color={hdr(BUS_COLOR, 2)} toneMapped={false} transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  )
}

// Flies the camera smoothly to a building when `focus` changes. Grabbing the map stops the flight.
function CameraRig({ focus }) {
  const controls = useThree((s) => s.controls)
  const camera = useThree((s) => s.camera)
  const flight = useRef(null)

  useEffect(() => {
    if (!controls) return
    const stop = () => (flight.current = null)
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  useEffect(() => {
    if (!focus || !controls) return
    const toTarget = new THREE.Vector3(...focus.target)
    const offset = camera.position.clone().sub(controls.target)
    offset.y = Math.max(offset.y, 0.6 * offset.length()) // keep looking down at the city
    offset.setLength(focus.distance)
    flight.current = {
      fromTarget: controls.target.clone(),
      toTarget,
      fromPos: camera.position.clone(),
      toPos: toTarget.clone().add(offset),
      t: 0,
    }
  }, [focus, controls, camera])

  useFrame((_, dt) => {
    const f = flight.current
    if (!f) return
    f.t = Math.min(1, f.t + dt / 1.3)
    const k = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2 // ease in and out
    controls.target.lerpVectors(f.fromTarget, f.toTarget, k)
    camera.position.lerpVectors(f.fromPos, f.toPos, k)
    controls.update()
    if (f.t === 1) flight.current = null
  })
  return null
}

export default function CityScene({
  city, streets, groundSize, stops, station, walk, bus, guide, colors, found, selected, hovered, focus, start, reach,
  anchors, labelRefs, onSelect, onHover, onPick,
}) {
  return (
    <Canvas
      camera={{ position: [start[0] - 200, 2050, start[2] + 1250], fov: 40, near: 1, far: 20000 }}
      dpr={[1, 2]}
      flat
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color(BACKGROUND_COLOR))
        scene.fog = new THREE.Fog(BACKGROUND_COLOR, 2600, 6000)
      }}
      onPointerMissed={() => onHover(null)}
    >
      <hemisphereLight args={['#c9d2ff', '#1a1d30', 1.25]} />
      <directionalLight position={[-600, 1200, 800]} intensity={0.55} color="#c4ceff" />
      <Ground size={groundSize} onPick={onPick} />
      <lineSegments geometry={streets} raycast={noRaycast}>
        <lineBasicMaterial color={STREET_COLOR} />
      </lineSegments>
      <City city={city} distance={reach?.distance ?? null} />
      {reach?.start && <StartPin xy={reach.start.xy} />}
      {/* while the first-time guide is open, its own route replaces the green walks */}
      {!guide && <Route pieces={walk.pieces} color={ROUTE_COLOR} />}
      {bus && <Route pieces={bus.pieces} color={BUS_COLOR} width={4} y={0.55} speed={45} />}
      {bus?.stops.map((s) => <BusStop key={s.key} xy={s.xy} />)}
      {guide && <Route pieces={guide.pieces} color={GUIDE_COLOR} width={5} y={0.6} />}
      {stops.map((s) => (
        <NeonBuilding
          key={s.key}
          stop={s}
          color={colors[s.category]}
          found={found.has(s.key)}
          selected={selected === s.key}
          hovered={hovered === s.key}
          checkpoint
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      {station && (
        <NeonBuilding
          stop={station}
          color={ROUTE_COLOR}
          found
          selected={selected === station.key}
          hovered={hovered === station.key}
          onSelect={onSelect}
          onHover={onHover}
        />
      )}
      <ScreenAnchors anchors={anchors} refs={labelRefs} />
      <OrbitControls makeDefault target={start} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={60} maxDistance={5000} />
      <CameraRig focus={focus} />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={1.2} radius={0.7} />
      </EffectComposer>
    </Canvas>
  )
}

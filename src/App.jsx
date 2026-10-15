import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CityScene, { CHECKPOINT_STRETCH } from './CityScene.jsx'
import { makeProjection } from './projection.js'
import { buildBuildings, buildFloorLines, buildStreets } from './cityGeometry.js'
import { buildBusRoute, buildWalkRoutes } from './routes.js'
import { BUS, CAMPUS_CREDIT, CATEGORIES, FIRST_TIME, ROUTE_TARGETS, STATION, STOPS, rankFor } from './campus.js'
import { BUS_COLOR, FALLBACK_USE_COLOR, GUIDE_COLOR, REACH_COLORS, REACH_GRADIENT, ROUTE_COLOR, USE_COLORS, useLabel } from './palette.js'

const MINUTES = [5, 10, 15]
const ATTRIBUTION =
  'Buildings: 3D building models LoD2 © GDI-Th (dl-de/by-2-0). Land use and pedestrian network: Egor Gaydukov, InfAU, Bauhaus-Universität Weimar. Census grid: Zensus 2022, © Statistische Ämter des Bundes und der Länder (dl-de/by-2-0).'

const SAVE_KEY = 'bauhaus-campus-quest'
const COLORS = { ...Object.fromEntries(Object.entries(CATEGORIES).map(([k, c]) => [k, c.color])), arrival: ROUTE_COLOR }
const STOP_BY_KEY = Object.fromEntries([...STOPS, STATION].map((s) => [s.key, s]))

async function loadJson(name) {
  const r = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!r.ok) throw new Error(`data/${name}: ${r.status}`)
  return r.json()
}

const fmt = (n) => n.toLocaleString('en-US')

// Progress is kept in this browser only; the game works without it.
function loadProgress() {
  try {
    const keys = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '[]')
    return new Set(keys.filter((k) => STOPS.some((s) => s.key === k)))
  } catch {
    return new Set()
  }
}
function saveProgress(found) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify([...found]))
  } catch {
    // private window or blocked storage: progress simply isn't remembered
  }
}

// Centre, top and size of a group of footprints, in 3D (x east, z south).
function placeOf(footprints) {
  const pts = footprints.flatMap((b) => b.rings[0])
  const x = pts.reduce((a, p) => a + p[0], 0) / pts.length
  const y = pts.reduce((a, p) => a + p[1], 0) / pts.length
  return {
    xy: [x, y],
    center: [x, -y],
    top: Math.max(...footprints.map((b) => b.height)),
    extent: Math.max(...pts.map((p) => Math.hypot(p[0] - x, p[1] - y))),
  }
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [found, setFound] = useState(loadProgress)
  const [selected, setSelected] = useState(null)
  const [hover, setHover] = useState(null) // { key, x, y }
  const [focus, setFocus] = useState(null)
  const [intro, setIntro] = useState(() => loadProgress().size === 0)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('quest')
  const [guideOpen, setGuideOpen] = useState(false)
  const [hoursShown, setHoursShown] = useState(false) // the office label shows its hours only after a click
  const [workerReady, setWorkerReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reach, setReach] = useState(null)
  const [message, setMessage] = useState(null)
  const workerRef = useRef(null)
  const lastId = useRef(0)
  const labelRefs = useRef({}) // the labels floating over the map, by key

  useEffect(() => {
    Promise.all(['kit.json', 'buildings.geojson', 'streets.graph.json', 'zensus.geojson'].map(loadJson))
      .then(([kit, buildings, graph, zensus]) => setData({ kit, buildings, graph, zensus }))
      .catch((e) => setError(e.message))
  }, [])

  // The walking reach runs in a background worker, as in the first version.
  useEffect(() => {
    if (!data) return
    const worker = new Worker(new URL('./reachWorker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = ({ data: msg }) => {
      if (msg.type === 'ready') setWorkerReady(true)
      if (msg.type !== 'reach' || msg.id !== lastId.current) return // an older click
      setBusy(false)
      if (msg.error) {
        setReach(null)
        setMessage(`Something went wrong while walking: ${msg.error}`)
      } else if (msg.noStreet) {
        setReach(null)
        setMessage(
          `No walkable street within 100 m of this point (the nearest is ${fmt(Math.round(msg.streetDistance))} m away). Click closer to a street.`,
        )
      } else {
        setReach(msg)
        setMessage(null)
      }
    }
    worker.onerror = (e) => setError(`The walking calculation failed to start (${e.message ?? 'worker error'}).`)
    worker.postMessage({ type: 'init', center: data.kit.center, graph: data.graph, buildings: data.buildings, zensus: data.zensus })
    return () => worker.terminate()
  }, [data])

  // The 3D geometry, built once.
  const scene = useMemo(() => {
    if (!data) return null
    const project = makeProjection(data.kit.center)
    const glowing = new Map([...STOPS, STATION].flatMap((s) => s.ids.map((id) => [id, s.key])))
    const byStop = Object.fromEntries([...STOPS, STATION].map((s) => [s.key, []]))
    // every building keeps its place in the list, so the walking reach can recolour it by index
    const city = data.buildings.features.map((f) => {
      const b = { use: f.properties.use, height: f.properties.height, rings: f.geometry.coordinates.map((r) => r.map(project)) }
      const key = glowing.get(String(f.properties.id))
      if (key) byStop[key].push(b)
      return key ? { ...b, skip: true } : b
    })
    const neon = (s) => ({ key: s.key, category: s.category, geometry: buildBuildings(byStop[s.key]).geometry, ...placeOf(byStop[s.key]) })
    const stops = STOPS.filter((s) => byStop[s.key].length).map((s) => ({ ...neon(s), floorLines: buildFloorLines(byStop[s.key]) }))
    const station = byStop[STATION.key].length ? neon(STATION) : null

    const targets = stops.filter((s) => ROUTE_TARGETS.includes(s.key)).map((s) => ({ key: s.key, xy: s.xy }))
    const walk = station ? buildWalkRoutes(data.graph, project, station.xy, targets) : { pieces: [], walks: {} }
    const bus = buildBusRoute(data.graph, project, BUS.stops.map((b) => ({ ...b, xy: project(b.lonlat) })))

    // Labels over the map: the station, "by foot" and "by bus" on their routes, and each bus stop.
    const on = ([x, y], h) => [x, h, -y]
    const anchors = [
      ...(station ? [{ key: 'station', kind: 'start', position: [station.center[0], station.top + 18, station.center[1]] }] : []),
      ...(walk.walks.main ? [{ key: 'walk', kind: 'walk', position: on(walk.walks.main.at(0.15), 4) }] : []),
      { key: 'bus', kind: 'bus', position: on(bus.at(0.4), 4) },
      ...bus.stops.map((b) => ({ key: `stop-${b.key}`, kind: 'stop', stop: b, position: on(b.xy, 27) })),
    ]

    // The first-time guide: from the station, and from the bus stop, to the International Office.
    const office = stops.find((st) => st.key === FIRST_TIME.target)
    const uniStop = bus.stops.find((b) => b.key === 'uni')
    const guide =
      office && station
        ? {
            ...buildWalkRoutes(data.graph, project, station.xy, [{ key: 'office', xy: office.xy }]),
            fromStop: buildWalkRoutes(data.graph, project, uniStop.xy, [{ key: 'office', xy: office.xy }]).walks.office,
            anchor: { key: 'guide', kind: 'guide', position: [office.center[0], office.top * CHECKPOINT_STRETCH + 60, office.center[1]] },
          }
        : null

    const [w, s, e, n] = data.kit.bbox
    const [x0, y0] = project([w, s])
    const [x1, y1] = project([e, n])
    const margin = 400
    // start looking between the station and the middle of the campus, a little nearer the campus
    let cx = stops.reduce((a, st) => a + st.center[0], 0) / stops.length
    let cz = stops.reduce((a, st) => a + st.center[1], 0) / stops.length
    if (station) {
      cx = 0.6 * cx + 0.4 * station.center[0]
      cz = 0.6 * cz + 0.4 * station.center[1]
    }
    return {
      city: buildBuildings(city),
      streets: buildStreets(data.graph, project),
      groundSize: [x1 - x0 + 2 * margin, y1 - y0 + 2 * margin],
      stops,
      station,
      walk,
      bus,
      anchors,
      guide,
      start: [cx, 0, cz],
    }
  }, [data])

  const uses = useMemo(() => {
    if (!data) return []
    const counts = {}
    for (const f of data.buildings.features) {
      const use = f.properties.use ?? 'none' // one building has no use in the data
      counts[use] = (counts[use] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [data])

  const flyTo = useCallback(
    (key) => {
      const s = key === STATION.key ? scene?.station : scene?.stops.find((st) => st.key === key)
      if (s) setFocus({ target: [s.center[0], (s.top * CHECKPOINT_STRETCH) / 2, s.center[1]], distance: Math.max(380, s.extent * 5) })
    },
    [scene],
  )

  const onSelect = useCallback(
    (key) => {
      setSelected(key)
      flyTo(key)
      if (key === STATION.key || found.has(key)) return
      const next = new Set(found).add(key)
      setFound(next)
      saveProgress(next)
      setToast(
        next.size === STOPS.length
          ? { title: 'You found every building!', text: 'Rank unlocked: Bauhaus master' }
          : { title: 'New building discovered', text: `${STOP_BY_KEY[key].name} · ${next.size} of ${STOPS.length}` },
      )
    },
    [found, flyTo],
  )

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const onHover = useCallback((key, ev) => {
    document.body.style.cursor = key ? 'pointer' : ''
    setHover(key ? { key, x: ev.clientX, y: ev.clientY } : null)
  }, [])

  // A click on the ground starts a walk from there.
  const onPick = useCallback((point) => {
    setSelected(null)
    setTab('walk')
    if (!workerRef.current) return
    const id = ++lastId.current
    setBusy(true)
    setMessage(null)
    workerRef.current.postMessage({ type: 'reach', id, point })
  }, [])

  const onPickFromList = (key) => {
    flyTo(key)
    if (found.has(key)) setSelected(key)
    else setSelected(null) // the player still has to click the building itself
  }

  // The first-time guide: show the way from the station to the International Office.
  const openGuide = () => {
    setSelected(null)
    setTab('quest')
    setGuideOpen(true)
    const s = scene?.station
    const o = scene?.stops.find((st) => st.key === FIRST_TIME.target)
    if (s && o) {
      // look at the last part of the way, towards the office
      const t = 0.88
      const at = [s.center[0] + t * (o.center[0] - s.center[0]), 0, s.center[1] + t * (o.center[1] - s.center[1])]
      setFocus({ target: at, distance: 1100 })
    }
  }

  const resetProgress = () => {
    const empty = new Set()
    setFound(empty)
    saveProgress(empty)
    setSelected(null)
    setIntro(true)
  }

  const walks = scene?.walk.walks
  const station = useMemo(
    () => ({
      ...STATION,
      facts: [
        ...ROUTE_TARGETS.filter((k) => walks?.[k]).map(
          (k) => `By foot to ${STOP_BY_KEY[k].name}: about ${walks[k].minutes} min (${fmt(Math.round(walks[k].metres / 10) * 10)} m)`,
        ),
        `By bus: line ${BUS.line} ${BUS.direction} to the stop "Bauhaus-Universität" in Marienstraße, about ${BUS.minutes} min`,
        'By bus: lines 1, 5, 6, 7 and 8 to Goetheplatz, a short walk from the Coudraystraße campus',
        'By bus: line 1 to Wielandplatz / Steubenstraße for the University Library',
      ],
    }),
    [walks],
  )

  const nextHint = STOPS.find((s) => !found.has(s.key))
  const current = selected === STATION.key ? station : selected ? STOP_BY_KEY[selected] : null
  const hovered = hover ? STOP_BY_KEY[hover.key] : null
  const share = found.size / STOPS.length

  return (
    <div className="app">
      {scene && (
        <CityScene
          {...scene}
          guide={guideOpen ? scene.guide : null}
          anchors={guideOpen && scene.guide ? [...scene.anchors, scene.guide.anchor] : scene.anchors}
          colors={COLORS}
          found={found}
          selected={selected}
          hovered={hover?.key ?? null}
          focus={focus}
          reach={reach}
          labelRefs={labelRefs}
          onSelect={onSelect}
          onHover={onHover}
          onPick={onPick}
        />
      )}

      {(guideOpen && scene?.guide ? [...scene.anchors, scene.guide.anchor] : (scene?.anchors ?? [])).map((a) => (
        <div key={a.key} className="map-anchor" ref={(el) => (labelRefs.current[a.key] = el)}>
          {a.kind === 'start' && (
            <button className="start-label" onClick={() => onSelect(STATION.key)}>
              Start here
            </button>
          )}
          {a.kind === 'walk' && walks?.main && (
            <span className="route-label walk">
              <b>By foot</b> {walks.main.minutes} min
            </span>
          )}
          {a.kind === 'bus' && (
            <span className="route-label bus">
              <b>By bus</b> line {BUS.line} · {BUS.minutes} min
            </span>
          )}
          {a.kind === 'guide' && (
            <button className="route-label guide" onClick={() => setHoursShown((v) => !v)}>
              <b>International Office</b>
              {hoursShown ? (
                <span className="hours-line">
                  {FIRST_TIME.days}, {FIRST_TIME.hours}
                </span>
              ) : (
                <span className="hours-hint">opening hours ›</span>
              )}
            </button>
          )}
          {a.kind === 'stop' && (
            <span className="stop-label">
              <b>Bus</b> {a.stop.name} <i>{a.stop.lines}</i>
            </span>
          )}
        </div>
      ))}

      <aside className="panel quest">
        <p className="eyebrow">Bauhaus-Universität Weimar</p>
        <h1>Campus Quest</h1>
        {error && <p className="error">The city didn't load ({error}).</p>}
        {!error && !scene && <p className="hint">Switching on the lights…</p>}

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'quest'} className={tab === 'quest' ? 'on' : ''} onClick={() => setTab('quest')}>
            Quest {found.size}/{STOPS.length}
          </button>
          <button role="tab" aria-selected={tab === 'walk'} className={tab === 'walk' ? 'on' : ''} onClick={() => setTab('walk')}>
            Walking reach
          </button>
        </div>

        {tab === 'quest' && (
          <>
            <div className="progress">
              <div className="progress-row">
                <span className="rank">{rankFor(found.size)}</span>
                <span className="count">
                  {found.size} / {STOPS.length}
                </span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${share * 100}%` }} />
              </div>
              {nextHint && (
                <p className="next">
                  <span>Next clue:</span> {nextHint.hint}
                </p>
              )}
            </div>

            <button className="first-time" onClick={openGuide}>
              <b>First time in Weimar?</b>
              <span>Get to the International Office and enrol</span>
            </button>

            <button className="stop arrival" style={{ '--neon': ROUTE_COLOR }} onClick={() => onSelect(STATION.key)}>
              <span className="dot" />
              <span className="stop-text">
                <span className="stop-name">Start at the station</span>
                <span className="stop-sub">Green arrows on foot, orange arrows by bus</span>
              </span>
            </button>

            <ul className="stops">
              {STOPS.map((s) => {
                const isFound = found.has(s.key)
                return (
                  <li key={s.key}>
                    <button
                      className={`stop ${isFound ? 'found' : ''} ${selected === s.key ? 'active' : ''}`}
                      style={{ '--neon': COLORS[s.category] }}
                      onClick={() => onPickFromList(s.key)}
                      title={isFound ? `Fly to ${s.name}` : 'Fly there, then click the glowing building'}
                    >
                      <span className="dot" />
                      <span className="stop-text">
                        <span className="stop-name">{isFound ? s.name : '???'}</span>
                        <span className="stop-sub">{isFound ? s.address : s.hint}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button className="link" onClick={resetProgress}>
              Start again
            </button>
          </>
        )}

        {tab === 'walk' && (
          <>
            {scene && !workerReady && <p className="hint">Preparing the street network…</p>}
            {scene && workerReady && !reach && !busy && !message && (
              <p className="hint">Click anywhere on the ground to see how far you can walk from there.</p>
            )}
            {busy && <p className="hint">Walking…</p>}
            {message && <p className="warn">{message}</p>}

            <table className="results">
              <thead>
                <tr>
                  <th>Walk</th>
                  <th>Buildings</th>
                  <th>Residents</th>
                </tr>
              </thead>
              <tbody>
                {MINUTES.map((m, k) => {
                  const a = reach?.areas?.[k]
                  return (
                    <tr key={m}>
                      <td>
                        <span className="swatch" style={{ background: REACH_COLORS[k] }} />
                        {m} min
                      </td>
                      <td className="num">{a ? fmt(a.buildingCount) : '–'}</td>
                      <td className="num">
                        {a ? `about ${fmt(a.residents)}` : '–'}
                        {a && a.cellsWithout > 0 && (
                          <div className="note">
                            {a.cellsWithout} {a.cellsWithout === 1 ? 'cell' : 'cells'} without a figure left out
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {reach && (
              <button className="link" onClick={() => setReach(null)}>
                Clear the walk
              </button>
            )}

            <div className="method">
              <p>
                <strong>Walking</strong> at 4.8 km/h, which is 80 m per minute: 400 m in 5 minutes, 800 m in 10, 1200 m
                in 15.
              </p>
              <p>
                <strong>Buildings</strong> within 15 minutes of your click are shaded by their distance: blue right next
                to it, through violet, to pink at 15 minutes. Distance is measured in a straight line and ignores the
                streets, so real walks reach less far. A building counts for a time if any part of it is within that
                distance.
              </p>
              <p>
                <strong>Residents</strong> come from the Zensus 2022 grid of 100 m cells. For every cell that overlaps
                the area, its residents are multiplied by the share of the cell's area inside it. These are added up and
                rounded to the nearest 10.
              </p>
              <p>
                <strong>Cells without a published figure</strong> are left out of the sum, not counted as zero. Their
                number is shown under the count.
              </p>
            </div>
          </>
        )}
      </aside>

      {scene && (
        <aside className={`panel legend ${current || guideOpen ? 'hidden' : ''}`}>
          <h2>Glowing</h2>
          <ul className="cols">
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <li key={k} style={{ '--neon': c.color }}>
                <span className="dot" />
                {c.label}
              </li>
            ))}
            <li style={{ '--neon': ROUTE_COLOR }}>
              <span className="dot" />
              By foot from the station
            </li>
            <li style={{ '--neon': BUS_COLOR }}>
              <span className="dot" />
              By bus (line {BUS.line})
            </li>
          </ul>
          <h2>Main use</h2>
          <ul className="cols">
            {uses.map(([use]) => (
              <li key={use}>
                <span className="swatch" style={{ background: USE_COLORS[use] ?? FALLBACK_USE_COLOR }} />
                {useLabel(use)}
              </li>
            ))}
          </ul>
          <h2>Reached on foot</h2>
          <div className="gradient-key">
            <span className="gradient-bar" style={{ background: `linear-gradient(90deg, ${REACH_GRADIENT.join(', ')})` }} />
            <span className="gradient-ticks">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15 min</span>
            </span>
          </div>
          <p className="controls">Drag to orbit · right-drag to pan · scroll to zoom</p>
        </aside>
      )}

      {guideOpen && !current && scene?.guide && (
        <article className="panel card guide-card" style={{ '--neon': GUIDE_COLOR }}>
          <button className="close" onClick={() => setGuideOpen(false)} aria-label="Close">
            ×
          </button>
          <div className="chips">
            <span className="chip">First time in Weimar</span>
          </div>
          <h2>Get enrolled</h2>
          <p>Your first stop is the International Office, opposite the main building.</p>
          <ol className="steps">
            <li>
              <b>Arrive at Weimar Hauptbahnhof.</b> Look for the green "Start here" sign.
            </li>
            <li>
              <b>Take bus line {BUS.line}</b> {BUS.direction} to the stop "Bauhaus-Universität" in Marienstraße, about{' '}
              {BUS.minutes} min. From the stop it's about {Math.max(1, scene.guide.fromStop.minutes)} min on foot.
              <br />
              <span className="or">or</span> <b>walk</b> about {scene.guide.walks.office.minutes} min (
              {fmt(Math.round(scene.guide.walks.office.metres / 10) * 10)} m) along the pale gold arrows.
            </li>
            <li>
              <b>International Office & Campus.Office</b>, Geschwister-Scholl-Straße 15, opposite the main building.
            </li>
          </ol>
          <p className="hours">
            Open <b>{FIRST_TIME.days}, {FIRST_TIME.hours}</b>: go there in that time to get your enrolment.
          </p>
          <button className="start" onClick={() => onSelect(FIRST_TIME.target)}>
            Show me the International Office
          </button>
        </article>
      )}

      {current && (
        <article className="panel card" style={{ '--neon': COLORS[current.category] }}>
          <button className="close" onClick={() => setSelected(null)} aria-label="Close">
            ×
          </button>
          <div className="chips">
            <span className="chip">{current.category === 'arrival' ? 'Start here' : CATEGORIES[current.category].label}</span>
            {current.unesco && <span className="chip gold">UNESCO World Heritage</span>}
          </div>
          <h2>{current.name}</h2>
          {current.alias && <p className="alias">{current.alias}</p>}
          <p className="address">{current.address}</p>
          <p>{current.about}</p>
          <h3>Inside</h3>
          <p>{current.inside}</p>
          <h3>{current.category === 'arrival' ? 'Walking from here' : 'Good to know'}</h3>
          <ul className="facts">
            {current.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </article>
      )}

      {hovered && hover && (
        <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14, '--neon': COLORS[hovered.category] }}>
          {hovered.key === STATION.key || found.has(hovered.key) ? hovered.name : 'Unknown building · click to discover'}
        </div>
      )}

      {toast && (
        <div className="toast" key={toast.title + toast.text}>
          <strong>{toast.title}</strong>
          <span>{toast.text}</span>
        </div>
      )}

      {intro && (
        <div className="intro">
          <div className="intro-box">
            <p className="eyebrow">Welcome to Weimar</p>
            <h2>Find your university</h2>
            <p>
              The Bauhaus-Universität is spread across the old town. Tonight its {STOPS.length} buildings are glowing in
              neon. Find them all before your first lecture.
            </p>
            <ul>
              <li>
                <strong>Start at the station</strong> and follow the green arrows to campus.
              </li>
              <li>
                <strong>Click a glowing building</strong> or a spinning diamond to discover it and read what's inside.
              </li>
              <li>
                <strong>Click the ground</strong> to see how far you can walk from there in 5, 10 and 15 minutes.
              </li>
            </ul>
            <button className="start" onClick={() => setIntro(false)}>
              Start exploring
            </button>
            <button
              className="start first"
              onClick={() => {
                setIntro(false)
                openGuide()
              }}
            >
              First time in Weimar? Get enrolled
            </button>
          </div>
        </div>
      )}

      <footer className="attribution">
        {ATTRIBUTION} {CAMPUS_CREDIT}
      </footer>
    </div>
  )
}

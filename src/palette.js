// Colours for Weimar at night. The uses are muted, so only the neon campus, the station
// and the routes glow. The neon colours of the campus are in campus.js.

export const USE_COLORS = {
  residential: '#6e6656',
  undefined: '#55565c',
  service: '#566170',
  education: '#4f627a',
  civic: '#4d6c63',
  entertainment: '#715f4b',
  retail: '#7b6b40',
  food_and_drink: '#7a5f47',
  office: '#4c5869',
  health: '#5b7151',
  accommodation: '#6c6650',
  culture: '#6d5a56',
  sport: '#567149',
  transport: '#55595f',
  light_industrial: '#5b5a4f',
}
export const FALLBACK_USE_COLOR = '#55565c'

// The walking reach: buildings are shaded from blue (right by the click) through violet to pink
// (15 minutes away). Kept below glow strength.
export const REACH_GRADIENT = ['#4a63e8', '#9b5ce0', '#e45bb4']
export const REACH_MAX_M = 1200 // 15 minutes at 80 m per minute

// The gradient colour at t from 0 (the click) to 1 (15 minutes), as a CSS hex string.
export function reachColorAt(t) {
  const stops = REACH_GRADIENT.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1)
  const i = Math.min(Math.floor(x), stops.length - 2)
  const f = x - i
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

// The colour shown for 5, 10 and 15 minutes in the table and legend.
export const REACH_COLORS = [5, 10, 15].map((m) => reachColorAt(m / 15))

// The station and the routes from it: green on foot, orange by bus.
export const ROUTE_COLOR = '#b6ff3c'
export const BUS_COLOR = '#ff8a1f'
// The first-time guide to the International Office.
export const GUIDE_COLOR = '#fff3b0'

export const BACKGROUND_COLOR = '#070914'
export const GROUND_COLOR = '#0d1122'
export const STREET_COLOR = '#2c3561'

export function useLabel(use) {
  if (use === 'undefined') return 'Unknown use'
  if (use === 'none') return 'No use given'
  const s = use.replace(/_/g, ' ')
  return s[0].toUpperCase() + s.slice(1)
}

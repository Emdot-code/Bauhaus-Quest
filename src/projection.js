// A local flat projection around the kit centre, in metres: x to the east, y to the north.
// Over 2 km the error is a few centimetres, far below anything shown on screen.
export function makeProjection([lon0, lat0]) {
  const phi = (lat0 * Math.PI) / 180
  const mPerDegLat = 111132.954 - 559.822 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi)
  const mPerDegLon = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi)
  return ([lon, lat]) => [(lon - lon0) * mPerDegLon, (lat - lat0) * mPerDegLat]
}

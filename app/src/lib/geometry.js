/* geometría de zonas — portada tal cual del app clásico (probada en campo) */

export function centroid(pts) {
  let x = 0, y = 0
  pts.forEach(p => { x += p[0]; y += p[1] })
  return [x / pts.length, y / pts.length]
}

/* point-in-polygon por ray casting */
export function pip(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (((pts[i][1] > y) !== (pts[j][1] > y)) &&
        (x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0])) {
      inside = !inside
    }
  }
  return inside
}

export function zoneOf(p, zones) {
  if (!p || p.x == null || p.y == null || !zones) return null
  return zones.find(z => z.points && z.points.length >= 3 && pip(p.x, p.y, z.points)) || null
}

export function zoneBBox(z) {
  const xs = z.points.map(p => p[0]), ys = z.points.map(p => p[1])
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  }
}

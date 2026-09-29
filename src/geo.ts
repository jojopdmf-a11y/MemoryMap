/**
 * Antimeridian / Pacific helpers.
 *
 * Leaflet draws polylines in raw lat/lng space. A hop from Vancouver (~-123)
 * to Petropavlovsk (~158) spans +281°, so the line crosses the Americas and
 * Atlantic — the long way — instead of the Pacific. Unwrapping keeps each
 * successive longitude within ±180° of the previous so short ocean hops stay
 * short. We then shift the whole path so its midpoint sits near lng 0 — that
 * keeps Asia left / Americas right for Pacific cruises while staying on the
 * main world copy, so zoom/pan cannot orphan markers at lng -220.
 */

export type LngPoint = { lat: number; lng: number }

/** Shift lng by ±360 until it sits within ±180° of `relativeTo`. */
export function unwrapLng(lng: number, relativeTo: number): number {
  let value = lng
  while (value - relativeTo > 180) value -= 360
  while (value - relativeTo < -180) value += 360
  return value
}

/** Unwrap a sequence of stops so consecutive hops take the short path. */
export function unwrapLngPath<T extends LngPoint>(points: T[]): T[] {
  if (points.length === 0) return []
  const out: T[] = [{ ...points[0] }]
  for (let i = 1; i < points.length; i++) {
    const prev = out[i - 1].lng
    out.push({ ...points[i], lng: unwrapLng(points[i].lng, prev) })
  }
  return out
}

/**
 * Unwrap hops, then slide the path so its longitude midpoint is ~0.
 * Relative shape is unchanged; markers stay on Leaflet’s primary world copy.
 */
export function normalizeLngPath<T extends LngPoint>(points: T[]): T[] {
  const unwrapped = unwrapLngPath(points)
  if (unwrapped.length === 0) return []
  if (unwrapped.length === 1) {
    let lng = unwrapped[0].lng
    while (lng > 180) lng -= 360
    while (lng < -180) lng += 360
    return [{ ...unwrapped[0], lng }]
  }
  const lngs = unwrapped.map((p) => p.lng)
  const mid = (Math.min(...lngs) + Math.max(...lngs)) / 2
  return unwrapped.map((p) => ({ ...p, lng: p.lng - mid }))
}

/** Unwrap [lat, lng] tuples the same way. */
export function unwrapLngLatLngs(
  points: Array<[number, number]>,
): Array<[number, number]> {
  if (points.length === 0) return []
  const out: Array<[number, number]> = [[points[0][0], points[0][1]]]
  for (let i = 1; i < points.length; i++) {
    out.push([points[i][0], unwrapLng(points[i][1], out[i - 1][1])])
  }
  return out
}

/**
 * Unwrap a road/OSRM leg so it continues from an already-unwrapped start.
 * The first point is anchored near `fromLng`; later points follow short hops.
 */
export function unwrapLngLeg(
  fromLng: number,
  leg: Array<[number, number]>,
): Array<[number, number]> {
  if (leg.length === 0) return []
  const out: Array<[number, number]> = [
    [leg[0][0], unwrapLng(leg[0][1], fromLng)],
  ]
  for (let i = 1; i < leg.length; i++) {
    out.push([leg[i][0], unwrapLng(leg[i][1], out[i - 1][1])])
  }
  return out
}

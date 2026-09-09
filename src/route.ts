export type LatLng = [number, number]

const BATCH = 40
const memory = new Map<string, LatLng[]>()

function key(from: LatLng, to: LatLng): string {
  return `${from[0].toFixed(5)},${from[1].toFixed(5)}:${to[0].toFixed(5)},${to[1].toFixed(5)}`
}

function straight(from: LatLng, to: LatLng): LatLng[] {
  return [from, to]
}

export function pathThroughStops(
  stops: Array<{ lat: number; lng: number }>,
  revealed: number,
  roads: LatLng[][] | null,
): LatLng[] {
  const count = Math.max(0, Math.min(revealed, stops.length))
  if (count < 2) return []
  if (!roads) {
    return stops.slice(0, count).map((stop) => [stop.lat, stop.lng])
  }
  const out: LatLng[] = []
  for (let i = 0; i < count - 1; i += 1) {
    const stop = stops[i]
    const next = stops[i + 1]
    const leg = roads[i]
    const fallback =
      stop && next ? straight([stop.lat, stop.lng], [next.lat, next.lng]) : null
    const use = leg && leg.length >= 2 ? leg : fallback
    if (!use) continue
    if (out.length === 0) out.push(...use)
    else out.push(...use.slice(1))
  }
  return out
}

export async function traceDriveLegs(
  stops: Array<{ lat: number; lng: number }>,
  signal?: AbortSignal,
): Promise<LatLng[][]> {
  if (stops.length < 2) return []
  const pairs = stops.slice(0, -1).map((stop, i) => {
    const next = stops[i + 1]
    return {
      from: [stop.lat, stop.lng] as LatLng,
      to: [next.lat, next.lng] as LatLng,
    }
  })
  const missing = pairs.filter((pair) => !memory.has(key(pair.from, pair.to)))
  for (let i = 0; i < missing.length; i += BATCH) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const slice = missing.slice(i, i + BATCH)
    const res = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legs: slice }),
      signal,
    })
    if (!res.ok) continue
    const data = (await res.json()) as { legs?: Array<LatLng[] | null> }
    slice.forEach((pair, index) => {
      const leg = data.legs?.[index]
      if (leg && leg.length >= 2) memory.set(key(pair.from, pair.to), leg)
    })
  }
  return pairs.map((pair) => {
    const hit = memory.get(key(pair.from, pair.to))
    return hit && hit.length >= 2 ? hit : straight(pair.from, pair.to)
  })
}

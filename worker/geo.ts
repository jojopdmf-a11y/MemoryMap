const UA = 'MemoryMap/1.0 (https://memorymap.world; hello@memorymap.world)'
const PHOTON = 'https://photon.komoot.io/api/'
const OSRM = 'https://router.project-osrm.org/route/v1/driving'
const MAX_LEGS = 40
const MAX_SUGGEST = 80
const SIMPLIFY = 0.000025

type SuggestHit = { lat: number; lng: number; label: string }

const memory = new Map<string, { exp: number; body: string }>()

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5
}

function cacheKey(kind: string, value: string): Request {
  return new Request(
    `https://memorymap.world/cache/${kind}/${encodeURIComponent(value)}`,
  )
}

function edgeCache(): Cache | null {
  try {
    const stores = globalThis as typeof globalThis & { caches?: { default?: Cache } }
    return stores.caches?.default ?? null
  } catch {
    return null
  }
}

async function cachedJson(
  key: string,
  ttl: number,
  load: () => Promise<unknown>,
): Promise<Response> {
  const req = cacheKey('geo', key)
  const edge = edgeCache()
  if (edge) {
    const hit = await edge.match(req)
    if (hit) return hit
  } else {
    const row = memory.get(key)
    if (row && row.exp > Date.now()) {
      return new Response(row.body, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    }
  }
  const data = await load()
  const body = JSON.stringify(data)
  const res = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${ttl}`,
    },
  })
  if (edge) {
    try {
      await edge.put(req, res.clone())
    } catch {
      /* Cache API can reject in some runtimes; the response still works. */
    }
  } else {
    memory.set(key, { exp: Date.now() + ttl * 1000, body })
  }
  return res
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
  }
}

function photonLabel(props: PhotonFeature['properties'], fallback: string): string {
  if (!props) return fallback
  const street = [props.housenumber, props.street].filter(Boolean).join(' ').trim()
  const bits = [street || props.name, props.city, props.state, props.country].filter(
    Boolean,
  )
  return bits.join(', ') || fallback
}

function simplify(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length <= 2) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return points
  let max = 0
  let idx = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i]
    if (!p) continue
    const d = perpendicular(p, first, last)
    if (d > max) {
      max = d
      idx = i
    }
  }
  if (max < epsilon) return [first, last]
  const left = simplify(points.slice(0, idx + 1), epsilon)
  const right = simplify(points.slice(idx), epsilon)
  return left.slice(0, -1).concat(right)
}

function perpendicular(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[1] - a[1]
  const dy = b[0] - a[0]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) {
    const ey = p[0] - a[0]
    const ex = p[1] - a[1]
    return Math.sqrt(ey * ey + ex * ex)
  }
  const t = ((p[1] - a[1]) * dx + (p[0] - a[0]) * dy) / len2
  const lat = a[0] + t * dy
  const lng = a[1] + t * dx
  const ey = p[0] - lat
  const ex = p[1] - lng
  return Math.sqrt(ey * ey + ex * ex)
}

async function osrmLeg(
  from: [number, number],
  to: [number, number],
): Promise<[number, number][] | null> {
  const path = `${round5(from[1])},${round5(from[0])};${round5(to[1])},${round5(to[0])}`
  const url = `${OSRM}/${path}?overview=full&geometries=geojson`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    code?: string
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>
  }
  if (data.code !== 'Ok') return null
  const coords = data.routes?.[0]?.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const latlngs = coords.map((c) => [round5(c[1]), round5(c[0])] as [number, number])
  return simplify(latlngs, SIMPLIFY)
}

export async function handleGeo(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  if (url.pathname === '/api/suggest') {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
    if (request.method !== 'GET') return json({ error: 'Not found.' }, 404)
    const q = url.searchParams.get('q')?.trim() ?? ''
    if (q.length < 3 || q.length > MAX_SUGGEST) return json({ hits: [] })
    return cachedJson(`suggest:${q.toLowerCase()}`, 300, async () => {
      const photon = new URL(PHOTON)
      photon.searchParams.set('q', q)
      photon.searchParams.set('limit', '6')
      photon.searchParams.set('lang', 'en')
      const res = await fetch(photon, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return { hits: [] }
      const data = (await res.json()) as { features?: PhotonFeature[] }
      const hits: SuggestHit[] = []
      for (const feat of data.features ?? []) {
        const pair = feat.geometry?.coordinates
        if (!pair || pair.length < 2) continue
        const lng = pair[0]
        const lat = pair[1]
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        hits.push({
          lat: round5(lat),
          lng: round5(lng),
          label: photonLabel(feat.properties, q),
        })
      }
      return { hits }
    })
  }

  if (url.pathname !== '/api/route') return null
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Not found.' }, 404)
  let body: { legs?: Array<{ from?: number[]; to?: number[] }> }
  try {
    body = (await request.json()) as { legs?: Array<{ from?: number[]; to?: number[] }> }
  } catch {
    return json({ error: 'Could not read that route.' }, 400)
  }
  const incoming = body.legs ?? []
  if (incoming.length === 0 || incoming.length > MAX_LEGS) {
    return json({ error: 'That trip has too many legs to trace.' }, 400)
  }

  const jobs = incoming.map((item) => {
    const from = item.from
    const to = item.to
    if (
      !from ||
      !to ||
      from.length < 2 ||
      to.length < 2 ||
      !Number.isFinite(from[0]) ||
      !Number.isFinite(from[1]) ||
      !Number.isFinite(to[0]) ||
      !Number.isFinite(to[1])
    ) {
      return Promise.resolve(null)
    }
    const start: [number, number] = [from[0], from[1]]
    const end: [number, number] = [to[0], to[1]]
    return driveLeg(start, end)
  })
  const legs = await Promise.all(jobs)
  return json({ legs })
}

async function driveLeg(
  from: [number, number],
  to: [number, number],
): Promise<[number, number][] | null> {
  const key = `drive:${round5(from[0])},${round5(from[1])}:${round5(to[0])},${round5(to[1])}`
  const req = cacheKey('geo', key)
  const edge = edgeCache()
  if (edge) {
    const cached = await edge.match(req)
    if (cached) {
      const parsed = (await cached.json()) as { leg?: [number, number][] | null }
      return parsed.leg ?? null
    }
  } else {
    const row = memory.get(key)
    if (row && row.exp > Date.now()) {
      const parsed = JSON.parse(row.body) as { leg?: [number, number][] | null }
      return parsed.leg ?? null
    }
  }
  const leg = await osrmLeg(from, to)
  if (!leg) return null
  const body = JSON.stringify({ leg })
  if (edge) {
    try {
      await edge.put(
        req,
        new Response(body, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        }),
      )
    } catch {
      /* ignore cache write failures */
    }
  } else {
    memory.set(key, { exp: Date.now() + 86_400_000, body })
  }
  return leg
}

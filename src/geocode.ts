export type GeocodeHit = {
  lat: number
  lng: number
  label: string
  name: string
  state?: string
  country?: string
  kind?: 'city' | 'street' | 'house' | 'other'
  population?: number
}

export type SuggestBias = { lat: number; lng: number }

const OPEN_METEO = 'https://geocoding-api.open-meteo.com/v1/search'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

const memory = new Map<string, GeocodeHit[]>()

function looksLikeAddress(place: string): boolean {
  return /\d/.test(place)
}

function cacheKey(query: string, hint: string, bias?: SuggestBias): string {
  const b =
    bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lng)
      ? `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}`
      : ''
  return `${query.toLowerCase()}|${hint.toLowerCase()}|${b}`
}

function looksLikeQuery(hit: GeocodeHit, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const bits = [hit.name, hit.state, hit.country, hit.label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return bits.includes(q) || q.split(/\s+/).every((part) => bits.includes(part))
}

function rankHits(query: string, hint: string, hits: GeocodeHit[]): GeocodeHit[] {
  const q = query.trim().toLowerCase()
  const hintBits = hint
    .toLowerCase()
    .split(/[,\s]+/)
    .filter((part) => part.length > 1)
  const scored = hits.map((hit) => {
    const name = hit.name.toLowerCase()
    const label = hit.label.toLowerCase()
    let score = 0
    if (name === q) score += 18
    if (name.startsWith(q)) score += 28
    else if (name.split(/\s+/).some((word) => word.startsWith(q))) score += 16
    else if (label.includes(q)) score += 6
    if (hit.kind === 'city') score += 12
    if (hit.kind === 'house' && !looksLikeAddress(query)) score -= 20
    if (hit.kind === 'street' && !looksLikeAddress(query)) score -= 8
    const pop = hit.population ?? 0
    score += Math.log10(pop + 1) * 14
    for (const bit of hintBits) {
      if (hit.state?.toLowerCase().includes(bit) || hit.country?.toLowerCase().includes(bit)) {
        score += 32
      }
    }
    return { hit, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map((row) => row.hit)
}

function dedupe(hits: GeocodeHit[]): GeocodeHit[] {
  const seen = new Map<string, GeocodeHit>()
  for (const hit of hits) {
    const key = `${hit.name.toLowerCase()}|${(hit.state ?? '').toLowerCase()}|${hit.lat.toFixed(2)},${hit.lng.toFixed(2)}`
    const existing = seen.get(key)
    if (!existing || (hit.population ?? 0) > (existing.population ?? 0) || (!existing.state && hit.state)) {
      seen.set(key, hit)
    }
  }
  return [...seen.values()]
}

async function suggestOpenMeteo(place: string, signal?: AbortSignal): Promise<GeocodeHit[]> {
  const url = `${OPEN_METEO}?name=${encodeURIComponent(place)}&count=10&language=en&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const data = (await res.json()) as {
    results?: Array<{
      name?: string
      latitude: number
      longitude: number
      admin1?: string
      country?: string
      population?: number
    }>
  }
  const q = place.trim().toLowerCase()
  const hits: GeocodeHit[] = []
  for (const row of data.results ?? []) {
    const name = (row.name ?? '').trim()
    if (!name || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) continue
    const needle = name.toLowerCase()
    if (q && !needle.startsWith(q) && !needle.split(/\s+/).some((word) => word.startsWith(q))) {
      continue
    }
    hits.push({
      lat: row.latitude,
      lng: row.longitude,
      name,
      state: row.admin1,
      country: row.country,
      kind: 'city',
      population: row.population,
      label: [name, row.admin1, row.country].filter(Boolean).join(', '),
    })
  }
  return hits
}

async function suggestPhoton(
  place: string,
  opts: { bias?: SuggestBias; signal?: AbortSignal },
): Promise<GeocodeHit[]> {
  const params = new URLSearchParams({ q: place })
  if (opts.bias && Number.isFinite(opts.bias.lat) && Number.isFinite(opts.bias.lng)) {
    params.set('lat', String(opts.bias.lat))
    params.set('lng', String(opts.bias.lng))
  }
  const res = await fetch(`/api/suggest?${params}`, { signal: opts.signal })
  if (!res.ok) return []
  const data = (await res.json()) as { hits?: GeocodeHit[] }
  return (data.hits ?? []).filter(
    (hit) => Number.isFinite(hit.lat) && Number.isFinite(hit.lng) && hit.label && hit.name,
  )
}

export async function streamSuggestions(
  query: string,
  opts: {
    hint?: string
    bias?: SuggestBias
    signal?: AbortSignal
    onHits: (hits: GeocodeHit[]) => void
  },
): Promise<void> {
  const q = query.trim()
  const hint = opts.hint?.trim() ?? ''
  if (q.length < 2) {
    opts.onHits([])
    return
  }
  const key = cacheKey(q, hint, opts.bias)
  const cached = memory.get(key)
  let batch: GeocodeHit[] = cached ? [...cached] : []
  if (batch.length) opts.onHits(batch)

  const emit = (more: GeocodeHit[]) => {
    if (opts.signal?.aborted) return
    batch = rankHits(q, hint, dedupe([...batch, ...more]))
    memory.set(key, batch)
    opts.onHits(batch.slice(0, 8))
  }

  const photonQuery = [q, hint].filter(Boolean).join(', ')
  const jobs: Promise<void>[] = []
  if (!looksLikeAddress(q)) {
    jobs.push(
      suggestOpenMeteo(q, opts.signal)
        .then(emit)
        .catch(() => undefined),
    )
  }
  if (q.length >= 3) {
    jobs.push(
      suggestPhoton(photonQuery, { bias: opts.bias, signal: opts.signal })
        .then(emit)
        .catch(() => undefined),
    )
  }
  await Promise.allSettled(jobs)
}

let lastNominatimAt = 0

export async function suggestPlaces(
  place: string,
  signal?: AbortSignal,
): Promise<GeocodeHit[]> {
  let latest: GeocodeHit[] = []
  await streamSuggestions(place, {
    signal,
    onHits: (hits) => {
      latest = hits
    },
  })
  return latest
}

async function geocodeNominatim(place: string): Promise<GeocodeHit | null> {
  const wait = 1100 - (Date.now() - lastNominatimAt)
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
  lastNominatimAt = Date.now()
  const url = `${NOMINATIM}?q=${encodeURIComponent(place)}&format=jsonv2&limit=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{
    lat: string
    lon: string
    display_name?: string
    name?: string
    address?: { state?: string; country?: string }
  }>
  const first = data[0]
  if (!first) return null
  const lat = Number.parseFloat(first.lat)
  const lng = Number.parseFloat(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const label = first.display_name ?? place
  return {
    lat,
    lng,
    label,
    name: first.name ?? place,
    state: first.address?.state,
    country: first.address?.country,
    kind: 'other',
  }
}

async function geocodeOpenMeteo(place: string): Promise<GeocodeHit | null> {
  const hits = await suggestOpenMeteo(place)
  return hits[0] ?? null
}

export async function geocodePlace(place: string): Promise<GeocodeHit | null> {
  const query = place.trim()
  if (!query) return null
  try {
    if (looksLikeAddress(query)) {
      return (await suggestPlaces(query))[0] ?? (await geocodeNominatim(query))
    }
    const city = await geocodeOpenMeteo(query)
    if (city && hitOk(city, query)) return city
    return (await suggestPlaces(query))[0] ?? (await geocodeNominatim(query))
  } catch {
    return null
  }
}

function hitOk(hit: GeocodeHit | null, query: string): hit is GeocodeHit {
  if (!hit) return false
  const needle = query.toLowerCase()
  const label = hit.label.toLowerCase()
  const first = needle.split(/[,\s]+/)[0] ?? ''
  return !first || label.includes(first)
}

export function hitMatchesQuery(hit: GeocodeHit, query: string): boolean {
  return looksLikeQuery(hit, query)
}

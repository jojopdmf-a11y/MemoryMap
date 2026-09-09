export type GeocodeHit = {
  lat: number
  lng: number
  label: string
}

const OPEN_METEO = 'https://geocoding-api.open-meteo.com/v1/search'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

function looksLikeAddress(place: string): boolean {
  return /\d/.test(place) || place.includes(',')
}

async function geocodeOpenMeteo(place: string): Promise<GeocodeHit | null> {
  const url = `${OPEN_METEO}?name=${encodeURIComponent(place)}&count=1&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    results?: Array<{
      name?: string
      latitude: number
      longitude: number
      admin1?: string
      country?: string
    }>
  }
  const first = data.results?.[0]
  if (!first) return null
  return {
    lat: first.latitude,
    lng: first.longitude,
    label: [first.name, first.admin1, first.country].filter(Boolean).join(', '),
  }
}

let lastNominatimAt = 0

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
  }>
  const first = data[0]
  if (!first) return null
  const lat = Number.parseFloat(first.lat)
  const lng = Number.parseFloat(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, label: first.display_name ?? place }
}

async function geocodePhoton(place: string): Promise<GeocodeHit | null> {
  const hits = await suggestPlaces(place)
  return hits[0] ?? null
}

export async function suggestPlaces(
  place: string,
  signal?: AbortSignal,
): Promise<GeocodeHit[]> {
  const query = place.trim()
  if (query.length < 3) return []
  try {
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal })
    if (!res.ok) return []
    const data = (await res.json()) as { hits?: GeocodeHit[] }
    return (data.hits ?? []).filter(
      (hit) => Number.isFinite(hit.lat) && Number.isFinite(hit.lng) && hit.label,
    )
  } catch {
    return []
  }
}

export async function geocodePlace(place: string): Promise<GeocodeHit | null> {
  const query = place.trim()
  if (!query) return null
  try {
    if (looksLikeAddress(query)) {
      return (await geocodePhoton(query)) || (await geocodeNominatim(query))
    }
    const city = await geocodeOpenMeteo(query)
    if (hitOk(city, query)) return city
    return (await geocodePhoton(query)) || (await geocodeNominatim(query))
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

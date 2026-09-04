import { formatDate, stopLabel } from './csv'
import type { ExportStop, Stop } from './types'

export function exportableStops(stops: Stop[]): ExportStop[] {
  return stops
    .filter((stop) => !stop.dismissed && stop.lat != null && stop.lng != null)
    .map((stop) => ({
      title: stopLabel(stop),
      date: formatDate(stop.date, stop.dateRaw),
      place: stop.place,
      lat: stop.lat as number,
      lng: stop.lng as number,
      notes: stop.notes,
    }))
}

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'trip'
}

export function souvenirFilename(title: string): string {
  return `MemoryMap-${slugifyTitle(title)}.html`
}

export function dateRangeLabel(stops: ExportStop[]): string {
  const dates = stops.map((s) => s.date).filter(Boolean)
  if (dates.length === 0) return ''
  const first = dates[0]
  const last = dates[dates.length - 1]
  return first === last ? first : `${first} – ${last}`
}

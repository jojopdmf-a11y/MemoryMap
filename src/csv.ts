import Papa from 'papaparse'
import type { ParseResult, Stop, GeoStatus } from './types'

type FieldKey =
  | 'date'
  | 'lat'
  | 'lng'
  | 'place'
  | 'title'
  | 'notes'
  | 'city'
  | 'region'
  | 'country'
  | 'ship'

const FIELD_ALIASES: Record<string, FieldKey> = {
  date: 'date',
  when: 'date',
  day: 'date',
  arrival: 'date',
  arrived: 'date',
  arrivaldate: 'date',
  lat: 'lat',
  latitude: 'lat',
  lng: 'lng',
  lon: 'lng',
  long: 'lng',
  longitude: 'lng',
  place: 'place',
  location: 'place',
  address: 'place',
  port: 'place',
  portofcall: 'place',
  destination: 'place',
  city: 'city',
  town: 'city',
  state: 'region',
  province: 'region',
  region: 'region',
  country: 'country',
  title: 'title',
  name: 'title',
  label: 'title',
  stop: 'title',
  ship: 'ship',
  vessel: 'ship',
  show: 'ship',
  showship: 'ship',
  notes: 'notes',
  note: 'notes',
  description: 'notes',
  desc: 'notes',
  company: 'notes',
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function cell(row: Record<string, string>, key: string | undefined): string {
  if (!key) return ''
  return (row[key] ?? '').trim()
}

export function parseDate(raw: string): Date | null {
  const s = raw.trim()
  if (!s) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(d: Date | null, fallback = ''): string {
  if (!d) return fallback
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function displayDate(d: Date | null, fallback = ''): string {
  if (!d) return fallback
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function parseCoord(raw: string, kind: 'lat' | 'lng'): number | null {
  if (!raw.trim()) return null
  const n = Number.parseFloat(raw.replace(/,/g, ''))
  if (!Number.isFinite(n)) return null
  if (kind === 'lat' && (n < -90 || n > 90)) return null
  if (kind === 'lng' && (n < -180 || n > 180)) return null
  return n
}

function initialStatus(
  lat: number | null,
  lng: number | null,
  place: string,
): GeoStatus {
  if (lat != null && lng != null) return 'coords'
  if (place) return 'pending'
  return 'missing'
}

export function titleFromFilename(name: string): string {
  const base = name
    .replace(/\.(csv|tsv|xlsx|xls|ods)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  if (!base) return 'Untitled trip'
  return base.replace(/\b\w/g, (c) => c.toUpperCase())
}

export type ManualStopDraft = {
  date: string
  city: string
  state: string
  country: string
}

export function emptyManualStop(): ManualStopDraft {
  return { date: '', city: '', state: '', country: '' }
}

export function filledManualStops(rows: ManualStopDraft[]): ManualStopDraft[] {
  return rows.filter((row) =>
    [row.date, row.city, row.state, row.country].some((value) => value.trim() !== ''),
  )
}

export function manualStopsToCsv(rows: ManualStopDraft[]): string {
  const filled = filledManualStops(rows).map((row) => ({
    date: row.date.trim(),
    city: row.city.trim(),
    state: row.state.trim(),
    country: row.country.trim(),
  }))
  return Papa.unparse({
    fields: ['date', 'city', 'state', 'country'],
    data: filled.map((row) => [row.date, row.city, row.state, row.country]),
  })
}

export function createBlankStop(sourceRow: number): Stop {
  return {
    id: `stop-${sourceRow}-${Math.random().toString(36).slice(2, 8)}`,
    sourceRow,
    title: '',
    dateRaw: '',
    date: null,
    place: '',
    lat: null,
    lng: null,
    notes: '',
    status: 'missing',
    dismissed: false,
  }
}

function mapHeaders(headers: string[]): Partial<Record<FieldKey, string>> {
  const mapped: Partial<Record<FieldKey, string>> = {}
  for (const header of headers) {
    const alias = FIELD_ALIASES[normalizeHeader(header)]
    if (alias && mapped[alias] == null) mapped[alias] = header
  }
  return mapped
}

function composedPlace(
  row: Record<string, string>,
  fields: Partial<Record<FieldKey, string>>,
): string {
  const explicit = cell(row, fields.place)
  const city = cell(row, fields.city)
  const region = cell(row, fields.region)
  const country = cell(row, fields.country)
  if (explicit && !city) return explicit
  const joined = [explicit || city, region, country].filter(Boolean).join(', ')
  return joined || explicit
}

export function parseCsv(text: string): ParseResult {
  const stripped = text.replace(/^\uFEFF/, '').trim()
  if (!stripped) {
    return { ok: false, error: 'This file is empty. Add a header row and at least one stop.' }
  }

  const parsed = Papa.parse<Record<string, string>>(stripped, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })

  const headers = parsed.meta.fields?.filter(Boolean) ?? []
  if (headers.length === 0) {
    return {
      ok: false,
      error:
        'Could not read column headers. Use a CSV with a first row like title, date, place, lat, lng.',
    }
  }

  const fields = mapHeaders(headers)
  if (
    !fields.date &&
    !fields.place &&
    !fields.city &&
    !fields.lat &&
    !fields.lng
  ) {
    return {
      ok: false,
      error:
        'Could not find location or date columns. Use headers such as date, place, city, lat, lng (title and notes are optional).',
    }
  }

  const rows = parsed.data.filter((row) =>
    Object.values(row).some((value) => String(value ?? '').trim() !== ''),
  )

  if (rows.length === 0) {
    return { ok: false, error: 'This spreadsheet has headers but no stop rows.' }
  }

  const stops: Stop[] = rows.map((row, index) => {
    const dateRaw = cell(row, fields.date)
    const place = composedPlace(row, fields)
    const title = cell(row, fields.title) || cell(row, fields.ship)
    const notes = cell(row, fields.notes)
    const lat = parseCoord(cell(row, fields.lat), 'lat')
    const lng = parseCoord(cell(row, fields.lng), 'lng')
    const bothCoords = lat != null && lng != null
    return {
      id: `stop-${index}-${Math.random().toString(36).slice(2, 8)}`,
      sourceRow: index + 2,
      title,
      dateRaw,
      date: parseDate(dateRaw),
      place,
      lat: bothCoords ? lat : null,
      lng: bothCoords ? lng : null,
      notes,
      status: initialStatus(bothCoords ? lat : null, bothCoords ? lng : null, place),
      dismissed: false,
    }
  })

  stops.sort((a, b) => {
    if (a.date && b.date) return a.date.getTime() - b.date.getTime()
    if (a.date) return -1
    if (b.date) return 1
    return a.sourceRow - b.sourceRow
  })

  return { ok: true, stops }
}

export function stopLabel(stop: Stop): string {
  return stop.title || stop.place || `Stop ${stop.sourceRow}`
}

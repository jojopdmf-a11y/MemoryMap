export type MapId = 'streets' | 'paper' | 'night' | 'satellite' | 'terrain'
export type PinId = 'number' | 'pin' | 'dot'
export type PathId = 'solid' | 'dashed' | 'none'
export type ThemeId = 'cream' | 'ink' | 'dusk'

export type CardField = 'title' | 'date' | 'place' | 'notes'

export type CardFields = Record<CardField, boolean>

export const DEFAULT_FIELDS: CardFields = {
  title: true,
  date: true,
  place: true,
  notes: true,
}

export type Look = {
  map: MapId
  pin: PinId
  path: PathId
  pinColor: string
  pathColor: string
  speedMs: number
  theme: ThemeId
  fields: CardFields
}

export const DEFAULT_LOOK: Look = {
  map: 'paper',
  pin: 'number',
  path: 'solid',
  pinColor: '#8b3a2a',
  pathColor: '#8b3a2a',
  speedMs: 1500,
  theme: 'cream',
  fields: { ...DEFAULT_FIELDS },
}

export type ThemeVars = {
  paper: string
  ink: string
  muted: string
  terra: string
  line: string
  mapBg: string
}

export const THEME_VARS: Record<ThemeId, ThemeVars> = {
  cream: {
    paper: '#f4efe6',
    ink: '#2c2416',
    muted: '#6d6254',
    terra: '#8b3a2a',
    line: 'rgba(44, 36, 22, 0.12)',
    mapBg: '#e4ddd0',
  },
  ink: {
    paper: '#161410',
    ink: '#f3eadc',
    muted: '#b8ad9c',
    terra: '#d4785c',
    line: 'rgba(243, 234, 220, 0.14)',
    mapBg: '#1c1a16',
  },
  dusk: {
    paper: '#1a1624',
    ink: '#ece6f4',
    muted: '#a89bb8',
    terra: '#e08a6a',
    line: 'rgba(236, 230, 244, 0.12)',
    mapBg: '#121018',
  },
}

export const MAP_OPTIONS: Array<{ id: MapId; label: string }> = [
  { id: 'paper', label: 'Paper' },
  { id: 'streets', label: 'Streets' },
  { id: 'night', label: 'Night' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
]

export const PIN_OPTIONS: Array<{ id: PinId; label: string }> = [
  { id: 'number', label: 'Numbered' },
  { id: 'pin', label: 'Pin' },
  { id: 'dot', label: 'Dot' },
]

export const PATH_OPTIONS: Array<{ id: PathId; label: string }> = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'none', label: 'None' },
]

export const SPEED_OPTIONS: Array<{ ms: number; label: string }> = [
  { ms: 400, label: 'Fast' },
  { ms: 800, label: 'Brisk' },
  { ms: 1500, label: 'Steady' },
  { ms: 2500, label: 'Leisurely' },
  { ms: 4000, label: 'Slow' },
]

export const THEME_OPTIONS: Array<{ id: ThemeId; label: string }> = [
  { id: 'cream', label: 'Cream' },
  { id: 'ink', label: 'Ink' },
  { id: 'dusk', label: 'Dusk' },
]

export function fieldOn(fields: Partial<CardFields> | undefined, key: CardField): boolean {
  return fields?.[key] !== false
}

export function pinLabelText(
  stop: { title: string; date: string; place: string; notes: string },
  fields: Partial<CardFields> | undefined,
): string {
  const bits: string[] = []
  if (fieldOn(fields, 'title') && stop.title.trim()) bits.push(stop.title.trim())
  if (fieldOn(fields, 'place') && stop.place.trim() && !bits.includes(stop.place.trim())) {
    bits.push(stop.place.trim())
  }
  if (fieldOn(fields, 'date') && stop.date.trim()) bits.push(stop.date.trim())
  if (fieldOn(fields, 'notes') && stop.notes.trim()) bits.push(stop.notes.trim())
  return bits.join(' · ')
}

export function popupInnerHtml(
  stop: { title: string; date: string; place: string; notes: string },
  fields: Partial<CardFields> | undefined,
  escape: (value: string) => string,
): string {
  const heading =
    fieldOn(fields, 'title') && stop.title
      ? stop.title
      : fieldOn(fields, 'place') && stop.place
        ? stop.place
        : ''
  const parts: string[] = []
  if (heading) parts.push(`<strong>${escape(heading)}</strong>`)
  const meta = [
    fieldOn(fields, 'date') ? stop.date : '',
    fieldOn(fields, 'place') && stop.place !== heading ? stop.place : '',
  ].filter(Boolean)
  if (meta.length) parts.push(`<p>${escape(meta.join(' · '))}</p>`)
  if (fieldOn(fields, 'notes') && stop.notes) {
    parts.push(`<p>${escape(stop.notes)}</p>`)
  }
  return parts.join('')
}

export const TILES: Record<
  MapId,
  { url: string; attribution: string; subdomains?: string }
> = {
  streets: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  paper: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  night: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; OpenStreetMap, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: 'abc',
  },
}

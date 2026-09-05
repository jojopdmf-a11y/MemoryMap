export type MapId = 'streets' | 'paper' | 'night' | 'satellite' | 'terrain'
export type PinId = 'number' | 'pin' | 'dot'
export type PathId = 'solid' | 'dashed' | 'none'
export type ThemeId = 'cream' | 'ink' | 'dusk' | 'blush' | 'lilac' | 'pearl'

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
  pinColor: '#1f7a6a',
  pathColor: '#1f7a6a',
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
    paper: '#eef5f2',
    ink: '#16302c',
    muted: '#5b706c',
    terra: '#1f7a6a',
    line: 'rgba(22, 48, 44, 0.1)',
    mapBg: '#d7e6e0',
  },
  ink: {
    paper: '#10201f',
    ink: '#e6f2ee',
    muted: '#9bb5af',
    terra: '#5ec4b0',
    line: 'rgba(230, 242, 238, 0.12)',
    mapBg: '#0c1918',
  },
  dusk: {
    paper: '#121a28',
    ink: '#e8eef8',
    muted: '#9aabc4',
    terra: '#5b9fd4',
    line: 'rgba(232, 238, 248, 0.12)',
    mapBg: '#0e1520',
  },
  blush: {
    paper: '#f7eef1',
    ink: '#3d2a32',
    muted: '#8a6d76',
    terra: '#c45b7a',
    line: 'rgba(61, 42, 50, 0.1)',
    mapBg: '#eadde1',
  },
  lilac: {
    paper: '#f3eef8',
    ink: '#2e2440',
    muted: '#7a6e8c',
    terra: '#8b6bb5',
    line: 'rgba(46, 36, 64, 0.1)',
    mapBg: '#e4dceb',
  },
  pearl: {
    paper: '#f7f1ea',
    ink: '#3a2e28',
    muted: '#8a7a70',
    terra: '#c48a7a',
    line: 'rgba(58, 46, 40, 0.1)',
    mapBg: '#ebe3d8',
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
  { id: 'cream', label: 'Mist' },
  { id: 'ink', label: 'Harbor' },
  { id: 'dusk', label: 'Tide' },
  { id: 'blush', label: 'Rose' },
  { id: 'lilac', label: 'Lilac' },
  { id: 'pearl', label: 'Pearl' },
]

export const MARKER_COLORS = [
  '#1f7a6a',
  '#2a6f8f',
  '#3d6b4f',
  '#5b9fd4',
  '#c45b7a',
  '#d4788c',
  '#8b6bb5',
  '#c97b5a',
  '#c4a35a',
  '#8b3a2a',
  '#2c2416',
  '#eef5f2',
] as const

/** Keep a stop label up through the next two arrivals, then fade it. */
export const LABEL_HOLD_AFTER = 2

export type LabelTone = 'active' | 'visible' | 'fading'

export function labelTone(index: number, revealed: number): LabelTone {
  const age = revealed - (index + 1)
  if (age <= 0) return 'active'
  if (age < LABEL_HOLD_AFTER) return 'visible'
  return 'fading'
}

export function labelClassName(index: number, revealed: number): string {
  const tone = labelTone(index, revealed)
  if (tone === 'active') return 'mm-label is-active'
  if (tone === 'fading') return 'mm-label is-fading'
  return 'mm-label'
}

export function labelFillAlpha(tone: LabelTone): number {
  if (tone === 'active') return 0.72
  return 0.5
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

export function pinFill(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(31, 122, 106, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export function pinInk(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#eef5f2'
  const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
  return lum > 0.62 ? '#16302c' : '#eef5f2'
}

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

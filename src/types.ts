export type GeoStatus =
  | 'coords'
  | 'geocoded'
  | 'pending'
  | 'failed'
  | 'missing'

export type Stop = {
  id: string
  sourceRow: number
  title: string
  date: Date | null
  dateRaw: string
  place: string
  lat: number | null
  lng: number | null
  notes: string
  status: GeoStatus
  dismissed: boolean
}

export type ExportStop = {
  title: string
  date: string
  place: string
  lat: number
  lng: number
  notes: string
}

export type ParseSuccess = {
  ok: true
  stops: Stop[]
}

export type ParseFailure = {
  ok: false
  error: string
}

export type ParseResult = ParseSuccess | ParseFailure

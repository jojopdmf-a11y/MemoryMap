import { parseCsv } from './csv'

export type SheetChoice = {
  name: string
  csv: string
  stopCount: number
}

export type IngestResult =
  | { kind: 'csv'; csv: string; title: string }
  | { kind: 'sheets'; title: string; sheets: SheetChoice[] }

const EXCEL_EXT = /\.(xlsx|xls|ods)$/i
const TEXT_EXT = /\.(csv|tsv|txt)$/i
const NUMBERS_EXT = /\.numbers$/i

export function parseGoogleSheetsUrl(
  url: string,
): { id: string; gid: string } | null {
  const trimmed = url.trim()
  const idMatch = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed)
  if (!idMatch) return null
  const gidMatch = /[?&#]gid=([0-9]+)/.exec(trimmed)
  return { id: idMatch[1], gid: gidMatch?.[1] ?? '0' }
}

export function looksLikeGoogleSheetsUrl(value: string): boolean {
  return parseGoogleSheetsUrl(value) != null
}

async function workbookToSheets(buffer: ArrayBuffer): Promise<SheetChoice[]> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheets: SheetChoice[] = []
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const csv = XLSX.utils.sheet_to_csv(sheet, { dateNF: 'yyyy-mm-dd' })
    const parsed = parseCsv(csv)
    if (parsed.ok && parsed.stops.length > 0) {
      sheets.push({ name, csv, stopCount: parsed.stops.length })
    }
  }
  return sheets
}

function ingestFromSheets(title: string, sheets: SheetChoice[]): IngestResult {
  if (sheets.length === 0) {
    throw new Error(
      'Found a spreadsheet, but no tab had date or place columns. Use headers like date, city, place, or arrival.',
    )
  }
  if (sheets.length === 1) {
    return { kind: 'csv', csv: sheets[0].csv, title: sheets[0].name || title }
  }
  return { kind: 'sheets', title, sheets }
}

export async function ingestFile(file: File): Promise<IngestResult> {
  const name = file.name || 'spreadsheet'
  if (NUMBERS_EXT.test(name)) {
    throw new Error(
      'Numbers files need an export first. In Numbers, choose File → Export To → Excel or CSV, then drop that file here.',
    )
  }

  if (EXCEL_EXT.test(name) || /spreadsheet|excel/i.test(file.type)) {
    const buffer = await file.arrayBuffer()
    const sheets = await workbookToSheets(buffer)
    return ingestFromSheets(name.replace(EXCEL_EXT, ''), sheets)
  }

  if (TEXT_EXT.test(name) || file.type.includes('csv') || file.type.includes('text')) {
    const csv = await file.text()
    return { kind: 'csv', csv, title: name }
  }

  const buffer = await file.arrayBuffer()
  try {
    const sheets = await workbookToSheets(buffer)
    if (sheets.length > 0) return ingestFromSheets(name, sheets)
  } catch {
    // Fall through to text.
  }
  const csv = await file.text()
  return { kind: 'csv', csv, title: name }
}

async function fetchSheetXlsx(id: string): Promise<ArrayBuffer> {
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google returned ${res.status}`)
  const buffer = await res.arrayBuffer()
  const magic = new Uint8Array(buffer.slice(0, 2))
  if (magic[0] !== 0x50 || magic[1] !== 0x4b) {
    throw new Error('not-xlsx')
  }
  return buffer
}

async function fetchSheetCsv(id: string, gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google returned ${res.status}`)
  const csv = await res.text()
  if (csv.trim().startsWith('<')) throw new Error('html')
  return csv
}

type GvizResponse = {
  status?: string
  table?: {
    cols: Array<{ label?: string; id?: string }>
    rows: Array<{ c: Array<{ v?: unknown; f?: string } | null> | null }>
  }
}

function gvizToCsv(data: GvizResponse): string {
  const cols = data.table?.cols ?? []
  const rows = data.table?.rows ?? []
  const header = cols.map((col) => csvCell(col.label || col.id || '')).join(',')
  const body = rows.map((row) =>
    (row?.c ?? []).map((cell) => csvCell(String(cell?.f ?? cell?.v ?? ''))).join(','),
  )
  return [header, ...body].join('\n')
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function fetchSheetJsonp(id: string, gid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const callback = `__memoryMapSheet${Date.now()}`
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, 12000)
    ;(window as unknown as Record<string, (data: GvizResponse) => void>)[callback] = (
      data,
    ) => {
      cleanup()
      if (data.status === 'error' || !data.table) {
        reject(new Error('gviz-error'))
        return
      }
      resolve(gvizToCsv(data))
    }
    const script = document.createElement('script')
    script.src = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?gid=${gid}&tqx=${encodeURIComponent(`out:json;responseHandler:${callback}`)}`
    script.onerror = () => {
      cleanup()
      reject(new Error('script'))
    }
    document.body.appendChild(script)

    function cleanup() {
      window.clearTimeout(timeout)
      delete (window as unknown as Record<string, unknown>)[callback]
      script.remove()
    }
  })
}

export async function ingestGoogleSheetsUrl(url: string): Promise<IngestResult> {
  const parsed = parseGoogleSheetsUrl(url)
  if (!parsed) {
    throw new Error('That does not look like a Google Sheets link.')
  }

  try {
    const buffer = await fetchSheetXlsx(parsed.id)
    const sheets = await workbookToSheets(buffer)
    return ingestFromSheets('Google Sheet', sheets)
  } catch {
    try {
      const csv = await fetchSheetCsv(parsed.id, parsed.gid)
      return { kind: 'csv', csv, title: 'Google Sheet' }
    } catch {
      try {
        const csv = await fetchSheetJsonp(parsed.id, parsed.gid)
        return { kind: 'csv', csv, title: 'Google Sheet' }
      } catch {
        throw new Error(
          'Could not open that Google Sheet from the browser. Share it as “Anyone with the link can view”, or in the sheet choose File → Download → Microsoft Excel and drop that file here. If it has several tabs, open the cruise tab first so the link includes gid.',
        )
      }
    }
  }
}

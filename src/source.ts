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

async function workbookToSheets(
  buffer: ArrayBuffer,
  opts?: { googleSheetId?: string },
): Promise<SheetChoice[]> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  // Google Sheets often stores Drive photos as hyperlinks / HYPERLINK() /
  // IMAGE() whose visible text is a file name — promote the real URL first.
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (sheet) promoteHttpHyperlinks(sheet)
  }
  if (opts?.googleSheetId) {
    await promoteLinksFromGoogleHtmlZip(opts.googleSheetId, workbook)
  }
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

/** HYPERLINK("url",…) / IMAGE("url") — Google Sheets often exports photos this way. */
const SHEET_URL_FORMULA =
  /^(?:_xlfn\.)?(?:HYPERLINK|IMAGE)\(\s*"((?:[^"]|\\")+)"/i

/** Replace cell display text with its http(s) link target when present. */
function promoteHttpHyperlinks(sheet: Record<string, unknown>) {
  for (const addr of Object.keys(sheet)) {
    if (addr.startsWith('!')) continue
    const cell = sheet[addr] as
      | {
          v?: unknown
          w?: string
          t?: string
          f?: string
          l?: { Target?: string; Rel?: { Target?: string } }
        }
      | undefined
    if (!cell || typeof cell !== 'object') continue
    let target = (cell.l?.Target || cell.l?.Rel?.Target || '').trim()
    if (!/^https?:\/\//i.test(target) && typeof cell.f === 'string') {
      const match = SHEET_URL_FORMULA.exec(cell.f.trim())
      if (match) target = match[1].replace(/\\"/g, '"').trim()
    }
    if (!/^https?:\/\//i.test(target)) continue
    // Skip relative / in-sheet anchors.
    if (target.startsWith('#')) continue
    cell.v = target
    cell.w = target
    cell.t = 's'
  }
}

/**
 * Google Sheets “Insert link” (rich text) often loses the URL in xlsx/CSV, but
 * the HTML zip export keeps <a href>. Overlay those hrefs onto the workbook.
 */
async function promoteLinksFromGoogleHtmlZip(
  id: string,
  workbook: {
    SheetNames: string[]
    Sheets: Record<string, Record<string, unknown> | undefined>
  },
): Promise<void> {
  let buffer: ArrayBuffer
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${id}/export?format=zip`,
    )
    if (!res.ok) return
    buffer = await res.arrayBuffer()
  } catch {
    return
  }

  let entries: Map<string, string>
  try {
    entries = await unzipTextFiles(buffer)
  } catch {
    return
  }

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const html =
      entries.get(`${name}.html`) ||
      [...entries.entries()].find(([file]) =>
        file.toLowerCase().endsWith('.html'),
      )?.[1]
    if (!html) continue
    const grid = htmlTableHrefGrid(html)
    applyHrefGridToSheet(sheet, grid)
  }
}

function applyHrefGridToSheet(
  sheet: Record<string, unknown>,
  grid: Array<Array<string | null>>,
) {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    for (let c = 0; c < row.length; c++) {
      const href = row[c]
      if (!href || !/^https?:\/\//i.test(href)) continue
      const addr = cellAddress(r, c)
      const existing = sheet[addr] as
        | { v?: unknown; w?: string; t?: string }
        | undefined
      const visible = String(existing?.v ?? existing?.w ?? '').trim()
      // Keep cells that already store a URL; replace filenames / labels.
      if (/^https?:\/\//i.test(visible)) continue
      sheet[addr] = {
        ...(existing && typeof existing === 'object' ? existing : {}),
        v: href,
        w: href,
        t: 's',
      }
    }
  }
}

function cellAddress(row0: number, col0: number): string {
  let n = col0
  let col = ''
  do {
    col = String.fromCharCode(65 + (n % 26)) + col
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return `${col}${row0 + 1}`
}

/** Minimal ZIP reader for Google’s HTML export (central directory). */
async function unzipTextFiles(
  buffer: ArrayBuffer,
): Promise<Map<string, string>> {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return new Map()

  const cdSize = view.getUint32(eocd + 12, true)
  const cdOffset = view.getUint32(eocd + 16, true)
  const out = new Map<string, string>()
  let offset = cdOffset
  const cdEnd = cdOffset + cdSize
  while (offset + 46 <= cdEnd) {
    if (view.getUint32(offset, true) !== 0x02014b50) break
    const method = view.getUint16(offset + 10, true)
    const compSize = view.getUint32(offset + 20, true)
    const nameLen = view.getUint16(offset + 28, true)
    const extraLen = view.getUint16(offset + 30, true)
    const commentLen = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = new TextDecoder().decode(
      bytes.subarray(offset + 46, offset + 46 + nameLen),
    )
    offset += 46 + nameLen + extraLen + commentLen
    if (!/\.html?$/i.test(name) || name.includes('/')) continue
    if (view.getUint32(localOffset, true) !== 0x04034b50) continue
    const localNameLen = view.getUint16(localOffset + 26, true)
    const localExtraLen = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const compressed = bytes.subarray(dataStart, dataStart + compSize)
    try {
      let raw: Uint8Array
      if (method === 0) {
        raw = compressed
      } else if (method === 8) {
        raw = new Uint8Array(
          await new Response(
            new Blob([compressed.buffer.slice(
              compressed.byteOffset,
              compressed.byteOffset + compressed.byteLength,
            ) as ArrayBuffer])
              .stream()
              .pipeThrough(new DecompressionStream('deflate-raw')),
          ).arrayBuffer(),
        )
      } else {
        continue
      }
      out.set(name, new TextDecoder('utf-8').decode(raw))
    } catch {
      // Skip unreadable entries.
    }
  }
  return out
}

/** Parse Google Sheets HTML export tables into a grid of href-or-null. */
function htmlTableHrefGrid(html: string): Array<Array<string | null>> {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table =
    doc.querySelector('table.waffle') || doc.querySelector('table')
  if (!table) return []
  const grid: Array<Array<string | null>> = []
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const row: Array<string | null> = []
    for (const cell of Array.from(tr.children)) {
      if (cell.tagName !== 'TD' && cell.tagName !== 'TH') continue
      const anchor = cell.querySelector('a[href]')
      const href = (anchor?.getAttribute('href') || '').trim()
      row.push(/^https?:\/\//i.test(href) ? href : null)
      const colspan = Number(cell.getAttribute('colspan') || 1)
      for (let i = 1; i < colspan; i++) row.push(null)
    }
    if (row.length) grid.push(row)
  }
  return grid
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
    const sheets = await workbookToSheets(buffer, {
      googleSheetId: parsed.id,
    })
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

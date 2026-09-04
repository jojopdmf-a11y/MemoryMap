import { useState } from 'react'
import type { SheetChoice } from '../source'
import { ManualTripForm } from './ManualTripForm'

type Props = {
  importing: boolean
  onFile: (file: File) => void
  onSheetsUrl: (url: string) => void
  onManual: (csv: string, label: string) => void
  onSample: () => void
  onDownloadSample: () => void
}

export function DropZone({
  importing,
  onFile,
  onSheetsUrl,
  onManual,
  onSample,
  onDownloadSample,
}: Props) {
  const [url, setUrl] = useState('')

  function takeFile(file: File | undefined) {
    if (!file) return
    onFile(file)
  }

  return (
    <section
      className="dropzone"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(e) => {
        e.preventDefault()
        const dropped = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
        if (dropped && /docs\.google\.com\/spreadsheets/.test(dropped)) {
          onSheetsUrl(dropped)
          return
        }
        takeFile(e.dataTransfer.files[0])
      }}
    >
      <p className="kicker">MemoryMap</p>
      <h1>Plot a trip from a spreadsheet</h1>
      <p className="lede">
        Type the stops, drop a CSV or Excel file, or paste a Google Sheets
        link. We will draw the route, then pack the map into a single HTML file.
      </p>
      <label className="drop-target">
        <input
          type="file"
          accept=".csv,.tsv,.xlsx,.xls,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={importing}
          onChange={(e) => {
            takeFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <strong>{importing ? 'Reading spreadsheet…' : 'Drop a spreadsheet here'}</strong>
        <span>CSV or Excel · Numbers files need an Excel/CSV export</span>
      </label>
      <form
        className="sheets-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (url.trim()) onSheetsUrl(url.trim())
        }}
      >
        <label>
          Google Sheets link
          <input
            type="url"
            value={url}
            disabled={importing}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button type="submit" className="primary" disabled={importing || !url.trim()}>
          Load sheet
        </button>
        <p className="hint">
          Share as “Anyone with the link can view”, or download Excel and drop
          it. For a specific tab, open that tab before copying the link.
        </p>
      </form>
      <ManualTripForm importing={importing} onSubmit={onManual} />
      <p className="drop-actions">
        <button type="button" className="linkish" onClick={onSample}>
          Try a sample trip
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className="linkish" onClick={onDownloadSample}>
          Download sample CSV
        </button>
      </p>
    </section>
  )
}

type SheetPickerProps = {
  title: string
  sheets: SheetChoice[]
  onPick: (sheet: SheetChoice) => void
  onCancel: () => void
}

export function SheetPicker({ title, sheets, onPick, onCancel }: SheetPickerProps) {
  return (
    <section className="dropzone">
      <p className="kicker">MemoryMap</p>
      <h1>Which tab?</h1>
      <p className="lede">
        {title} has more than one sheet with places. Pick the cruise, tour, or
        route you want to plot.
      </p>
      <ul className="sheet-list">
        {sheets.map((sheet) => (
          <li key={sheet.name}>
            <button type="button" className="sheet-pick" onClick={() => onPick(sheet)}>
              <strong>{sheet.name}</strong>
              <span>
                {sheet.stopCount} stop{sheet.stopCount === 1 ? '' : 's'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="drop-actions">
        <button type="button" className="linkish" onClick={onCancel}>
          Cancel
        </button>
      </p>
    </section>
  )
}

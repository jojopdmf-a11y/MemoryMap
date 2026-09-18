import { useState } from 'react'
import {
  emptyManualStop,
  filledManualStops,
  manualStopsToCsv,
  type ManualStopDraft,
} from '../csv'
import { SAMPLE_TRIPS, type SampleTrip } from '../sample'
import { INSTAGRAM_HANDLE, SHEETS_TEMPLATE_COPY_URL } from '../site'
import type { SheetChoice } from '../source'
import { InstagramLink } from './InstagramLink'
import { PlaceSuggest } from './PlaceSuggest'
import './Landing.css'

type Props = {
  importing: boolean
  onFile: (file: File) => void
  onSheetsUrl: (url: string) => void
  onManual: (csv: string, label: string) => void
  onSample: (trip: SampleTrip) => void
}

function firstBias(rows: ManualStopDraft[]) {
  const hit = rows.find((row) => row.lat != null && row.lng != null)
  if (hit?.lat == null || hit.lng == null) return undefined
  return { lat: hit.lat, lng: hit.lng }
}

export function DropZone({
  importing,
  onFile,
  onSheetsUrl,
  onManual,
  onSample,
}: Props) {
  const [routeOpen, setRouteOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [rows, setRows] = useState<ManualStopDraft[]>([
    emptyManualStop(),
    emptyManualStop(),
    emptyManualStop(),
    emptyManualStop(),
  ])
  const [url, setUrl] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  function updateRow(index: number, patch: Partial<ManualStopDraft>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function takeFile(file: File | undefined) {
    if (!file) return
    setLocalError(null)
    onFile(file)
  }

  function plotManual() {
    const filled = filledManualStops(rows)
    if (filled.length === 0 || !filled.some((row) => row.city.trim())) {
      setLocalError('Add at least one city or street address.')
      setRouteOpen(true)
      return
    }
    setLocalError(null)
    onManual(manualStopsToCsv(rows), label.trim() || 'Untitled trip')
  }

  return (
    <section className="lp">
      <header className="lp-head">
        <div className="lp-brand">
          <p className="kicker">Public preview · no login needed</p>
          <h1 className="lp-mark">MemoryMap</h1>
          <p className="lp-tagline">
            Visualize Your Voyages, Treasure Your Travels.
          </p>
          <p className="lp-instagram">
            <InstagramLink>Instagram @{INSTAGRAM_HANDLE}</InstagramLink>
          </p>
        </div>
      </header>

      <div className={`lp-board${routeOpen ? ' is-route-open' : ''}`}>
        <article className="lp-panel lp-route">
          <form
            className="lp-form"
            onSubmit={(e) => {
              e.preventDefault()
              plotManual()
            }}
          >
            <div className="lp-route-head">
              <h2>Input your route</h2>
              <label className="lp-trip-name">
                <span className="visually-hidden">Trip name</span>
                <input
                  value={label}
                  disabled={importing}
                  placeholder="Trip name"
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
            </div>
            <div className="lp-stops" role="group" aria-label="Trip stops">
              {rows.map((row, index) => (
                <div className="lp-stop" key={index}>
                  <label>
                    Date
                    <input
                      type="date"
                      value={row.date}
                      disabled={importing}
                      onChange={(e) =>
                        updateRow(index, { date: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Place
                    <PlaceSuggest
                      value={row.city}
                      disabled={importing}
                      placeholder="City or street address"
                      ariaLabel={`Place for stop ${index + 1}`}
                      hint={[row.state, row.country]
                        .filter((part) => part.trim())
                        .join(', ')}
                      bias={firstBias(rows)}
                      onChange={(city) =>
                        updateRow(index, { city, lat: null, lng: null })
                      }
                      onPick={(hit) =>
                        updateRow(index, {
                          city:
                            hit.kind === 'city'
                              ? hit.name
                              : hit.name || hit.label,
                          state: hit.state?.trim() ?? '',
                          country: hit.country?.trim() ?? '',
                          lat: hit.lat,
                          lng: hit.lng,
                        })
                      }
                    />
                  </label>
                  <label className="lp-extra">
                    State
                    <input
                      value={row.state}
                      disabled={importing}
                      placeholder="Optional"
                      onChange={(e) =>
                        updateRow(index, { state: e.target.value })
                      }
                    />
                  </label>
                  <label className="lp-extra">
                    Country
                    <input
                      value={row.country}
                      disabled={importing}
                      placeholder="Optional"
                      onChange={(e) =>
                        updateRow(index, { country: e.target.value })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="ghost lp-extra"
                    disabled={importing || rows.length <= 1}
                    onClick={() =>
                      setRows((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {localError && (
              <p className="lp-error" role="alert">
                {localError}
              </p>
            )}
            <div className="lp-actions">
              <button
                type="button"
                className="ghost"
                disabled={importing}
                onClick={() => setRouteOpen((open) => !open)}
              >
                {routeOpen
                  ? 'Hide state and country'
                  : 'Click here to add state and country'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={importing}
                onClick={() =>
                  setRows((current) => [...current, emptyManualStop()])
                }
              >
                Add stop
              </button>
              <button type="submit" className="primary" disabled={importing}>
                Map this route
              </button>
            </div>
          </form>
        </article>

        <section className="lp-panel lp-samples" aria-labelledby="lp-samples-h">
          <h2 id="lp-samples-h">Try a sample</h2>
          <ul className="lp-samples-grid">
            {SAMPLE_TRIPS.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  className="lp-sample"
                  disabled={importing}
                  onClick={() => onSample(trip)}
                >
                  <span
                    className={`lp-thumb is-${trip.id}`}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{trip.title}</strong>
                    <span>{trip.blurb}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-panel lp-sheet">
          <h2>Drop a spreadsheet</h2>
          <label
            className="lp-drop"
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(e) => {
              e.preventDefault()
              const dropped =
                e.dataTransfer.getData('text/uri-list') ||
                e.dataTransfer.getData('text/plain')
              if (dropped && /docs\.google\.com\/spreadsheets/.test(dropped)) {
                setLocalError(null)
                onSheetsUrl(dropped)
                return
              }
              takeFile(e.dataTransfer.files[0])
            }}
          >
            <input
              type="file"
              accept=".csv,.tsv,.xlsx,.xls,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={importing}
              onChange={(e) => {
                takeFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <strong>
              {importing ? 'Reading spreadsheet…' : 'Drop a spreadsheet here'}
            </strong>
            <span>CSV or Excel · Numbers needs an Excel/CSV export</span>
            <p>
              First row is headers. Include a date and a place. We can look up
              the names.
            </p>
          </label>
          <div className="lp-template">
            <a
              href={SHEETS_TEMPLATE_COPY_URL}
              target="_blank"
              rel="noreferrer"
            >
              MemoryMap Template
            </a>
            <p>
              Opens Google Sheets and makes your own copy. Fill Date and
              Location for each stop, set Share → Anyone with the link → Viewer,
              then click Open in MemoryMap in the Sheet (or paste the link
              below).
            </p>
          </div>
          <form
            className="lp-sheets"
            onSubmit={(e) => {
              e.preventDefault()
              if (url.trim()) {
                setLocalError(null)
                onSheetsUrl(url.trim())
              }
            }}
          >
            <p>Paste a Google Sheets link</p>
            <div className="lp-sheets-row">
              <input
                type="url"
                value={url}
                disabled={importing}
                aria-label="Google Sheets link"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                type="submit"
                className="primary"
                disabled={importing || !url.trim()}
              >
                Load
              </button>
            </div>
          </form>
        </section>
      </div>
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
            <button
              type="button"
              className="sheet-pick"
              onClick={() => onPick(sheet)}
            >
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

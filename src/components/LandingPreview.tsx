import { useMemo, useState } from 'react'
import {
  emptyManualStop,
  filledManualStops,
  manualStopsToCsv,
  parseCsv,
  type ManualStopDraft,
} from '../csv'
import { SAMPLE_TRIPS, type SampleTrip } from '../sample'
import {
  ingestFile,
  ingestGoogleSheetsUrl,
  type IngestResult,
  type SheetChoice,
} from '../source'
import { DEFAULT_FIELDS, DEFAULT_LOOK, type Look } from '../look'
import type { Stop } from '../types'
import { AccountMenu } from './AccountMenu'
import { InstagramLink } from './InstagramLink'
import { PlaceSuggest } from './PlaceSuggest'
import { PreviewMap } from './PreviewMap'
import { SheetPicker } from './DropZone'
import { INSTAGRAM_HANDLE } from '../site'
import './LandingPreview.css'

function firstBias(rows: ManualStopDraft[]) {
  const hit = rows.find((row) => row.lat != null && row.lng != null)
  if (hit?.lat == null || hit.lng == null) return undefined
  return { lat: hit.lat, lng: hit.lng }
}

function lookFromSample(trip: SampleTrip): Look {
  return {
    ...DEFAULT_LOOK,
    ...trip.look,
    fields: { ...DEFAULT_FIELDS, ...trip.look?.fields },
  }
}

export function LandingPreview() {
  const [routeOpen, setRouteOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [rows, setRows] = useState<ManualStopDraft[]>([
    emptyManualStop(),
    emptyManualStop(),
    emptyManualStop(),
    emptyManualStop(),
  ])
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [sheetChoices, setSheetChoices] = useState<{
    title: string
    sheets: SheetChoice[]
  } | null>(null)
  const [mapped, setMapped] = useState<{
    title: string
    stops: Stop[]
    look: Look
  } | null>(null)

  const plotted = useMemo(
    () =>
      mapped?.stops.filter(
        (stop) => !stop.dismissed && stop.lat != null && stop.lng != null,
      ) ?? [],
    [mapped],
  )

  function updateRow(index: number, patch: Partial<ManualStopDraft>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function loadCsv(text: string, title: string, look: Look = DEFAULT_LOOK) {
    const result = parseCsv(text)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setMapped({ title, stops: result.stops, look })
  }

  async function ingest(job: Promise<IngestResult>) {
    setImporting(true)
    setError(null)
    setSheetChoices(null)
    try {
      const result = await job
      if (result.kind === 'sheets') {
        setSheetChoices({ title: result.title, sheets: result.sheets })
        return
      }
      loadCsv(result.csv, result.title)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not read that spreadsheet.',
      )
    } finally {
      setImporting(false)
    }
  }

  function plotManual() {
    const filled = filledManualStops(rows)
    if (filled.length === 0 || !filled.some((row) => row.city.trim())) {
      setError('Add at least one city or street address.')
      setRouteOpen(true)
      return
    }
    loadCsv(manualStopsToCsv(rows), label.trim() || 'Untitled trip')
  }

  if (mapped) {
    return (
      <div className="lp-mapview">
        <div className="lp-mapbar">
          <div>
            <p className="kicker">Layout preview · map page</p>
            <strong>{mapped.title}</strong>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => setMapped(null)}
          >
            Back to landing
          </button>
        </div>
        <div className="lp-mapstage">
          <PreviewMap
            stops={mapped.stops}
            look={mapped.look}
            revealed={Math.max(plotted.length, 1)}
            labelMode="play"
          />
        </div>
      </div>
    )
  }

  if (sheetChoices) {
    return (
      <div className="lp">
        <p className="lp-note">
          Layout preview — pick a tab, then you would land on the map.
        </p>
        <SheetPicker
          title={sheetChoices.title}
          sheets={sheetChoices.sheets}
          onPick={(sheet) => {
            setSheetChoices(null)
            loadCsv(sheet.csv, sheet.name)
          }}
          onCancel={() => setSheetChoices(null)}
        />
      </div>
    )
  }

  return (
    <div className="lp">
      <p className="lp-note">
        Layout preview. The live homepage is unchanged. Click Input your route
        to expand it; click a sample to go to the map.
      </p>
      <header className="lp-head">
        <div className="lp-tools">
          <a className="ghost" href="/guides/">
            Guides
          </a>
          <AccountMenu />
        </div>
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
        <article
          className="lp-panel lp-route"
          onClick={() => {
            if (!routeOpen) setRouteOpen(true)
          }}
        >
          <h2>Input your route</h2>
          <form
            className="lp-form"
            onSubmit={(e) => {
              e.preventDefault()
              plotManual()
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <label className="lp-label">
              Trip name
              <input
                value={label}
                disabled={importing}
                placeholder="Mediterranean cruise…"
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <div className="lp-stops" role="group" aria-label="Trip stops">
              {rows.map((row, index) => (
                <div className="lp-stop" key={index}>
                  <label>
                    Date
                    <input
                      type="date"
                      value={row.date}
                      disabled={importing}
                      onFocus={() => setRouteOpen(true)}
                      onChange={(e) => updateRow(index, { date: e.target.value })}
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
                          city: hit.kind === 'city' ? hit.name : hit.name || hit.label,
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
                      onChange={(e) => updateRow(index, { state: e.target.value })}
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
                      setRows((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="lp-expand-hint">
              Click this panel to add state, country, and a trip name.
            </p>
            {error && (
              <p className="lp-error" role="alert">
                {error}
              </p>
            )}
            <div className="lp-actions">
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
              {routeOpen && (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setRouteOpen(false)}
                >
                  Show less
                </button>
              )}
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
                  onClick={() =>
                    loadCsv(trip.csv, trip.title, lookFromSample(trip))
                  }
                >
                  <span className={`lp-thumb is-${trip.id}`} aria-hidden="true" />
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
                void ingest(ingestGoogleSheetsUrl(dropped))
                return
              }
              const file = e.dataTransfer.files[0]
              if (file) void ingest(ingestFile(file))
            }}
          >
            <input
              type="file"
              accept=".csv,.tsv,.xlsx,.xls,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void ingest(ingestFile(file))
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
            <a href="/memorymap-template.html" target="_blank" rel="noreferrer">
              Open the Google Sheets template
            </a>
            <p>
              Fill it in, then come back and paste the share link below. This
              preview uses a stand-in page until the live Sheet is published.
            </p>
          </div>
          <form
            className="lp-sheets"
            onSubmit={(e) => {
              e.preventDefault()
              if (url.trim()) void ingest(ingestGoogleSheetsUrl(url.trim()))
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
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccountMenu } from './components/AccountMenu'
import { AdSlot } from './components/AdSlot'
import { CreditsDock } from './components/CreditsDock'
import { DropZone, SheetPicker } from './components/DropZone'
import { PreviewMap } from './components/PreviewMap'
import { StopTable } from './components/StopTable'
import { downloadText } from './download'
import { createBlankStop, parseCsv, parseDate, titleFromFilename } from './csv'
import { geocodePlace } from './geocode'
import { SAMPLE_CSV, SAMPLE_FILENAME } from './sample'
import {
  ingestFile,
  ingestGoogleSheetsUrl,
  type IngestResult,
  type SheetChoice,
} from './source'
import { exportableStops, souvenirFilename } from './trip'
import { StyleBar } from './components/StyleBar'
import { DEFAULT_FIELDS, DEFAULT_LOOK, type CardField, type Look } from './look'
import type { Stop } from './types'
import './App.css'

export default function App() {
  const [stops, setStops] = useState<Stop[] | null>(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const [sheetChoices, setSheetChoices] = useState<{
    title: string
    sheets: SheetChoice[]
  } | null>(null)
  const [look, setLook] = useState<Look>(DEFAULT_LOOK)
  const [revealed, setRevealed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const geoGen = useRef(0)
  const stopsRef = useRef<Stop[] | null>(null)

  useEffect(() => {
    stopsRef.current = stops
  }, [stops])

  const updateStop = useCallback((id: string, patch: Partial<Stop>) => {
    setStops((current) =>
      current
        ? current.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop))
        : current,
    )
  }, [])

  const lookupStop = useCallback(
    async (id: string, generation: number, seed?: Stop) => {
      const stop = stopsRef.current?.find((s) => s.id === id) ?? seed
      if (!stop || stop.dismissed) return
      if (stop.lat != null && stop.lng != null) return
      const place = stop.place.trim()
      if (!place) {
        updateStop(id, { status: 'missing' })
        return
      }
      updateStop(id, { status: 'pending' })
      const hit = await geocodePlace(place)
      if (geoGen.current !== generation) return
      const latest = stopsRef.current?.find((s) => s.id === id)
      if (latest?.dismissed) return
      if (latest?.status === 'coords' && latest.lat != null && latest.lng != null) {
        return
      }
      if (hit) {
        updateStop(id, { lat: hit.lat, lng: hit.lng, status: 'geocoded' })
      } else {
        updateStop(id, { status: 'failed' })
      }
    },
    [updateStop],
  )

  async function geocodeAll(nextStops: Stop[], generation: number) {
    setBusy(true)
    try {
      for (const stop of nextStops) {
        if (geoGen.current !== generation) return
        if (stop.lat != null && stop.lng != null) continue
        await lookupStop(stop.id, generation, stop)
      }
    } finally {
      if (geoGen.current === generation) setBusy(false)
    }
  }

  function loadFromText(text: string, filename: string) {
    const result = parseCsv(text)
    geoGen.current += 1
    const generation = geoGen.current
    if (!result.ok) {
      setStops(null)
      setError(result.error)
      setBusy(false)
      return
    }
    setError(null)
    setTitle(titleFromFilename(filename))
    setStops(result.stops)
    setRevealed(0)
    setPlaying(false)
    void geocodeAll(result.stops, generation)
  }

  function onFile(file: File) {
    void ingest(ingestFile(file))
  }

  function onSheetsUrl(url: string) {
    void ingest(ingestGoogleSheetsUrl(url))
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
      loadFromText(result.csv, result.title)
    } catch (err) {
      setStops(null)
      setError(err instanceof Error ? err.message : 'Could not read that spreadsheet.')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    geoGen.current += 1
    setStops(null)
    setTitle('')
    setError(null)
    setBusy(false)
    setSheetChoices(null)
    setRevealed(0)
    setPlaying(false)
  }

  const included = stops?.filter((s) => !s.dismissed) ?? []
  const unresolved = included.filter((s) => s.lat == null || s.lng == null)
  const ready =
    Boolean(stops) && !busy && included.length > 0 && unresolved.length === 0
  const plotted = exportableStops(stops ?? [])
  const plottedStops = (stops ?? []).filter(
    (s) => !s.dismissed && s.lat != null && s.lng != null,
  )

  useEffect(() => {
    document.documentElement.dataset.theme = look.theme
  }, [look.theme])

  useEffect(() => {
    if (!playing) return
    if (plotted.length === 0) {
      setPlaying(false)
      return
    }
    if (revealed === 0) {
      setRevealed(1)
      return
    }
    if (revealed >= plotted.length) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      setRevealed((n) => n + 1)
    }, look.speedMs)
    return () => window.clearTimeout(timer)
  }, [playing, revealed, look.speedMs, plotted.length])

  function togglePlay() {
    if (!ready || plotted.length === 0) return
    if (playing) {
      setPlaying(false)
      return
    }
    if (revealed >= plotted.length) setRevealed(0)
    setPlaying(true)
  }

  function resetTour() {
    setPlaying(false)
    setRevealed(0)
  }

  function scrubTour(count: number) {
    setPlaying(false)
    setRevealed(count)
  }

  function toggleField(field: CardField) {
    setLook((current) => {
      const fields = { ...DEFAULT_FIELDS, ...current.fields }
      return { ...current, fields: { ...fields, [field]: !fields[field] } }
    })
  }

  async function download() {
    if (!ready) return
    const tripTitle = title.trim() || 'Untitled trip'
    const { buildSouvenirHtml } = await import('./souvenir')
    const html = buildSouvenirHtml(tripTitle, plotted, {
      ...DEFAULT_LOOK,
      ...look,
      fields: { ...DEFAULT_FIELDS, ...look.fields },
    })
    downloadText(html, souvenirFilename(tripTitle), 'text/html;charset=utf-8')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="kicker">MemoryMap</p>
          <p className="tagline">A trip, on a map, in one file.</p>
        </div>
        <div className="topbar-tools">
          {stops && (
            <button type="button" className="ghost" onClick={reset}>
              New file
            </button>
          )}
          <AccountMenu />
        </div>
      </header>
      <AdSlot variant="leaderboard" />

      {error && (
        <div className="banner" role="alert">
          {error}
        </div>
      )}

      {sheetChoices && !stops && (
        <SheetPicker
          title={sheetChoices.title}
          sheets={sheetChoices.sheets}
          onPick={(sheet) => {
            setSheetChoices(null)
            loadFromText(sheet.csv, sheet.name)
          }}
          onCancel={reset}
        />
      )}

      {!stops && !sheetChoices && (
        <DropZone
          importing={importing}
          onFile={onFile}
          onSheetsUrl={onSheetsUrl}
          onManual={(csv, label) => loadFromText(csv, label)}
          onSample={() => loadFromText(SAMPLE_CSV, SAMPLE_FILENAME)}
          onDownloadSample={() =>
            downloadText(SAMPLE_CSV, SAMPLE_FILENAME, 'text/csv;charset=utf-8')
          }
        />
      )}

      {stops && (
        <main className="workspace">
          <section className="map-panel">
            <PreviewMap stops={stops} look={look} revealed={revealed} />
            {ready && revealed === 0 && (
              <p className="map-cue">Press Play tour to watch the route appear</p>
            )}
            {busy && (
              <p className="map-cue is-busy">Looking up places… centering the map as they land.</p>
            )}
          </section>
          <StyleBar
            look={look}
            playing={playing}
            canPlay={ready}
            revealed={revealed}
            stopCount={plotted.length}
            onChange={(patch) => setLook((current) => ({ ...current, ...patch }))}
            onPlay={togglePlay}
            onReset={resetTour}
            onScrub={scrubTour}
          />
          <section className="panel">
            <div className="panel-head">
              <label className="title-field">
                Trip title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            </div>
            <CreditsDock
              canDownload={ready}
              onDownload={download}
              hint={
                busy
                  ? 'Looking up places…'
                  : !ready
                    ? 'Skip or fix stops without coordinates to download.'
                    : `${plotted.length} stop${plotted.length === 1 ? '' : 's'} ready. Payment is not live yet.`
              }
            />
            <StopTable
              stops={stops}
              fields={look.fields ?? DEFAULT_FIELDS}
              onToggleField={toggleField}
              activeIndex={
                revealed > 0 && plottedStops[revealed - 1]
                  ? stops.findIndex((s) => s.id === plottedStops[revealed - 1].id)
                  : -1
              }
              onChange={(id, patch) => {
                const next: Partial<Stop> = { ...patch }
                if (patch.dateRaw != null) next.date = parseDate(patch.dateRaw)
                updateStop(id, next)
              }}
              onLookup={(id) => {
                void lookupStop(id, geoGen.current)
              }}
              onAddStop={() => {
                setStops((current) => {
                  const nextRow = (current?.length ?? 0) + 2
                  const blank = createBlankStop(nextRow)
                  return current ? [...current, blank] : [blank]
                })
                setPlaying(false)
              }}
            />
          </section>
        </main>
      )}
      <AdSlot variant="footer" />
    </div>
  )
}

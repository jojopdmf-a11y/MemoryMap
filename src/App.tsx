import { useCallback, useEffect, useRef, useState } from 'react'
import { AdSlot } from './components/AdSlot'
import { AccountMenu } from './components/AccountMenu'
import { CreditsDock } from './components/CreditsDock'
import { DropZone, SheetPicker } from './components/DropZone'
import { FeedbackNote } from './components/FeedbackNote'
import { PreviewMap } from './components/PreviewMap'
import { StopTable } from './components/StopTable'
import { saveSouvenir } from './download'
import {
  createBlankStop,
  displayDate,
  parseCsv,
  parseDate,
  titleFromFilename,
} from './csv'
import { geocodePlace } from './geocode'
import { traceDriveLegs, type LatLng } from './route'
import {
  ingestFile,
  ingestGoogleSheetsUrl,
  type IngestResult,
  type SheetChoice,
} from './source'
import { exportableStops, souvenirFilename } from './trip'
import { SiteFooter } from './components/SiteFooter'
import { StyleBar } from './components/StyleBar'
import { DEFAULT_FIELDS, DEFAULT_LOOK, type CardField, type Look } from './look'
import { htmlForSouvenir } from './souvenir'
import { recordBrowserDownload } from './accountStore'
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
  const [driveLegs, setDriveLegs] = useState<LatLng[][] | null>(null)
  const [tracing, setTracing] = useState(false)
  const geoGen = useRef(0)
  const stopsRef = useRef<Stop[] | null>(null)

  useEffect(() => {
    stopsRef.current = stops
  }, [stops])

  const workspaceOpen = Boolean(stops || sheetChoices)
  useEffect(() => {
    const jump = () => {
      const active = document.activeElement
      if (active instanceof HTMLElement) active.blur()
      const root = document.getElementById('root')
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      if (root) root.scrollTop = 0
    }
    jump()
    const frame = window.requestAnimationFrame(() => {
      jump()
      window.requestAnimationFrame(jump)
    })
    const later = window.setTimeout(jump, 50)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(later)
    }
  }, [workspaceOpen])

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

  function loadFromText(text: string, filename: string, tripTitle?: string) {
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
    setTitle(tripTitle?.trim() || titleFromFilename(filename))
    setStops(result.stops)
    setRevealed(0)
    setPlaying(false)
    setDriveLegs(null)
    setTracing(false)
    setLook((current) => ({
      ...current,
      fields: { ...DEFAULT_FIELDS },
    }))
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
    setDriveLegs(null)
    setTracing(false)
  }

  const included = stops?.filter((s) => !s.dismissed) ?? []
  const unresolved = included.filter((s) => s.lat == null || s.lng == null)
  const ready =
    Boolean(stops) && !busy && included.length > 0 && unresolved.length === 0
  const plotted = exportableStops(stops ?? [])
  const plottedStops = (stops ?? []).filter(
    (s) => !s.dismissed && s.lat != null && s.lng != null,
  )
  const routeKey = plotted
    .map((stop) => `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`)
    .join('|')

  useEffect(() => {
    if (!look.followRoads) {
      setDriveLegs(null)
      setTracing(false)
      return
    }
    const pts = routeKey
      ? routeKey.split('|').map((pair) => {
          const [lat, lng] = pair.split(',')
          return { lat: Number(lat), lng: Number(lng) }
        })
      : []
    if (pts.length < 2 || pts.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng))) {
      setDriveLegs(null)
      setTracing(false)
      return
    }
    const ac = new AbortController()
    setTracing(true)
    void traceDriveLegs(pts, ac.signal)
      .then((legs) => {
        if (!ac.signal.aborted) setDriveLegs(legs)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        setDriveLegs(null)
        if (err instanceof DOMException && err.name === 'AbortError') return
      })
      .finally(() => {
        if (!ac.signal.aborted) setTracing(false)
      })
    return () => ac.abort()
  }, [look.followRoads, routeKey])

  useEffect(() => {
    document.documentElement.dataset.theme = look.theme
  }, [look.theme])

  useEffect(() => {
    if (!playing) return
    if (plotted.length === 0 || revealed >= plotted.length) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      setRevealed((n) => Math.min(n + 1, plotted.length))
    }, look.speedMs)
    return () => window.clearTimeout(timer)
  }, [playing, revealed, look.speedMs, plotted.length])

  function togglePlay() {
    if (plotted.length === 0) return
    if (playing) {
      setPlaying(false)
      return
    }
    if (revealed === 0 || revealed >= plotted.length) {
      setRevealed(1)
    }
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

  async function downloadMap() {
    if (!ready) return
    try {
      const tripTitle = title.trim() || 'Untitled trip'
      const recipeLook = {
        ...DEFAULT_LOOK,
        ...look,
        fields: { ...DEFAULT_FIELDS, ...look.fields },
      }
      const filename = souvenirFilename(tripTitle)
      await saveSouvenir(filename, (hosted) =>
        htmlForSouvenir(tripTitle, plotted, recipeLook, hosted, driveLegs),
      )
      recordBrowserDownload(
        { title: tripTitle, stops: plotted, look: recipeLook },
        filename,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not download the souvenir file.',
      )
    }
  }

  return (
    <div className={stops || sheetChoices ? 'app' : 'app is-landing'}>
      <header className="topbar">
        <div className="topbar-brand">
          <p className="kicker">MemoryMap</p>
          <p className="tagline">Visualize Your Voyages, Treasure Your Travels.</p>
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
          onSample={(csv, filename, title) => loadFromText(csv, filename, title)}
        />
      )}

      {stops && (
        <main className="workspace">
          <div className="map-stage">
            <aside className="map-guide" aria-label="What to do next">
              <p className="map-guide-kicker">What to do</p>
              <ul>
                <li>Press Play tour to watch the route appear.</li>
                <li>Change the look in the bar under the map.</li>
                <li>Fix or skip any stop that didn’t land.</li>
                <li>Download when the trip looks right.</li>
              </ul>
            </aside>
            <section className="map-panel">
              <PreviewMap
                stops={stops}
                look={look}
                revealed={revealed}
                roads={look.followRoads ? driveLegs : null}
              />
              {revealed > 0 && plottedStops[revealed - 1] && (
                <aside className="map-date-window" aria-live="polite">
                  <strong className="map-date-title">
                    {title.trim() || 'Untitled trip'}
                  </strong>
                  <span className="map-date-kicker">Date</span>
                  <strong className="map-date-value">
                    {displayDate(
                      plottedStops[revealed - 1].date,
                      plottedStops[revealed - 1].dateRaw,
                    ) || 'Date unknown'}
                  </strong>
                </aside>
              )}
              {ready && revealed === 0 && !tracing && (
                <p className="map-cue">
                  Press Play tour to watch the route appear
                </p>
              )}
              {busy && (
                <p className="map-cue is-busy">Looking up places… centering the map as they land.</p>
              )}
              {tracing && !busy && (
                <p className="map-cue is-trace">Tracing roads… you can still play, zoom, and download.</p>
              )}
            </section>
            <FeedbackNote />
          </div>
          <StyleBar
            look={look}
            playing={playing}
            canPlay={plotted.length > 0}
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
              onDownload={downloadMap}
              hint={
                busy
                  ? 'Looking up places…'
                  : tracing
                    ? 'Tracing the drive… zoom and play stay available.'
                    : !ready
                    ? 'Skip or fix stops without coordinates to download.'
                    : `${plotted.length} stop${plotted.length === 1 ? '' : 's'} ready. Download is free.`
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
      <SiteFooter />
    </div>
  )
}

import { useState } from 'react'
import type { Look } from '../look'
import {
  MAP_OPTIONS,
  PATH_OPTIONS,
  PIN_OPTIONS,
  SPEED_OPTIONS,
  THEME_OPTIONS,
} from '../look'
import { ColorWell } from './ColorWell'

type Props = {
  look: Look
  playing: boolean
  canPlay: boolean
  revealed: number
  stopCount: number
  tourComplete: boolean
  showLocations: boolean
  onChange: (patch: Partial<Look>) => void
  onPlay: () => void
  onReset: () => void
  onScrub: (count: number) => void
  onToggleLocations: () => void
}

export function StyleBar({
  look,
  playing,
  canPlay,
  revealed,
  stopCount,
  tourComplete,
  showLocations,
  onChange,
  onPlay,
  onReset,
  onScrub,
  onToggleLocations,
}: Props) {
  const [colorWell, setColorWell] = useState<'pin' | 'line' | null>(null)

  return (
    <div className="style-bar">
      <div className="playback">
        <button
          type="button"
          className="primary"
          disabled={!canPlay}
          onClick={onPlay}
        >
          {playing ? 'Pause' : 'Play tour'}
        </button>
        <button type="button" className="ghost" onClick={onReset} disabled={!canPlay}>
          Reset
        </button>
        <label className="scrub">
          <span className="scrub-count">
            {revealed} / {stopCount}
          </span>
          <input
            type="range"
            min={0}
            max={stopCount}
            step={1}
            value={revealed}
            disabled={!canPlay || stopCount === 0}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-label="Scrub through the route"
          />
        </label>
      </div>
      <label>
        Map
        <select
          value={look.map}
          onChange={(e) => onChange({ map: e.target.value as Look['map'] })}
        >
          {MAP_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Pins
        <select
          value={look.pin}
          onChange={(e) => onChange({ pin: e.target.value as Look['pin'] })}
        >
          {PIN_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Path
        <select
          value={look.path}
          onChange={(e) => onChange({ path: e.target.value as Look['path'] })}
        >
          {PATH_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <div className="road-toggle">
        <span>Roads</span>
        <button
          type="button"
          className={look.followRoads ? 'is-on' : undefined}
          aria-pressed={look.followRoads}
          title="Follow driving roads between stops. Zoom and play stay snappy — the route is fetched once."
          onClick={() =>
            onChange({
              followRoads: !look.followRoads,
              path: !look.followRoads && look.path === 'none' ? 'solid' : look.path,
            })
          }
        >
          Road trip
        </button>
      </div>
      <div className="road-toggle">
        <span>View</span>
        <button
          type="button"
          className={tourComplete && showLocations ? 'is-on' : undefined}
          aria-pressed={tourComplete && showLocations}
          disabled={!tourComplete}
          title={
            tourComplete
              ? 'Show or hide the location banners. Pins and the route stay.'
              : 'Available after the tour finishes'
          }
          onClick={onToggleLocations}
        >
          Locations
        </button>
      </div>
      <label>
        Pace
        <select
          value={String(look.speedMs)}
          onChange={(e) => onChange({ speedMs: Number(e.target.value) })}
        >
          {SPEED_OPTIONS.map((opt) => (
            <option key={opt.ms} value={opt.ms}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Theme
        <select
          value={look.theme}
          onChange={(e) => onChange({ theme: e.target.value as Look['theme'] })}
        >
          {THEME_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <ColorWell
        label="Pin"
        align="end"
        value={look.pinColor}
        open={colorWell === 'pin'}
        onOpen={() => setColorWell('pin')}
        onClose={() => setColorWell(null)}
        onPick={(pinColor) => onChange({ pinColor })}
      />
      <ColorWell
        label="Line"
        align="end"
        value={look.pathColor}
        allowNone
        open={colorWell === 'line'}
        onOpen={() => setColorWell('line')}
        onClose={() => setColorWell(null)}
        onPick={(pathColor) =>
          onChange({
            pathColor,
            path: look.path === 'none' ? 'solid' : look.path,
          })
        }
        onNone={() => onChange({ path: 'none' })}
      />
    </div>
  )
}

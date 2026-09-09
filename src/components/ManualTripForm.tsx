import { useState } from 'react'
import {
  emptyManualStop,
  filledManualStops,
  manualStopsToCsv,
  type ManualStopDraft,
} from '../csv'
import type { SuggestBias } from '../geocode'
import { PlaceSuggest } from './PlaceSuggest'

type Props = {
  importing: boolean
  onSubmit: (csv: string, label: string) => void
}

function firstBias(rows: ManualStopDraft[]): SuggestBias | undefined {
  const hit = rows.find((row) => row.lat != null && row.lng != null)
  if (hit?.lat == null || hit.lng == null) return undefined
  return { lat: hit.lat, lng: hit.lng }
}

export function ManualTripForm({ importing, onSubmit }: Props) {
  const [label, setLabel] = useState('')
  const [rows, setRows] = useState<ManualStopDraft[]>([
    emptyManualStop(),
    emptyManualStop(),
    emptyManualStop(),
  ])
  const [error, setError] = useState<string | null>(null)

  function updateRow(index: number, patch: Partial<ManualStopDraft>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function plot() {
    const filled = filledManualStops(rows)
    if (filled.length === 0 || !filled.some((row) => row.city.trim())) {
      setError('Add at least one city or street address. Date, state, and country help the lookup.')
      return
    }
    setError(null)
    const tripLabel = label.trim() || 'Untitled trip'
    onSubmit(manualStopsToCsv(rows), tripLabel)
  }

  return (
    <form
      className="manual-form"
      onSubmit={(e) => {
        e.preventDefault()
        plot()
      }}
    >
      <div className="manual-head">
        <h2 className="entry-heading">Type the locations here</h2>
        <p className="hint">
          Same trip — name the tour or cruise, then add each stop. Cities and
          street addresses both work. Suggestions appear as you type.
        </p>
      </div>
      <label className="manual-label">
        Label
        <input
          value={label}
          disabled={importing}
          placeholder="Mediterranean cruise, Alaska 2024…"
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <div className="manual-stops" role="group" aria-label="Trip stops">
        {rows.map((row, index) => (
          <div className="manual-stop" key={index}>
            <label>
              Date
              <input
                type="date"
                value={row.date}
                disabled={importing}
                onChange={(e) => updateRow(index, { date: e.target.value })}
              />
            </label>
            <label className="manual-place">
              Place
              <PlaceSuggest
                value={row.city}
                disabled={importing}
                placeholder="City or street address"
                ariaLabel={`Place for stop ${index + 1}`}
                hint={[row.state, row.country].filter((part) => part.trim()).join(', ')}
                bias={firstBias(rows)}
                onChange={(city) =>
                  updateRow(index, { city, lat: null, lng: null })
                }
                onPick={(hit) =>
                  updateRow(index, {
                    city: hit.kind === 'city' ? hit.name : hit.name || hit.label,
                    state: hit.state?.trim() || row.state,
                    country: hit.country?.trim() || row.country,
                    lat: hit.lat,
                    lng: hit.lng,
                  })
                }
              />
            </label>
            <label>
              State
              <input
                value={row.state}
                disabled={importing}
                placeholder="Optional"
                autoComplete="address-level1"
                onChange={(e) => updateRow(index, { state: e.target.value })}
              />
            </label>
            <label>
              Country
              <input
                value={row.country}
                disabled={importing}
                placeholder="Optional"
                autoComplete="country-name"
                onChange={(e) => updateRow(index, { country: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="ghost remove-stop"
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
      {error && (
        <p className="banner manual-error" role="alert">
          {error}
        </p>
      )}
      <div className="manual-actions">
        <button
          type="button"
          className="ghost"
          disabled={importing}
          onClick={() => setRows((current) => [...current, emptyManualStop()])}
        >
          Add a stop
        </button>
        <button type="submit" className="primary" disabled={importing}>
          Plot this trip
        </button>
      </div>
    </form>
  )
}

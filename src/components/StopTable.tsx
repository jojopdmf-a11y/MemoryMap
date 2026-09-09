import { formatDate, stopLabel } from '../csv'
import type { CardField, CardFields } from '../look'
import type { GeoStatus, Stop } from '../types'
import { PlaceSuggest } from './PlaceSuggest'

const STATUS_LABEL: Record<GeoStatus, string> = {
  coords: 'From CSV',
  geocoded: 'Geocoded',
  pending: 'Looking up…',
  failed: 'Not found',
  missing: 'Need place or coordinates',
}

type Props = {
  stops: Stop[]
  activeIndex?: number
  fields: CardFields
  onToggleField: (field: CardField) => void
  onChange: (id: string, patch: Partial<Stop>) => void
  onLookup: (id: string) => void
  onAddStop: () => void
}

export function StopTable({
  stops,
  activeIndex = -1,
  fields,
  onToggleField,
  onChange,
  onLookup,
  onAddStop,
}: Props) {
  return (
    <div className="table-wrap">
      <table className="stop-table">
        <caption className="table-hint">
          Check a column to show that field on the map.
        </caption>
        <thead>
          <tr>
            <th>#</th>
            <FieldHeader
              field="title"
              label="Title"
              checked={fields.title}
              onToggle={onToggleField}
            />
            <FieldHeader
              field="date"
              label="Date"
              checked={fields.date}
              onToggle={onToggleField}
            />
            <FieldHeader
              field="place"
              label="Place"
              checked={fields.place}
              onToggle={onToggleField}
            />
            <FieldHeader
              field="notes"
              label="Notes"
              checked={fields.notes}
              onToggle={onToggleField}
            />
            <th>Lat</th>
            <th>Lng</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {stops.map((stop, index) => (
            <tr
              key={stop.id}
              data-stop-index={index}
              className={[
                stop.dismissed ? 'is-skipped' : '',
                stop.status === 'failed' || stop.status === 'missing'
                  ? 'is-problem'
                  : '',
                index === activeIndex ? 'is-current' : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined}
            >
              <td>{index + 1}</td>
              <td>
                <input
                  value={stop.title}
                  placeholder={stopLabel(stop)}
                  onChange={(e) => onChange(stop.id, { title: e.target.value })}
                  aria-label={`Title for stop ${index + 1}`}
                />
              </td>
              <td>
                <input
                  className="mono"
                  type={looksLikeIsoDate(stop.dateRaw) || !stop.dateRaw ? 'date' : 'text'}
                  value={
                    looksLikeIsoDate(stop.dateRaw)
                      ? stop.dateRaw
                      : formatDate(stop.date, stop.dateRaw)
                  }
                  placeholder="YYYY-MM-DD"
                  onChange={(e) =>
                    onChange(stop.id, { dateRaw: e.target.value })
                  }
                  aria-label={`Date for stop ${index + 1}`}
                />
              </td>
              <td>
                <PlaceSuggest
                  value={stop.place}
                  placeholder="City or street address"
                  ariaLabel={`Place for stop ${index + 1}`}
                  onChange={(place) =>
                    onChange(stop.id, {
                      place,
                      lat: null,
                      lng: null,
                      status: place.trim() ? 'pending' : 'missing',
                    })
                  }
                  onPick={(hit) =>
                    onChange(stop.id, {
                      place: hit.label,
                      lat: hit.lat,
                      lng: hit.lng,
                      status: 'geocoded',
                    })
                  }
                  onBlurLookup={() => {
                    if (
                      stop.place.trim() &&
                      (stop.lat == null || stop.lng == null) &&
                      !stop.dismissed
                    ) {
                      onLookup(stop.id)
                    }
                  }}
                />
              </td>
              <td>
                <input
                  value={stop.notes}
                  placeholder="—"
                  onChange={(e) => onChange(stop.id, { notes: e.target.value })}
                  aria-label={`Notes for stop ${index + 1}`}
                />
              </td>
              <td>
                <CoordInput
                  value={stop.lat}
                  ariaLabel={`Latitude for stop ${index + 1}`}
                  onCommit={(lat) =>
                    onChange(stop.id, {
                      lat,
                      status:
                        lat != null && stop.lng != null
                          ? 'coords'
                          : stop.place.trim()
                            ? 'pending'
                            : 'missing',
                    })
                  }
                />
              </td>
              <td>
                <CoordInput
                  value={stop.lng}
                  ariaLabel={`Longitude for stop ${index + 1}`}
                  onCommit={(lng) =>
                    onChange(stop.id, {
                      lng,
                      status:
                        stop.lat != null && lng != null
                          ? 'coords'
                          : stop.place.trim()
                            ? 'pending'
                            : 'missing',
                    })
                  }
                />
              </td>
              <td>
                <span className={`status status-${stop.status}`}>
                  {stop.dismissed ? 'Skipped' : STATUS_LABEL[stop.status]}
                </span>
              </td>
              <td>
                {(stop.status === 'failed' ||
                  stop.status === 'missing' ||
                  stop.dismissed) && (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() =>
                      onChange(stop.id, { dismissed: !stop.dismissed })
                    }
                  >
                    {stop.dismissed ? 'Include' : 'Skip'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="table-foot">
        <button type="button" className="linkish" onClick={onAddStop}>
          Add a stop
        </button>
      </p>
    </div>
  )
}

function looksLikeIsoDate(raw: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())
}

function FieldHeader({
  field,
  label,
  checked,
  onToggle,
}: {
  field: CardField
  label: string
  checked: boolean
  onToggle: (field: CardField) => void
}) {
  return (
    <th className={checked ? undefined : 'is-off'}>
      <label className="map-field" title={`Show ${label.toLowerCase()} on the map`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(field)}
          aria-label={`Show ${label.toLowerCase()} on the map`}
        />
        {label}
      </label>
    </th>
  )
}

function CoordInput({
  value,
  onCommit,
  ariaLabel,
}: {
  value: number | null
  onCommit: (n: number | null) => void
  ariaLabel: string
}) {
  return (
    <input
      key={value ?? 'empty'}
      className="coord"
      defaultValue={value == null ? '' : String(value)}
      inputMode="decimal"
      placeholder="—"
      aria-label={ariaLabel}
      onBlur={(e) => onCommit(parseOptionalNumber(e.target.value))}
    />
  )
}

function parseOptionalNumber(raw: string): number | null {
  if (!raw.trim()) return null
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

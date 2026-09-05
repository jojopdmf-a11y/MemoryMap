import { useEffect, useId, useRef } from 'react'
import { PALETTE_BASIC, PALETTE_GRAY, PALETTE_GRID } from '../look'

type Props = {
  label: string
  value: string
  allowNone?: boolean
  align?: 'start' | 'end'
  open: boolean
  onOpen: () => void
  onClose: () => void
  onPick: (color: string) => void
  onNone?: () => void
}

export function ColorWell({
  label,
  value,
  allowNone = false,
  align = 'start',
  open,
  onOpen,
  onClose,
  onPick,
  onNone,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLInputElement>(null)
  const panelId = useId()
  const current = value.toLowerCase()

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function pick(color: string) {
    onPick(color)
    onClose()
  }

  return (
    <div className={align === 'end' ? 'color-well is-end' : 'color-well'} ref={rootRef}>
      <span className="color-well-label">{label}</span>
      <button
        type="button"
        className={open ? 'color-well-trigger is-open' : 'color-well-trigger'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? onClose() : onOpen())}
      >
        <span className="color-well-chip" style={{ background: value }} />
      </button>
      {open && (
        <div className="color-pop" id={panelId} role="dialog" aria-label={`${label} colors`}>
          <div className="color-pop-row">
            {PALETTE_BASIC.map((color) => (
              <Swatch
                key={`b-${color}`}
                color={color}
                selected={color.toLowerCase() === current}
                onPick={pick}
              />
            ))}
          </div>
          <div className="color-pop-row">
            {allowNone && (
              <button
                type="button"
                className="color-swatch is-none"
                aria-label="No color"
                onClick={() => {
                  onNone?.()
                  onClose()
                }}
              />
            )}
            {PALETTE_GRAY.map((color) => (
              <Swatch
                key={`g-${color}`}
                color={color}
                selected={color.toLowerCase() === current}
                onPick={pick}
              />
            ))}
          </div>
          <div className="color-pop-grid">
            {PALETTE_GRID.map((row, rowIndex) => (
              <div key={rowIndex} className="color-pop-row">
                {row.map((color) => (
                  <Swatch
                    key={color}
                    color={color}
                    selected={color.toLowerCase() === current}
                    onPick={pick}
                  />
                ))}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="color-pop-more"
            onClick={() => moreRef.current?.click()}
          >
            Show Colors…
          </button>
          <input
            ref={moreRef}
            type="color"
            className="color-pop-native"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#1f7a6a'}
            onChange={(event) => pick(event.target.value)}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

function Swatch({
  color,
  selected,
  onPick,
}: {
  color: string
  selected: boolean
  onPick: (color: string) => void
}) {
  return (
    <button
      type="button"
      className={selected ? 'color-swatch is-on' : 'color-swatch'}
      style={{ background: color }}
      aria-label={color}
      aria-pressed={selected}
      onClick={() => onPick(color)}
    />
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { suggestPlaces, type GeocodeHit } from '../geocode'

type Props = {
  value: string
  onChange: (value: string) => void
  onPick: (hit: GeocodeHit) => void
  onBlurLookup?: () => void
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}

export function PlaceSuggest({
  value,
  onChange,
  onPick,
  onBlurLookup,
  placeholder,
  disabled,
  ariaLabel,
}: Props) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const pickedRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<GeocodeHit[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const query = value.trim()
    if (disabled || query.length < 3) return
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      void suggestPlaces(query, ac.signal)
        .then((next) => {
          if (ac.signal.aborted) return
          setHits(next)
          setActive(0)
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false)
        })
    }, 300)
    return () => {
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [value, disabled])

  const show = open && !disabled && value.trim().length >= 3 && (loading || hits.length > 0)

  useEffect(() => {
    if (!show) return
    function place() {
      const input = inputRef.current
      const list = listRef.current
      if (!input || !list) return
      const box = input.getBoundingClientRect()
      const width = Math.min(Math.max(box.width, 280), Math.max(16, window.innerWidth - 16))
      list.style.left = `${Math.min(box.left, window.innerWidth - width - 8)}px`
      list.style.width = `${width}px`
      const spaceBelow = window.innerHeight - box.bottom
      if (spaceBelow < 200 && box.top > spaceBelow) {
        list.style.top = 'auto'
        list.style.bottom = `${window.innerHeight - box.top + 4}px`
      } else {
        list.style.bottom = 'auto'
        list.style.top = `${box.bottom + 4}px`
      }
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [show, hits, loading, value])

  function pick(hit: GeocodeHit) {
    pickedRef.current = true
    onPick(hit)
    setOpen(false)
    setHits([])
  }

  return (
    <div className="place-suggest">
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && hits[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          pickedRef.current = false
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            if (pickedRef.current) {
              pickedRef.current = false
              return
            }
            setOpen(false)
            onBlurLookup?.()
          }, 120)
        }}
        onKeyDown={(e) => {
          if (!show) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((n) => Math.min(n + 1, Math.max(0, hits.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((n) => Math.max(n - 1, 0))
          } else if (e.key === 'Enter' && hits[active]) {
            e.preventDefault()
            pick(hits[active])
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
          }
        }}
      />
      {show && (
        <ul ref={listRef} id={listId} className="place-suggest-list" role="listbox">
          {loading && hits.length === 0 && (
            <li className="place-suggest-status" role="presentation">
              Looking up places…
            </li>
          )}
          {hits.map((hit, index) => (
            <li
              key={`${hit.lat},${hit.lng},${hit.label}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'is-active' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(hit)}
            >
              {hit.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import {
  hitMatchesQuery,
  streamSuggestions,
  type GeocodeHit,
  type SuggestBias,
} from '../geocode'

type Props = {
  value: string
  onChange: (value: string) => void
  onPick: (hit: GeocodeHit) => void
  onBlurLookup?: () => void
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  hint?: string
  bias?: SuggestBias
}

export function PlaceSuggest({
  value,
  onChange,
  onPick,
  onBlurLookup,
  placeholder,
  disabled,
  ariaLabel,
  hint,
  bias,
}: Props) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const pickedRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<GeocodeHit[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)

  const query = value.trim()
  const biasKey =
    bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lng)
      ? `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}`
      : ''

  useEffect(() => {
    if (disabled || pickedRef.current) return
    if (query.length < 2) return
    setActive(0)
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      const parsed = biasKey.split(',')
      const nextBias =
        parsed.length === 2 && Number.isFinite(Number(parsed[0])) && Number.isFinite(Number(parsed[1]))
          ? { lat: Number(parsed[0]), lng: Number(parsed[1]) }
          : undefined
      void streamSuggestions(query, {
        hint,
        bias: nextBias,
        signal: ac.signal,
        onHits: (next) => {
          if (ac.signal.aborted) return
          setHits(next)
          setLoading(false)
        },
      }).finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    }, 150)
    return () => {
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [query, hint, biasKey, disabled])

  const listed =
    query.length < 2 ? [] : hits.filter((hit) => hitMatchesQuery(hit, query))
  const show =
    open && !disabled && query.length >= 2 && (loading || listed.length > 0)

  useEffect(() => {
    if (!show) return
    function place() {
      const input = inputRef.current
      const list = listRef.current
      if (!input || !list) return
      const box = input.getBoundingClientRect()
      const width = Math.min(Math.max(box.width, 320), Math.max(16, window.innerWidth - 16))
      list.style.left = `${Math.min(box.left, window.innerWidth - width - 8)}px`
      list.style.width = `${width}px`
      const spaceBelow = window.innerHeight - box.bottom
      if (spaceBelow < 220 && box.top > spaceBelow) {
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
    setLoading(false)
  }

  return (
    <div className="place-suggest">
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && listed[active] ? `${listId}-${active}` : undefined}
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
          if (e.key === 'Enter' && open && query.length >= 2) {
            e.preventDefault()
            if (listed[active]) pick(listed[active])
            return
          }
          if (!show) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((n) => Math.min(n + 1, Math.max(0, listed.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((n) => Math.max(n - 1, 0))
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
          }
        }}
      />
      {show && (
        <ul ref={listRef} id={listId} className="place-suggest-list" role="listbox">
          {loading && listed.length === 0 && (
            <li className="place-suggest-status" role="presentation">
              Looking up places…
            </li>
          )}
          {listed.map((hit, index) => (
            <li
              key={`${hit.lat},${hit.lng},${hit.label}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'is-active' : undefined}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(hit)
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span className="place-suggest-name">{hit.name}</span>
              {(hit.state || hit.country) && (
                <span className="place-suggest-meta">
                  {[hit.state, hit.country].filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

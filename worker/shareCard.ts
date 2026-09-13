import type { ReactNode } from 'react'
import { ImageResponse } from 'cf-workers-og'
import { parseSouvenirTrip, type ShareTrip } from './shareMeta.ts'

type El = {
  type: string
  props: Record<string, unknown>
}

function el(
  type: string,
  style: Record<string, string | number>,
  ...kids: Array<El | string | null | false>
): El {
  const children = kids.flat().filter((kid): kid is El | string => Boolean(kid))
  const props: Record<string, unknown> = { style }
  if (children.length === 1) props.children = children[0]
  else if (children.length > 1) props.children = children
  return { type, props }
}

function clip(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1)).trim()}…`
}

function cardTree(trip: ShareTrip): El {
  const meta = [trip.range, trip.count].filter(Boolean).join(' · ')
  const places = trip.stops
    .map((s) => s.title)
    .filter(Boolean)
    .slice(0, 6)
    .join('   ·   ')
  return el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: trip.paper,
      color: trip.ink,
      padding: '72px 80px',
      justifyContent: 'space-between',
    },
    el(
      'div',
      { display: 'flex', flexDirection: 'column' },
      el(
        'div',
        {
          display: 'flex',
          fontSize: 22,
          letterSpacing: 8,
          color: trip.terra,
        },
        'MEMORYMAP',
      ),
      el('div', {
        display: 'flex',
        width: 72,
        height: 2,
        backgroundColor: trip.terra,
        marginTop: 28,
        opacity: 0.55,
      }),
      el(
        'div',
        {
          display: 'flex',
          fontSize: 64,
          fontWeight: 600,
          marginTop: 28,
          lineHeight: 1.08,
        },
        clip(trip.title, 52),
      ),
    ),
    el(
      'div',
      { display: 'flex', flexDirection: 'column' },
      meta
        ? el(
            'div',
            { display: 'flex', fontSize: 28, color: trip.muted },
            meta,
          )
        : null,
      places
        ? el(
            'div',
            { display: 'flex', fontSize: 24, color: trip.ink, marginTop: 16 },
            clip(places, 90),
          )
        : null,
      el(
        'div',
        { display: 'flex', fontSize: 20, color: trip.terra, marginTop: 28 },
        'A MemoryMap souvenir',
      ),
    ),
  )
}

export async function souvenirShareImage(html: string): Promise<Response> {
  const trip = parseSouvenirTrip(html)
  return ImageResponse.create(cardTree(trip) as ReactNode, {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

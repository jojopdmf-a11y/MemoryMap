export type ShareStop = {
  title: string
  lat: number
  lng: number
}

export type ShareTrip = {
  title: string
  range: string
  count: string
  paper: string
  ink: string
  muted: string
  terra: string
  stops: ShareStop[]
}

const THEMES: Record<string, Pick<ShareTrip, 'paper' | 'ink' | 'muted' | 'terra'>> =
  {
    cream: {
      paper: '#eef5f2',
      ink: '#16302c',
      muted: '#5b706c',
      terra: '#1f7a6a',
    },
    ink: {
      paper: '#10201f',
      ink: '#e6f2ee',
      muted: '#9bb5af',
      terra: '#5ec4b0',
    },
    dusk: {
      paper: '#121a28',
      ink: '#e8eef8',
      muted: '#9aabc4',
      terra: '#5b9fd4',
    },
    blush: {
      paper: '#f7eef1',
      ink: '#3d2a32',
      muted: '#8a6d76',
      terra: '#c45b7a',
    },
    lilac: {
      paper: '#f3eef8',
      ink: '#2e2440',
      muted: '#7a6e8c',
      terra: '#8b6bb5',
    },
    pearl: {
      paper: '#f7f1ea',
      ink: '#3a2e28',
      muted: '#8a7a70',
      terra: '#c48a7a',
    },
  }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dateRange(dates: string[]): string {
  const clean = dates.map((d) => d.trim()).filter(Boolean)
  if (clean.length === 0) return ''
  const first = clean[0]
  const last = clean[clean.length - 1]
  return first === last ? first : `${first} – ${last}`
}

export function parseSouvenirTrip(html: string): ShareTrip {
  const fallback: ShareTrip = {
    title: 'MemoryMap',
    range: '',
    count: '',
    ...THEMES.cream,
    stops: [],
  }
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch?.[1]) {
    fallback.title = titleMatch[1].replace(/\s*·\s*MemoryMap\s*$/i, '').trim() ||
      fallback.title
  }
  const jsonMatch = html.match(
    /id="memorymap-trip"[^>]*>([^<]*)<\/script>/i,
  )
  if (!jsonMatch?.[1]) return fallback
  try {
    const trip = JSON.parse(jsonMatch[1]) as {
      title?: string
      look?: { theme?: string }
      stops?: Array<{
        title?: string
        date?: string
        place?: string
        lat?: number
        lng?: number
      }>
    }
    const theme = THEMES[trip.look?.theme ?? ''] ?? THEMES.cream
    const stops = (trip.stops ?? [])
      .filter(
        (stop) =>
          typeof stop.lat === 'number' && typeof stop.lng === 'number',
      )
      .map((stop) => ({
        title: String(stop.title || stop.place || '').trim(),
        lat: stop.lat as number,
        lng: stop.lng as number,
      }))
    const n = stops.length || (trip.stops?.length ?? 0)
    return {
      title: String(trip.title || fallback.title).trim() || fallback.title,
      range: dateRange((trip.stops ?? []).map((stop) => String(stop.date || ''))),
      count: n === 1 ? '1 stop' : n ? `${n} stops` : '',
      ...theme,
      stops,
    }
  } catch {
    return fallback
  }
}

export function shareDescription(trip: ShareTrip): string {
  return [trip.range, trip.count, 'A MemoryMap souvenir']
    .filter(Boolean)
    .join(' · ')
}

export function withShareMeta(html: string, canonical: string, image: string): string {
  const trip = parseSouvenirTrip(html)
  const title = trip.title
  const description = shareDescription(trip)
  const tags = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="MemoryMap" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join('\n  ')
  const stripped = html
    .replace(/\s*<link rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gi, '')
  if (stripped.includes('</head>')) {
    return stripped.replace('</head>', `  ${tags}\n</head>`)
  }
  return stripped
}

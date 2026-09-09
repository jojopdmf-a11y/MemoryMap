const DIRECTIONS: Record<string, string> = {
  n: 'North',
  s: 'South',
  e: 'East',
  w: 'West',
  ne: 'Northeast',
  nw: 'Northwest',
  se: 'Southeast',
  sw: 'Southwest',
}

const STREETS: Record<string, string> = {
  ave: 'Avenue',
  av: 'Avenue',
  st: 'Street',
  rd: 'Road',
  dr: 'Drive',
  blvd: 'Boulevard',
  ln: 'Lane',
  ct: 'Court',
  pl: 'Place',
  pkwy: 'Parkway',
  hwy: 'Highway',
  cir: 'Circle',
  ter: 'Terrace',
  trl: 'Trail',
  way: 'Way',
  expy: 'Expressway',
  fwy: 'Freeway',
}

const FOLD: Record<string, string> = {
  ...Object.fromEntries(Object.entries(DIRECTIONS).map(([k, v]) => [k, v.toLowerCase()])),
  ...Object.fromEntries(Object.entries(STREETS).map(([k, v]) => [k, v.toLowerCase()])),
}

function bare(part: string): string {
  return part.replace(/[.]/g, '').toLowerCase()
}

export function expandStreetQuery(query: string): string {
  const parts = query.trim().split(/\s+/).filter(Boolean)
  return parts
    .map((part, index) => {
      const key = bare(part)
      if (index > 0 && STREETS[key]) return STREETS[key]
      if (index > 0 && DIRECTIONS[key]) return DIRECTIONS[key]
      return part
    })
    .join(' ')
}

export function foldPlace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.]/g, '')
    .split(/\s+/)
    .map((part) => FOLD[part] ?? part)
    .join(' ')
}

export function looksLikeStreetAddress(query: string): boolean {
  const q = query.trim()
  if (!/^\d+\s+\S/.test(q)) return false
  const folded = foldPlace(q)
  if (Object.values(STREETS).some((name) => folded.includes(name.toLowerCase()))) return true
  return q.split(/\s+/).length >= 3 && q.length >= 10
}

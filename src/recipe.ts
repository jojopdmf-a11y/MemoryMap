import { DEFAULT_FIELDS, DEFAULT_LOOK, type Look } from './look'
import type { ExportStop } from './types'

export type SouvenirRecipe = {
  title: string
  stops: ExportStop[]
  look: Look
}

export function normalizeRecipe(recipe: SouvenirRecipe): SouvenirRecipe {
  const fields = { ...DEFAULT_FIELDS, ...recipe.look.fields }
  return {
    title: recipe.title.trim() || 'Untitled trip',
    stops: recipe.stops.map((stop) => ({
      title: stop.title.trim(),
      date: stop.date.trim(),
      place: stop.place.trim(),
      lat: roundCoord(stop.lat),
      lng: roundCoord(stop.lng),
      notes: stop.notes.trim(),
    })),
    look: {
      ...DEFAULT_LOOK,
      ...recipe.look,
      fields,
    },
  }
}

export function recipeFingerprint(recipe: SouvenirRecipe): string {
  const normalized = normalizeRecipe(recipe)
  return cyrb53(
    JSON.stringify({
      title: normalized.title,
      stops: normalized.stops,
      look: {
        map: normalized.look.map,
        pin: normalized.look.pin,
        path: normalized.look.path,
        pinColor: normalized.look.pinColor,
        pathColor: normalized.look.pathColor,
        speedMs: normalized.look.speedMs,
        theme: normalized.look.theme,
        fields: normalized.look.fields,
        followRoads: Boolean(normalized.look.followRoads),
      },
    }),
  )
}

function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5
}

function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

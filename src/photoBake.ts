import type { ExportStop } from './types'

const MAX_EDGE = 480
const JPEG_QUALITY = 0.7
const PROXY = '/api/photo'

/** Resize a photo for embedding in the souvenir HTML. */
export async function bakePhotoUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:image/')) return url
  const proxy = `${PROXY}?url=${encodeURIComponent(url)}`
  const res = await fetch(proxy, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Could not fetch photo (${res.status})`)
  const blob = await res.blob()
  if (!blob.type.startsWith('image/')) {
    throw new Error('Photo URL did not return an image')
  }
  const bitmap = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not draw photo')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}

/** Bake every stop photo into a data URL; leave the original URL on failure. */
export async function bakeStopPhotos(
  stops: ExportStop[],
): Promise<ExportStop[]> {
  const cache = new Map<string, string>()
  const next: ExportStop[] = []
  for (const stop of stops) {
    const raw = (stop.photoUrl || '').trim()
    if (!raw) {
      next.push({ ...stop, photoUrl: '' })
      continue
    }
    if (cache.has(raw)) {
      next.push({ ...stop, photoUrl: cache.get(raw)! })
      continue
    }
    try {
      const baked = await bakePhotoUrl(raw)
      cache.set(raw, baked)
      next.push({ ...stop, photoUrl: baked })
    } catch {
      cache.set(raw, raw)
      next.push({ ...stop, photoUrl: raw })
    }
  }
  return next
}

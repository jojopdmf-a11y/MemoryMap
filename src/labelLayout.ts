import type { Marker, Tooltip } from 'leaflet'
import L from 'leaflet'

export const LABEL_DIRECTIONS = [
  { direction: 'right' as const, offset: [14, 0] as [number, number] },
  { direction: 'left' as const, offset: [-14, 0] as [number, number] },
  { direction: 'top' as const, offset: [0, -16] as [number, number] },
  { direction: 'bottom' as const, offset: [0, 16] as [number, number] },
  { direction: 'right' as const, offset: [18, -16] as [number, number] },
  { direction: 'right' as const, offset: [18, 16] as [number, number] },
  { direction: 'left' as const, offset: [-18, -16] as [number, number] },
  { direction: 'left' as const, offset: [-18, 16] as [number, number] },
  { direction: 'top' as const, offset: [-16, -18] as [number, number] },
  { direction: 'top' as const, offset: [16, -18] as [number, number] },
  { direction: 'bottom' as const, offset: [-16, 18] as [number, number] },
  { direction: 'bottom' as const, offset: [16, 18] as [number, number] },
]

type Dir = (typeof LABEL_DIRECTIONS)[number]
type PathLatLng = [number, number] | { lat: number; lng: number }

type Seg = { x1: number; y1: number; x2: number; y2: number }

function rectsOverlap(a: DOMRect, b: DOMRect, gap = 6): boolean {
  return (
    a.left < b.right + gap &&
    a.right + gap > b.left &&
    a.top < b.bottom + gap &&
    a.bottom + gap > b.top
  )
}

function rectInside(inner: DOMRect, outer: DOMRect, pad = 6): boolean {
  return (
    inner.left >= outer.left + pad &&
    inner.right <= outer.right - pad &&
    inner.top >= outer.top + pad &&
    inner.bottom <= outer.bottom - pad
  )
}

function expandRect(rect: DOMRect, pad: number): DOMRect {
  return new DOMRect(
    rect.left - pad,
    rect.top - pad,
    rect.width + pad * 2,
    rect.height + pad * 2,
  )
}

/** True if segment PQ intersects axis-aligned rectangle R. */
function segmentHitsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: DOMRect,
): boolean {
  if (
    (x1 >= r.left && x1 <= r.right && y1 >= r.top && y1 <= r.bottom) ||
    (x2 >= r.left && x2 <= r.right && y2 >= r.top && y2 <= r.bottom)
  ) {
    return true
  }

  const edges: Array<[number, number, number, number]> = [
    [r.left, r.top, r.right, r.top],
    [r.right, r.top, r.right, r.bottom],
    [r.right, r.bottom, r.left, r.bottom],
    [r.left, r.bottom, r.left, r.top],
  ]
  return edges.some(([ax, ay, bx, by]) =>
    segmentsCross(x1, y1, x2, y2, ax, ay, bx, by),
  )
}

function segmentsCross(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const abx = bx - ax
  const aby = by - ay
  const acx = cx - ax
  const acy = cy - ay
  const adx = dx - ax
  const ady = dy - ay
  const cdx = dx - cx
  const cdy = dy - cy
  const cax = ax - cx
  const cay = ay - cy
  const cbx = bx - cx
  const cby = by - cy
  const d1 = abx * acy - aby * acx
  const d2 = abx * ady - aby * adx
  const d3 = cdx * cay - cdy * cax
  const d4 = cdx * cby - cdy * cbx
  if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
    return (
      Math.min(ax, bx) <= Math.max(cx, dx) &&
      Math.min(cx, dx) <= Math.max(ax, bx) &&
      Math.min(ay, by) <= Math.max(cy, dy) &&
      Math.min(cy, dy) <= Math.max(ay, by)
    )
  }
  return d1 * d2 <= 0 && d3 * d4 <= 0
}

function toTuple(point: PathLatLng): [number, number] {
  if (Array.isArray(point)) return [point[0], point[1]]
  return [point.lat, point.lng]
}

function pathToSegments(map: L.Map, path: PathLatLng[]): Seg[] {
  if (path.length < 2) return []
  const origin = map.getContainer().getBoundingClientRect()
  const screen = path.map((point) => {
    const [lat, lng] = toTuple(point)
    const p = map.latLngToContainerPoint([lat, lng])
    return { x: origin.left + p.x, y: origin.top + p.y }
  })

  // Subsample very dense road polylines so layout stays snappy.
  const step = screen.length > 80 ? Math.ceil(screen.length / 80) : 1
  const sampled: Array<{ x: number; y: number }> = []
  for (let i = 0; i < screen.length; i += step) sampled.push(screen[i])
  const last = screen[screen.length - 1]
  if (sampled[sampled.length - 1] !== last) sampled.push(last)

  const segs: Seg[] = []
  for (let i = 0; i < sampled.length - 1; i += 1) {
    const a = sampled[i]
    const b = sampled[i + 1]
    if (a.x === b.x && a.y === b.y) continue
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  return segs
}

function rectHitsPath(
  rect: DOMRect,
  segments: Seg[],
  pinX: number,
  pinY: number,
  pad = 10,
  pinClear = 22,
): boolean {
  const fat = expandRect(rect, pad)
  for (const seg of segments) {
    const d1 = Math.hypot(seg.x1 - pinX, seg.y1 - pinY)
    const d2 = Math.hypot(seg.x2 - pinX, seg.y2 - pinY)
    // Ignore the short stubs that end in the pin itself.
    if (d1 < pinClear && d2 < pinClear) continue
    if (segmentHitsRect(seg.x1, seg.y1, seg.x2, seg.y2, fat)) return true
  }
  return false
}

function applyDirection(marker: Marker, dir: Dir) {
  const tip = marker.getTooltip() as
    | (Tooltip & { _updatePosition?: () => void })
    | undefined
  if (!tip) return
  tip.options.direction = dir.direction
  tip.options.offset = L.point(dir.offset[0], dir.offset[1])
  if (typeof tip._updatePosition === 'function') tip._updatePosition()
}

export function layoutStopLabels(
  map: L.Map,
  items: Array<{ marker: Marker; visible: boolean }>,
  path: PathLatLng[] = [],
) {
  const mapBox = map.getContainer().getBoundingClientRect()
  const segments =
    path.length >= 2 && items.some((item) => item.visible)
      ? pathToSegments(map, path)
      : []
  const origin = map.getContainer().getBoundingClientRect()
  const placed: DOMRect[] = []

  for (const item of items) {
    const tip = item.marker.getTooltip()
    const el = tip?.getElement()
    if (!el || !tip) continue
    if (!item.visible) {
      el.classList.remove('is-crowded')
      continue
    }
    el.classList.remove('is-crowded')
    tip.setOpacity(1)

    const pin = map.latLngToContainerPoint(item.marker.getLatLng())
    const pinX = origin.left + pin.x
    const pinY = origin.top + pin.y

    let found = false
    for (const dir of LABEL_DIRECTIONS) {
      applyDirection(item.marker, dir)
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const hitLabel = placed.some((box) => rectsOverlap(rect, box))
      if (hitLabel) continue
      if (!rectInside(rect, mapBox)) continue
      if (segments.length > 0 && rectHitsPath(rect, segments, pinX, pinY)) {
        continue
      }
      placed.push(rect)
      found = true
      break
    }
    if (!found) {
      // Last resort: avoid other labels + stay on map, even if near the path.
      for (const dir of LABEL_DIRECTIONS) {
        applyDirection(item.marker, dir)
        const rect = el.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) continue
        const hitLabel = placed.some((box) => rectsOverlap(rect, box))
        if (!hitLabel && rectInside(rect, mapBox)) {
          placed.push(rect)
          found = true
          break
        }
      }
    }
    if (!found) {
      el.classList.add('is-crowded')
      tip.setOpacity(0)
    }
  }
}

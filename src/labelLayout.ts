import type { Marker, Tooltip } from 'leaflet'
import L from 'leaflet'

export const LABEL_DIRECTIONS = [
  { direction: 'right' as const, offset: [10, 0] as [number, number] },
  { direction: 'left' as const, offset: [-10, 0] as [number, number] },
  { direction: 'top' as const, offset: [0, -12] as [number, number] },
  { direction: 'bottom' as const, offset: [0, 12] as [number, number] },
]

type Dir = (typeof LABEL_DIRECTIONS)[number]

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

function applyDirection(marker: Marker, dir: Dir) {
  const tip = marker.getTooltip() as (Tooltip & { _updatePosition?: () => void }) | undefined
  if (!tip) return
  tip.options.direction = dir.direction
  tip.options.offset = L.point(dir.offset[0], dir.offset[1])
  if (typeof tip._updatePosition === 'function') tip._updatePosition()
}

export function layoutStopLabels(
  map: L.Map,
  items: Array<{ marker: Marker; visible: boolean }>,
) {
  const mapBox = map.getContainer().getBoundingClientRect()
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
    let found = false
    for (const dir of LABEL_DIRECTIONS) {
      applyDirection(item.marker, dir)
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const hit = placed.some((box) => rectsOverlap(rect, box))
      if (!hit && rectInside(rect, mapBox)) {
        placed.push(rect)
        found = true
        break
      }
    }
    if (!found) {
      el.classList.add('is-crowded')
      tip.setOpacity(0)
    }
  }
}

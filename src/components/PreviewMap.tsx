import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDate, stopLabel } from '../csv'
import {
  labelClassName,
  labelFillAlpha,
  labelOpacity,
  labelTone,
  pinFill,
  pinInk,
  pinLabelText,
  popupInnerHtml,
  TILES,
  type LabelMode,
  type Look,
} from '../look'
import { pathThroughStops, type LatLng } from '../route'
import { layoutStopLabels } from '../labelLayout'
import type { Stop } from '../types'

type Props = {
  stops: Stop[]
  look: Look
  revealed: number
  roads?: LatLng[][] | null
  labelMode?: LabelMode
}

export function PreviewMap({
  stops,
  look,
  revealed,
  roads = null,
  labelMode = 'play',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const tilesRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const iconKeysRef = useRef<WeakMap<L.Marker, string>>(new WeakMap())
  const pathRef = useRef<L.Polyline | null>(null)
  const plottedKey = stops
    .filter((stop) => !stop.dismissed && stop.lat != null && stop.lng != null)
    .map((stop) => `${stop.lat},${stop.lng}`)
    .join('|')

  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, {
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
    })
    L.control.zoom({ position: 'topright' }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.setView([20, 0], 2)
    mapRef.current = map
    const enableWheel = () => map.scrollWheelZoom.enable()
    const disableWheel = () => map.scrollWheelZoom.disable()
    el.addEventListener('mouseenter', enableWheel)
    el.addEventListener('mouseleave', disableWheel)
    el.addEventListener('focusin', enableWheel)
    const onFocusOut = (event: FocusEvent) => {
      if (!el.contains(event.relatedTarget as Node | null)) disableWheel()
    }
    el.addEventListener('focusout', onFocusOut)

    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(el)

    return () => {
      el.removeEventListener('mouseenter', enableWheel)
      el.removeEventListener('mouseleave', disableWheel)
      el.removeEventListener('focusin', enableWheel)
      el.removeEventListener('focusout', onFocusOut)
      ro.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
      tilesRef.current = null
      markersRef.current.clear()
      pathRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const spec = TILES[look.map]
    if (tilesRef.current) map.removeLayer(tilesRef.current)
    const layer = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: 19,
      ...(spec.subdomains ? { subdomains: spec.subdomains } : {}),
    }).addTo(map)
    tilesRef.current = layer
    map.invalidateSize()
  }, [look.map])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const plotted = stops.filter(
      (stop) => !stop.dismissed && stop.lat != null && stop.lng != null,
    )
    const latlngs = plotted.map(
      (stop) => [stop.lat as number, stop.lng as number] as L.LatLngTuple,
    )
    if (latlngs.length === 1) {
      map.setView(latlngs[0], 6, { animate: false })
    } else if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.18), { animate: false })
    }
    requestAnimationFrame(() => {
      if (!mapRef.current || !map.getPane('mapPane')) return
      try {
        map.invalidateSize()
        if (latlngs.length === 1) {
          map.setView(latlngs[0], 6, { animate: false })
        } else if (latlngs.length > 1) {
          map.fitBounds(L.latLngBounds(latlngs).pad(0.18), { animate: false })
        }
      } catch {
        /* Leaflet can throw if a pane is mid-teardown after HMR. */
      }
    })
  }, [plottedKey, stops])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    const plotted = stops.filter(
      (stop) => !stop.dismissed && stop.lat != null && stop.lng != null,
    )
    const visible = plotted.slice(0, Math.max(0, revealed))
    const visibleIds = new Set(visible.map((stop) => stop.id))
    const coords = plotted.map((stop) => ({
      lat: stop.lat as number,
      lng: stop.lng as number,
    }))
    const visLatLngs = pathThroughStops(
      coords,
      revealed,
      look.followRoads ? roads : null,
    ) as L.LatLngTuple[]

    for (const [id, marker] of markersRef.current) {
      if (!visibleIds.has(id)) {
        layer.removeLayer(marker)
        markersRef.current.delete(id)
      }
    }

    visible.forEach((stop, index) => {
      const active = index === visible.length - 1
      const card = {
        title: stop.title || stopLabel(stop),
        date: stop.date ? formatDate(stop.date, stop.dateRaw) : stop.dateRaw,
        place: stop.place,
        notes: stop.notes,
      }
      const label = pinLabelText(
        { title: stop.title, date: card.date, place: stop.place, notes: stop.notes },
        look.fields,
      )
      const html = popupInnerHtml(card, look.fields, escapeHtml)
      let marker = markersRef.current.get(stop.id)
      if (!marker) {
        marker = L.marker([stop.lat as number, stop.lng as number], {
          icon: pinIcon(index + 1, look, active),
          zIndexOffset: active ? 1000 : 0,
        })
        if (label) {
          marker.bindTooltip(escapeHtml(label), {
            permanent: true,
            direction: 'right',
            offset: [10, 0],
            opacity: 1,
            interactive: false,
            className: labelClassName(index, revealed, labelMode),
          })
        }
        if (html) marker.bindPopup(html, { autoPan: false })
        iconKeysRef.current.set(
          marker,
          `${look.pin}|${look.pinColor}|${active}|${index}`,
        )
        marker.addTo(layer)
        markersRef.current.set(stop.id, marker)
        if (label) {
          syncTooltip(marker, index, revealed, label, look.pinColor, labelMode)
        }
      } else {
        marker.setLatLng([stop.lat as number, stop.lng as number])
        const iconKey = `${look.pin}|${look.pinColor}|${active}|${index}`
        if (iconKeysRef.current.get(marker) !== iconKey) {
          marker.setIcon(pinIcon(index + 1, look, active))
          marker.setZIndexOffset(active ? 1000 : 0)
          iconKeysRef.current.set(marker, iconKey)
        }
        if (html) marker.setPopupContent(html)
        syncTooltip(marker, index, revealed, label, look.pinColor, labelMode)
      }
    })

    if (look.path !== 'none' && visLatLngs.length >= 2) {
      if (pathRef.current) {
        pathRef.current.setLatLngs(visLatLngs)
        pathRef.current.options.smoothFactor = 0
        pathRef.current.setStyle({
          color: look.pathColor,
          dashArray: look.path === 'dashed' ? '8 8' : undefined,
        })
      } else {
        pathRef.current = L.polyline(visLatLngs, {
          color: look.pathColor,
          weight: 3,
          opacity: 0.9,
          smoothFactor: 0,
          dashArray: look.path === 'dashed' ? '8 8' : undefined,
        }).addTo(layer)
      }
    } else if (pathRef.current) {
      layer.removeLayer(pathRef.current)
      pathRef.current = null
    }

    const runLayout = () => {
      if (!mapRef.current) return
      const items = [...visible]
        .reverse()
        .map((stop, reverseIndex) => {
          const index = visible.length - 1 - reverseIndex
          const marker = markersRef.current.get(stop.id)
          if (!marker) return null
          const tone = labelTone(index, revealed, labelMode)
          const shown =
            Boolean(pinLabelText(
              {
                title: stop.title,
                date: stop.date ? formatDate(stop.date, stop.dateRaw) : stop.dateRaw,
                place: stop.place,
                notes: stop.notes,
              },
              look.fields,
            )) &&
            labelMode !== 'hidden' &&
            tone !== 'fading'
          return { marker, visible: shown }
        })
        .filter((row): row is { marker: L.Marker; visible: boolean } => Boolean(row))
      layoutStopLabels(map, items)
    }
    requestAnimationFrame(() => requestAnimationFrame(runLayout))
    map.on('zoomend', runLayout)
    map.on('moveend', runLayout)
    return () => {
      map.off('zoomend', runLayout)
      map.off('moveend', runLayout)
    }
  }, [stops, look, revealed, roads, labelMode])

  return (
    <div
      ref={containerRef}
      className="preview-map"
      role="img"
      aria-label="Trip preview map"
    />
  )
}

function paintLabel(
  el: HTMLElement,
  tone: ReturnType<typeof labelTone>,
  pinColor: string,
  mode: LabelMode,
) {
  const fill = pinFill(pinColor, labelFillAlpha(tone))
  el.style.setProperty('--label-fill', fill)
  el.style.backgroundColor = fill
  el.style.setProperty('--label-ink', pinInk(pinColor))
  el.classList.toggle('is-active', mode !== 'hidden' && tone === 'active')
  el.classList.toggle('is-fading', mode === 'play' && tone === 'fading')
  el.classList.toggle('is-hidden', mode === 'hidden')
  el.classList.remove('is-crowded')
}

function syncTooltip(
  marker: L.Marker,
  index: number,
  revealed: number,
  label: string,
  pinColor: string,
  mode: LabelMode,
) {
  const existing = marker.getTooltip()
  if (!label) {
    if (existing) marker.unbindTooltip()
    return
  }
  const tone = labelTone(index, revealed, mode)
  if (!existing) {
    marker.bindTooltip(escapeHtml(label), {
      permanent: true,
      direction: 'right',
      offset: [10, 0],
      opacity: 1,
      interactive: false,
      className: labelClassName(index, revealed, mode),
    })
    const tip = marker.getTooltip()
    const el = tip?.getElement()
    if (el) paintLabel(el, tone, pinColor, mode)
    tip?.setOpacity(mode === 'hidden' ? 1 : labelOpacity(tone, mode))
    return
  }
  existing.setContent(escapeHtml(label))
  existing.setOpacity(mode === 'hidden' ? 1 : labelOpacity(tone, mode))
  const el = existing.getElement()
  if (!el) return
  paintLabel(el, tone, pinColor, mode)
}

function pinIcon(n: number, look: Look, active: boolean): L.DivIcon {
  const cls = ['mm-pin', `is-${look.pin}`, active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')
  const size = look.pin === 'dot' ? 14 : look.pin === 'pin' ? 30 : 28
  const html =
    look.pin === 'dot'
      ? `<div class="${cls}" style="background:${look.pinColor}"></div>`
      : `<div class="${cls}" style="background:${look.pinColor}"><span>${n}</span></div>`
  return L.divIcon({
    className: 'mm-pin-wrap',
    html,
    iconSize: [size, size],
    iconAnchor: look.pin === 'pin' ? [size / 2, size] : [size / 2, size / 2],
    popupAnchor: look.pin === 'pin' ? [0, -size] : [0, -size / 2],
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

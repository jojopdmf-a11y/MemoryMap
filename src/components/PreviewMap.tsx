import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDate, stopLabel } from '../csv'
import { labelClassName, pinLabelText, popupInnerHtml, TILES, type Look } from '../look'
import type { Stop } from '../types'

type Props = {
  stops: Stop[]
  look: Look
  revealed: number
}

export function PreviewMap({ stops, look, revealed }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const tilesRef = useRef<L.TileLayer | null>(null)
  const plottedKey = stops
    .filter((stop) => !stop.dismissed && stop.lat != null && stop.lng != null)
    .map((stop) => `${stop.lat},${stop.lng}`)
    .join('|')

  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, { scrollWheelZoom: false, attributionControl: true })
    layerRef.current = L.layerGroup().addTo(map)
    map.setView([20, 0], 2)
    mapRef.current = map

    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
      tilesRef.current = null
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
      map.invalidateSize()
      if (latlngs.length === 1) {
        map.setView(latlngs[0], 6, { animate: false })
      } else if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs).pad(0.18), { animate: false })
      }
    })
  }, [plottedKey, stops])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    map.closePopup()
    layer.clearLayers()
    const plotted = stops.filter(
      (stop) => !stop.dismissed && stop.lat != null && stop.lng != null,
    )
    const visible = plotted.slice(0, Math.max(0, revealed))
    const visLatLngs = visible.map(
      (stop) => [stop.lat as number, stop.lng as number] as L.LatLngTuple,
    )

    if (look.path !== 'none' && visLatLngs.length >= 2) {
      L.polyline(visLatLngs, {
        color: look.pathColor,
        weight: 3,
        opacity: 0.9,
        dashArray: look.path === 'dashed' ? '8 8' : undefined,
      }).addTo(layer)
    }

    visible.forEach((stop, index) => {
      const active = index === visible.length - 1
      const marker = L.marker([stop.lat as number, stop.lng as number], {
        icon: pinIcon(index + 1, look, active),
        zIndexOffset: active ? 1000 : 0,
      })
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
      if (label) {
        marker.bindTooltip(escapeHtml(label), {
          permanent: true,
          direction: 'right',
          offset: [10, 0],
          opacity: 1,
          interactive: false,
          className: labelClassName(index, revealed),
        })
      }
      const html = popupInnerHtml(card, look.fields, escapeHtml)
      if (html) {
        marker.bindPopup(html, { autoPan: false })
      }
      marker.addTo(layer)
    })
  }, [stops, look, revealed])

  return (
    <div ref={containerRef} className="preview-map" role="img" aria-label="Trip preview map" />
  )
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

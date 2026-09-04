import leafletCss from 'leaflet/dist/leaflet.css?raw'
import leafletJs from 'leaflet/dist/leaflet.js?raw'
import { TILES, THEME_VARS, type Look } from './look'
import { dateRangeLabel } from './trip'
import type { ExportStop } from './types'

const RUNTIME = `
(function () {
  var trip = JSON.parse(document.getElementById("memorymap-trip").textContent);
  var stops = trip.stops || [];
  var look = trip.look || {};
  var fields = look.fields || {};
  var tiles = trip.tiles || {};
  var map = L.map("map", { zoomControl: true, scrollWheelZoom: false });
  var layerOpts = { attribution: tiles.attribution || "", maxZoom: 19 };
  if (tiles.subdomains) layerOpts.subdomains = tiles.subdomains;
  L.tileLayer(tiles.url, layerOpts).addTo(map);

  var layer = L.layerGroup().addTo(map);
  var revealed = 0;
  var playing = false;
  var timer = null;
  var speedMs = look.speedMs || 1500;

  function pinSize() {
    if (look.pin === "dot") return 14;
    if (look.pin === "pin") return 30;
    return 28;
  }

  function markerHtml(n, active) {
    var cls = "mm-pin is-" + (look.pin || "number") + (active ? " is-active" : "");
    var style = "background:" + (look.pinColor || "#8b3a2a");
    if (look.pin === "dot") {
      return '<div class="' + cls + '" style="' + style + '"></div>';
    }
    return '<div class="' + cls + '" style="' + style + '"><span>' + n + "</span></div>";
  }

  function iconFor(n, active) {
    var size = pinSize();
    var pin = look.pin === "pin";
    return L.divIcon({
      className: "mm-pin-wrap",
      html: markerHtml(n, active),
      iconSize: [size, size],
      iconAnchor: pin ? [size / 2, size] : [size / 2, size / 2],
      popupAnchor: pin ? [0, -size] : [0, -size / 2]
    });
  }

  function pinLabel(stop) {
    var bits = [];
    if (fields.title !== false && stop.title) bits.push(stop.title);
    if (fields.place !== false && stop.place && bits.indexOf(stop.place) === -1) bits.push(stop.place);
    if (fields.date !== false && stop.date) bits.push(stop.date);
    if (fields.notes !== false && stop.notes) bits.push(stop.notes);
    return bits.join(" · ");
  }

  function popupHtml(stop, n) {
    var heading = (fields.title !== false && stop.title)
      ? stop.title
      : (fields.place !== false && stop.place) ? stop.place : "";
    var bits = [];
    if (heading) bits.push("<strong>" + escapeHtml(heading) + "</strong>");
    var meta = [];
    if (fields.date !== false && stop.date) meta.push(stop.date);
    if (fields.place !== false && stop.place && stop.place !== heading) meta.push(stop.place);
    if (meta.length) bits.push("<p>" + escapeHtml(meta.join(" · ")) + "</p>");
    if (fields.notes !== false && stop.notes) bits.push("<p>" + escapeHtml(stop.notes) + "</p>");
    if (!bits.length) return "";
    bits.unshift("<span class=\\"mm-pop-num\\">" + n + "</span>");
    return '<div class="mm-pop">' + bits.join("") + "</div>";
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  var latlngs = stops.map(function (s) { return [s.lat, s.lng]; });
  if (latlngs.length === 1) {
    map.setView(latlngs[0], 6);
  } else if (latlngs.length > 1) {
    map.fitBounds(L.latLngBounds(latlngs).pad(0.18));
  } else {
    map.setView([20, 0], 2);
  }

  var playBtn = document.getElementById("mm-play");
  var resetBtn = document.getElementById("mm-reset");
  var scrub = document.getElementById("mm-scrub");
  var scrubLabel = document.getElementById("mm-scrub-label");
  var nowTitle = document.getElementById("mm-now-title");
  var nowMeta = document.getElementById("mm-now-meta");
  var nowNum = document.getElementById("mm-now-num");
  var list = document.getElementById("mm-list");
  var cue = document.getElementById("mm-cue");

  stops.forEach(function (stop, i) {
    var li = document.createElement("li");
    li.dataset.index = String(i);
    li.innerHTML =
      '<span class="mm-li-num">' + (i + 1) + "</span>" +
      '<div><strong>' + escapeHtml(stop.title) + "</strong>" +
      '<p>' + escapeHtml([stop.date, stop.place].filter(Boolean).join(" · ")) + "</p></div>";
    li.addEventListener("click", function () {
      pause();
      draw(i + 1);
    });
    list.appendChild(li);
  });

  if (stops.length === 0) {
    playBtn.disabled = true;
    resetBtn.disabled = true;
    if (scrub) scrub.disabled = true;
  } else if (scrub) {
    scrub.max = String(stops.length);
    scrub.value = "0";
  }

  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? "Pause" : "Play tour";
    playBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function pause() {
    setPlaying(false);
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      if (!playing) return;
      if (revealed >= stops.length) {
        pause();
        return;
      }
      draw(revealed + 1);
      schedule();
    }, speedMs);
  }

  function play() {
    if (stops.length === 0) return;
    if (revealed >= stops.length) draw(0);
    setPlaying(true);
    if (revealed === 0) draw(1);
    schedule();
  }

  function draw(count) {
    revealed = Math.max(0, Math.min(stops.length, count));
    map.closePopup();
    layer.clearLayers();
    var visible = stops.slice(0, revealed);
    var visLatLngs = visible.map(function (s) { return [s.lat, s.lng]; });
    if (look.path !== "none" && visLatLngs.length >= 2) {
      L.polyline(visLatLngs, {
        color: look.pathColor || "#8b3a2a",
        weight: 3,
        opacity: 0.9,
        dashArray: look.path === "dashed" ? "8 8" : undefined
      }).addTo(layer);
    }
    visible.forEach(function (stop, i) {
      var active = i === visible.length - 1;
      var html = popupHtml(stop, i + 1);
      var label = pinLabel(stop);
      var m = L.marker([stop.lat, stop.lng], {
        icon: iconFor(i + 1, active),
        zIndexOffset: active ? 1000 : 0
      });
      if (label) {
        m.bindTooltip(escapeHtml(label), {
          permanent: true,
          direction: "right",
          offset: [10, 0],
          opacity: 1,
          interactive: false,
          className: active ? "mm-label is-active" : "mm-label"
        });
      }
      if (html) m.bindPopup(html, { className: "mm-popup", autoPan: false });
      m.on("click", function () {
        pause();
        draw(i + 1);
      });
      m.addTo(layer);
    });

    var items = list.querySelectorAll("li");
    items.forEach(function (li, i) {
      li.classList.toggle("is-visible", i < revealed);
      li.classList.toggle("is-current", revealed > 0 && i === revealed - 1);
    });
    var current = revealed > 0 ? stops[revealed - 1] : null;
    nowNum.textContent = current ? String(revealed) : "–";
    nowTitle.textContent = current
      ? (fields.title !== false && current.title)
        ? current.title
        : (fields.place !== false && current.place) ? current.place : "Stop " + revealed
      : "Ready when you are";
    nowMeta.textContent = current
      ? [
          fields.date !== false ? current.date : "",
          fields.place !== false && current.place !== nowTitle.textContent ? current.place : ""
        ].filter(Boolean).join(" · ") || (stops.length + " stops")
      : stops.length + " stops waiting";
    if (scrub) scrub.value = String(revealed);
    if (scrubLabel) scrubLabel.textContent = revealed + " / " + stops.length;
    if (cue) cue.hidden = revealed > 0;
    var currentLi = list.querySelector("li.is-current");
    if (currentLi && list) {
      var top = currentLi.offsetTop - list.clientHeight / 2 + currentLi.clientHeight / 2;
      list.scrollTop = Math.max(0, top);
    }
  }

  playBtn.addEventListener("click", function () {
    if (playing) pause();
    else play();
  });
  resetBtn.addEventListener("click", function () {
    pause();
    draw(0);
  });
  if (scrub) {
    scrub.addEventListener("input", function () {
      pause();
      draw(Number(scrub.value));
    });
  }

  draw(0);
})();
`

export function buildSouvenirHtml(title: string, stops: ExportStop[], look: Look): string {
  const theme = THEME_VARS[look.theme]
  const tiles = TILES[look.map]
  const payload = JSON.stringify({ title, stops, look, tiles }).replace(/</g, '\\u003c')
  const range = dateRangeLabel(stops)
  const count = stops.length === 1 ? '1 stop' : `${stops.length} stops`

  return `<!DOCTYPE html>
<html lang="en" data-theme="${escapeHtml(look.theme)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} · MemoryMap</title>
  <style>
${leafletCss}

:root {
  --paper: ${theme.paper};
  --ink: ${theme.ink};
  --muted: ${theme.muted};
  --terra: ${theme.terra};
  --line: ${theme.line};
  --map-bg: ${theme.mapBg};
  --pin: ${look.pinColor};
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  font-family: Palatino, "Palatino Linotype", "Iowan Old Style", Georgia, serif;
  color: var(--ink);
  background: var(--paper);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.mm-stage {
  position: relative;
  width: min(100%, calc(75vh * 16 / 10));
  aspect-ratio: 16 / 10;
  margin: 0 auto;
  min-height: 220px;
}
#map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--map-bg);
}
.leaflet-container { font-family: inherit; background: var(--map-bg); }
.leaflet-tooltip.mm-label {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  font: 600 13px Palatino, Georgia, serif;
  padding: 4px 8px;
  white-space: nowrap;
}
.leaflet-tooltip.mm-label.is-active {
  background: var(--terra);
  color: var(--paper);
  border-color: var(--terra);
}
.leaflet-tooltip-right.mm-label::before { border-right-color: var(--paper); }
.leaflet-tooltip-right.mm-label.is-active::before { border-right-color: var(--terra); }
.mm-cue {
  position: absolute;
  z-index: 500;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  padding: 12px 18px;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  border: 1px solid var(--line);
  pointer-events: none;
}
.mm-chrome {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px 20px;
  align-items: end;
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--line);
}
.mm-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--terra);
}
.mm-chrome h1 {
  margin: 0;
  font-size: clamp(22px, 4vw, 32px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.mm-range {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
}
.mm-now {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: min(280px, 100%);
}
.mm-now-num {
  flex: none;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border-radius: 50%;
  background: var(--terra);
  color: var(--paper);
  font-size: 13px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.mm-now-title { margin: 0; font-size: 16px; }
.mm-now-meta { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.mm-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  grid-column: 1 / -1;
}
.mm-controls button {
  font-family: inherit;
  font-size: 14px;
  padding: 8px 12px;
  border: 1px solid var(--ink);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}
.mm-controls button#mm-play {
  background: var(--terra);
  color: var(--paper);
  border-color: var(--terra);
}
.mm-controls button:disabled { opacity: 0.4; cursor: default; }
.mm-scrub-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 180px;
  min-width: 140px;
  font-size: 13px;
  color: var(--muted);
}
#mm-scrub {
  flex: 1;
  accent-color: var(--terra);
  margin: 0;
}
#mm-scrub-label { font-variant-numeric: tabular-nums; min-width: 3.5em; }
.mm-list {
  list-style: none;
  margin: 0;
  padding: 8px 0 24px;
  overflow: auto;
  flex: 1;
  max-height: 44vh;
}
.mm-list li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  opacity: 0.45;
}
.mm-list li.is-visible { opacity: 1; }
.mm-list li.is-current {
  background: color-mix(in srgb, var(--terra) 16%, transparent);
  opacity: 1;
}
.mm-li-num {
  flex: none;
  width: 24px;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}
.mm-list strong { display: block; }
.mm-list p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.mm-credit {
  margin: 0;
  padding: 8px 20px 16px;
  font-size: 11px;
  color: var(--muted);
}
.mm-pin-wrap { background: none !important; border: none !important; }
.mm-pin {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--pin);
  color: var(--paper);
  font: 700 12px/1 Palatino, Georgia, serif;
  text-align: center;
  border: 2px solid var(--paper);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
}
.mm-pin.is-active {
  transform: scale(1.12);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--paper) 80%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.28);
}
.mm-pin.is-dot { width: 14px; height: 14px; }
.mm-pin.is-pin {
  width: 22px;
  height: 22px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}
.mm-pin.is-pin span {
  display: grid;
  place-items: center;
  height: 100%;
  transform: rotate(45deg);
  font-size: 11px;
}
.mm-pin.is-pin.is-active { transform: rotate(-45deg) scale(1.12); }
.leaflet-popup-content-wrapper, .leaflet-popup-tip {
  background: var(--paper);
  color: var(--ink);
  border-radius: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.mm-pop strong { display: block; font-size: 15px; margin-bottom: 4px; }
.mm-pop p { margin: 0 0 4px; color: var(--muted); font-size: 13px; }
.mm-pop-num {
  display: inline-block;
  min-width: 18px;
  padding: 0 5px;
  margin-bottom: 6px;
  background: var(--terra);
  color: var(--paper);
  font-size: 11px;
  font-weight: 700;
}
@media (max-width: 640px) {
  .mm-stage { width: 100%; min-height: 180px; }
  .mm-chrome { grid-template-columns: 1fr; }
}
  </style>
</head>
<body>
  <div class="mm-stage">
    <div id="map"></div>
    <p class="mm-cue" id="mm-cue">Press Play tour to watch the route appear</p>
  </div>
  <header class="mm-chrome">
    <div>
      <p class="mm-kicker">MemoryMap</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="mm-range">${escapeHtml([range, count].filter(Boolean).join(' · '))}</p>
    </div>
    <div class="mm-now">
      <span class="mm-now-num" id="mm-now-num">–</span>
      <div>
        <p class="mm-now-title" id="mm-now-title">Ready when you are</p>
        <p class="mm-now-meta" id="mm-now-meta">${escapeHtml(count)} waiting</p>
      </div>
    </div>
    <div class="mm-controls">
      <button type="button" id="mm-play" aria-pressed="false">Play tour</button>
      <button type="button" id="mm-reset">Reset</button>
      <label class="mm-scrub-wrap">
        <span id="mm-scrub-label">0 / ${stops.length}</span>
        <input id="mm-scrub" type="range" min="0" max="${stops.length}" value="0" aria-label="Scrub through the route" />
      </label>
    </div>
  </header>
  <ol class="mm-list" id="mm-list"></ol>
  <p class="mm-credit">A MemoryMap souvenir · tiles need the internet</p>
  <script type="application/json" id="memorymap-trip">${payload}</script>
  <script>${leafletJs}</script>
  <script>${RUNTIME}</script>
</body>
</html>
`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

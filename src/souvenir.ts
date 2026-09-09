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
  var map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.25,
    zoomDelta: 0.25
  });
  L.control.zoom({ position: "topright" }).addTo(map);
  var dateBox = document.getElementById("mm-date");
  var dateTitle = document.getElementById("mm-date-title");
  var dateVal = document.getElementById("mm-date-value");

  function prettyDate(raw) {
    var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(raw || "").trim());
    if (!m) return String(raw || "").trim();
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[+m[2] - 1] + " " + (+m[3]) + ", " + m[1];
  }
  var layerOpts = { attribution: tiles.attribution || "", maxZoom: 19 };
  if (tiles.subdomains) layerOpts.subdomains = tiles.subdomains;
  // Streets uses Carto so this still works from file:// (OSM tiles require a Referer).
  L.tileLayer(tiles.url, layerOpts).addTo(map);

  var layer = L.layerGroup().addTo(map);
  var markers = [];
  var pathLine = null;
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
    var style = "background:" + (look.pinColor || "#1f7a6a");
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

  function pinRgb(hex) {
    var raw = String(hex || "#1f7a6a").replace("#", "");
    if (raw.length === 3) raw = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
    var n = parseInt(raw, 16);
    if (!isFinite(n)) return { r: 139, g: 58, b: 42 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function applyLabelTone(m, i) {
    var tip = m.getTooltip && m.getTooltip();
    if (!tip) return;
    var age = revealed - (i + 1);
    tip.setOpacity(age >= 2 ? 0 : 1);
    var el = tip.getElement && tip.getElement();
    if (!el) return;
    var rgb = pinRgb(look.pinColor);
    var alpha = age <= 0 ? 0.72 : 0.5;
    var fill = "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alpha + ")";
    var lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    el.style.setProperty("--label-fill", fill);
    el.style.setProperty("--label-ink", lum > 0.62 ? "#16302c" : "#eef5f2");
    el.classList.toggle("is-active", age <= 0);
    el.classList.toggle("is-fading", age >= 2);
  }

  function draw(count) {
    revealed = Math.max(0, Math.min(stops.length, count));
    while (markers.length > revealed) {
      layer.removeLayer(markers.pop());
    }
    for (var i = markers.length; i < revealed; i++) {
      (function (index) {
        var stop = stops[index];
        var active = index === revealed - 1;
        var html = popupHtml(stop, index + 1);
        var label = pinLabel(stop);
        var m = L.marker([stop.lat, stop.lng], {
          icon: iconFor(index + 1, active),
          zIndexOffset: active ? 1000 : 0
        });
        if (label) {
          var age = revealed - (index + 1);
          var labelCls = "mm-label";
          if (age <= 0) labelCls += " is-active";
          else if (age >= 2) labelCls += " is-fading";
          m.bindTooltip(escapeHtml(label), {
            permanent: true,
            direction: "right",
            offset: [10, 0],
            opacity: 1,
            interactive: false,
            className: labelCls
          });
        }
        if (html) m.bindPopup(html, { className: "mm-popup", autoPan: false });
        m.on("click", function () {
          pause();
          draw(index + 1);
        });
        m.addTo(layer);
        markers.push(m);
      })(i);
    }
    markers.forEach(function (m, index) {
      var active = index === revealed - 1;
      var wasActive = m.options.zIndexOffset === 1000;
      if (wasActive !== active) {
        m.setIcon(iconFor(index + 1, active));
        m.setZIndexOffset(active ? 1000 : 0);
      }
      applyLabelTone(m, index);
    });
    var visLatLngs = stops.slice(0, revealed).map(function (s) { return [s.lat, s.lng]; });
    if (look.path !== "none" && visLatLngs.length >= 2) {
      if (pathLine) {
        pathLine.setLatLngs(visLatLngs);
      } else {
        pathLine = L.polyline(visLatLngs, {
          color: look.pathColor || "#1f7a6a",
          weight: 3,
          opacity: 0.9,
          dashArray: look.path === "dashed" ? "8 8" : undefined
        }).addTo(layer);
      }
    } else if (pathLine) {
      layer.removeLayer(pathLine);
      pathLine = null;
    }

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
    var dateText = current && current.date ? prettyDate(current.date) : "";
    if (dateBox && dateVal) {
      if (dateTitle) dateTitle.textContent = trip.title || "Untitled trip";
      dateVal.textContent = dateText;
      dateBox.hidden = !dateText;
    }
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
  margin: 24px auto 0;
  min-height: 220px;
  overflow: hidden;
  border-radius: 16px;
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
  --label-fill: rgba(31, 122, 106, 0.72);
  --label-ink: #eef5f2;
  background: var(--label-fill);
  color: var(--label-ink);
  border: 1px solid var(--label-fill);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  font: 600 13px Palatino, Georgia, serif;
  padding: 4px 8px;
  white-space: nowrap;
  transition: opacity 0.75s ease, background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}
.leaflet-tooltip.mm-label.is-fading {
  pointer-events: none;
}
.leaflet-tooltip-right.mm-label::before { border-right-color: var(--label-fill); }
.mm-date {
  position: absolute;
  z-index: 600;
  top: 12px;
  left: 12px;
  display: grid;
  gap: 2px;
  min-width: 8.5em;
  max-width: min(240px, calc(100% - 72px));
  padding: 8px 12px 9px;
  pointer-events: none;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  border: 1px solid var(--line);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
}
.mm-date[hidden] { display: none; }
.mm-date-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.mm-date-kicker {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 4px;
}
.mm-date-value { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
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
  border-radius: 12px;
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
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  border-radius: 10px;
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
  border-radius: 8px;
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
  border-radius: 8px;
}
@media (max-width: 640px) {
  .mm-stage { width: calc(100% - 24px); min-height: 180px; margin-top: 16px; }
  .mm-chrome { grid-template-columns: 1fr; }
}
  </style>
</head>
<body>
  <div class="mm-stage">
    <div id="map"></div>
    <aside class="mm-date" id="mm-date" hidden>
      <strong class="mm-date-title" id="mm-date-title"></strong>
      <span class="mm-date-kicker">Date</span>
      <strong class="mm-date-value" id="mm-date-value"></strong>
    </aside>
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

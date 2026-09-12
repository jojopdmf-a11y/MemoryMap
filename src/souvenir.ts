import leafletCss from 'leaflet/dist/leaflet.css?raw'
import leafletJs from 'leaflet/dist/leaflet.js?raw'
import { TILES, THEME_VARS, type Look } from './look'
import { traceDriveLegs, type LatLng } from './route'
import { CONTACT_EMAIL, CONTACT_MAILTO, INSTAGRAM_URL } from './site'
import { dateRangeLabel } from './trip'
import type { ExportStop } from './types'

const RUNTIME = `
(function () {
  var trip = JSON.parse(document.getElementById("memorymap-trip").textContent);
  var stops = trip.stops || [];
  var look = trip.look || {};
  var fields = look.fields || {};
  var tiles = trip.tiles || {};
  var hosted = trip.hosted || "";
  var roads = trip.roads || null;
  if (hosted && location.protocol === "file:") {
    var handheld =
      /Android|webOS|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (handheld) {
      location.replace(hosted);
      return;
    }
  }
  var map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.25,
    zoomDelta: 0.25
  });
  L.control.zoom({ position: "topright" }).addTo(map);
  var mapEl = document.getElementById("map");
  if (mapEl) {
    mapEl.addEventListener("mouseenter", function () { map.scrollWheelZoom.enable(); });
    mapEl.addEventListener("mouseleave", function () { map.scrollWheelZoom.disable(); });
  }
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
  // Streets uses Esri so this still works from file:// (OSM tiles require a Referer).
  L.tileLayer(tiles.url, layerOpts).addTo(map);
  function kickMap() {
    try { map.invalidateSize(); } catch (err) {}
    try { layoutLabels(); } catch (err) {}
  }
  kickMap();
  window.addEventListener("load", kickMap);
  window.addEventListener("orientationchange", kickMap);
  window.addEventListener("resize", kickMap);
  window.setTimeout(kickMap, 200);
  window.setTimeout(kickMap, 800);
  map.on("zoomend", layoutLabels);
  map.on("moveend", layoutLabels);

  var layer = L.layerGroup().addTo(map);
  var markers = [];
  var pathLine = null;
  var revealed = 0;
  var playing = false;
  var showLocations = true;
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
  var locBtn = document.getElementById("mm-locations");

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
    if (locBtn) locBtn.disabled = true;
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
        draw(revealed);
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

  function pathThroughStops(count) {
    var n = Math.max(0, Math.min(count, stops.length));
    if (n < 2) return [];
    if (!roads) {
      return stops.slice(0, n).map(function (s) { return [s.lat, s.lng]; });
    }
    var out = [];
    for (var i = 0; i < n - 1; i++) {
      var leg = roads[i];
      var stop = stops[i];
      var next = stops[i + 1];
      var use = (leg && leg.length >= 2)
        ? leg
        : [[stop.lat, stop.lng], [next.lat, next.lng]];
      if (out.length === 0) out.push.apply(out, use);
      else out.push.apply(out, use.slice(1));
    }
    return out;
  }

  function tourDone() {
    return revealed >= stops.length && stops.length > 0 && !playing;
  }

  function applyLabelTone(m, i) {
    var tip = m.getTooltip && m.getTooltip();
    if (!tip) return;
    var mode = tourDone() ? (showLocations ? "all" : "hidden") : "play";
    var age = revealed - (i + 1);
    var hidden = mode === "hidden";
    var fading = mode === "play" && age >= 2;
    var active = !hidden && age <= 0;
    tip.setOpacity(hidden ? 1 : fading ? 0 : 1);
    var el = tip.getElement && tip.getElement();
    if (!el) return;
    var rgb = pinRgb(look.pinColor);
    var fill = "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.5)";
    var lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    el.style.setProperty("--label-fill", fill);
    el.style.backgroundColor = fill;
    el.style.setProperty("--label-ink", lum > 0.62 ? "#16302c" : "#eef5f2");
    el.classList.toggle("is-active", active);
    el.classList.toggle("is-fading", fading);
    el.classList.toggle("is-hidden", hidden);
    el.classList.remove("is-crowded");
  }

  var LABEL_DIRS = [
    { direction: "right", offset: [10, 0] },
    { direction: "left", offset: [-10, 0] },
    { direction: "top", offset: [0, -12] },
    { direction: "bottom", offset: [0, 12] }
  ];

  function layoutLabels() {
    if (!markers) return;
    var mapBox = map.getContainer().getBoundingClientRect();
    var placed = [];
    var mode = tourDone() ? (showLocations ? "all" : "hidden") : "play";
    for (var i = markers.length - 1; i >= 0; i--) {
      var m = markers[i];
      var tip = m.getTooltip && m.getTooltip();
      var el = tip && tip.getElement && tip.getElement();
      if (!el || !tip) continue;
      var age = revealed - (i + 1);
      var fading = mode === "play" && age >= 2;
      var hidden = mode === "hidden";
      var shown = !hidden && !fading;
      el.classList.remove("is-crowded");
      if (!shown) continue;
      tip.setOpacity(1);
      var found = false;
      for (var d = 0; d < LABEL_DIRS.length; d++) {
        var dir = LABEL_DIRS[d];
        tip.options.direction = dir.direction;
        tip.options.offset = L.point(dir.offset[0], dir.offset[1]);
        if (typeof tip._updatePosition === "function") tip._updatePosition();
        var rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        var hit = false;
        for (var p = 0; p < placed.length; p++) {
          if (rectsOverlap(rect, placed[p])) { hit = true; break; }
        }
        var inside =
          rect.left >= mapBox.left + 6 &&
          rect.right <= mapBox.right - 6 &&
          rect.top >= mapBox.top + 6 &&
          rect.bottom <= mapBox.bottom - 6;
        if (!hit && inside) {
          placed.push(rect);
          found = true;
          break;
        }
      }
      if (!found) {
        el.classList.add("is-crowded");
        tip.setOpacity(0);
      }
    }
  }

  function rectsOverlap(a, b, gap) {
    gap = gap == null ? 6 : gap;
    return a.left < b.right + gap && a.right + gap > b.left &&
      a.top < b.bottom + gap && a.bottom + gap > b.top;
  }

  function syncLocationsBtn() {
    if (!locBtn) return;
    var done = tourDone();
    locBtn.disabled = !done;
    locBtn.setAttribute("aria-pressed", done && showLocations ? "true" : "false");
    locBtn.title = done
      ? (showLocations
        ? "Hide the location banners. Pins and the route stay."
        : "Show the location banners")
      : "Available after the tour finishes";
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
    var visLatLngs = pathThroughStops(revealed);
    if (look.path !== "none" && visLatLngs.length >= 2) {
      if (pathLine) {
        pathLine.setLatLngs(visLatLngs);
      } else {
        pathLine = L.polyline(visLatLngs, {
          color: look.pathColor || "#1f7a6a",
          weight: 3,
          opacity: 0.9,
          smoothFactor: 0,
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
    syncLocationsBtn();
    requestAnimationFrame(function () {
      requestAnimationFrame(layoutLabels);
    });
  }

  playBtn.addEventListener("click", function () {
    if (playing) pause();
    else play();
  });
  resetBtn.addEventListener("click", function () {
    pause();
    showLocations = true;
    draw(0);
  });
  if (locBtn) {
    locBtn.addEventListener("click", function () {
      if (!tourDone()) return;
      showLocations = !showLocations;
      markers.forEach(function (m, index) { applyLabelTone(m, index); });
      syncLocationsBtn();
    });
  }
  if (scrub) {
    scrub.addEventListener("input", function () {
      pause();
      draw(Number(scrub.value));
    });
  }

  var keepUrl = hosted || ((location.protocol === "https:" || location.protocol === "http:")
    ? location.href.split("#")[0]
    : "");
  var shareBtn = document.getElementById("mm-share");
  var copyBtn = document.getElementById("mm-copy");
  var saveBtn = document.getElementById("mm-save");
  var note = document.getElementById("mm-note");
  var noteLink = document.getElementById("mm-note-link");
  var noteLinkWrap = document.getElementById("mm-note-link-wrap");
  var noteDismiss = document.getElementById("mm-note-dismiss");
  if (noteLink && noteLinkWrap && keepUrl) {
    noteLink.href = keepUrl;
    noteLinkWrap.hidden = false;
  }
  if (noteDismiss && note) {
    noteDismiss.addEventListener("click", function () {
      note.hidden = true;
      var workspace = document.querySelector(".mm-workspace");
      if (workspace) workspace.classList.add("is-note-gone");
      kickMap();
    });
  }
  if (shareBtn) {
    if (!keepUrl || !navigator.share) shareBtn.hidden = true;
    else {
      shareBtn.addEventListener("click", function () {
        navigator.share({
          title: trip.title || "MemoryMap",
          text: trip.title || "MemoryMap",
          url: keepUrl
        }).catch(function () {});
      });
    }
  }
  if (copyBtn) {
    if (!keepUrl) copyBtn.hidden = true;
    else {
      copyBtn.addEventListener("click", function () {
        function done() {
          copyBtn.textContent = "Copied";
          window.setTimeout(function () { copyBtn.textContent = "Copy link"; }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(keepUrl).then(done).catch(function () {
            window.prompt("Copy this map link", keepUrl);
          });
        } else {
          window.prompt("Copy this map link", keepUrl);
        }
      });
    }
  }
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var slug = String(trip.title || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trip";
      var blob = new Blob(["<!DOCTYPE html>\\n" + document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "MemoryMap-" + slug + ".html";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  }

  var feedbackBtn = document.getElementById("mm-feedback-btn");
  var feedbackForm = document.getElementById("mm-feedback-form");
  var feedbackComment = document.getElementById("mm-feedback-comment");
  var feedbackEmail = document.getElementById("mm-feedback-email");
  var feedbackError = document.getElementById("mm-feedback-error");
  var feedbackSend = document.getElementById("mm-feedback-send");
  function feedbackEndpoint() {
    var host = location.hostname || "";
    if (location.protocol === "http:" || location.protocol === "https:") {
      if (
        host === "memorymap.world" ||
        host === "www.memorymap.world" ||
        host === "localhost" ||
        host === "127.0.0.1"
      ) {
        return location.origin + "/api/feedback";
      }
    }
    return "https://memorymap.world/api/feedback";
  }
  function mailtoFeedback(comment, email) {
    var body = comment + (email ? "\\n\\nReply to: " + email : "");
    location.href = "mailto:hello@memorymap.world?subject=" +
      encodeURIComponent("MemoryMap feedback") +
      "&body=" + encodeURIComponent(body);
  }
  if (feedbackBtn && feedbackForm) {
    feedbackBtn.addEventListener("click", function () {
      feedbackForm.hidden = !feedbackForm.hidden;
      feedbackBtn.setAttribute("aria-expanded", feedbackForm.hidden ? "false" : "true");
    });
    feedbackForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var comment = ((feedbackComment && feedbackComment.value) || "").trim();
      var email = ((feedbackEmail && feedbackEmail.value) || "").trim();
      if (comment.length < 2) return;
      if (feedbackError) {
        feedbackError.hidden = true;
        feedbackError.textContent = "";
      }
      if (feedbackSend) {
        feedbackSend.disabled = true;
        feedbackSend.textContent = "Sending…";
      }
      fetch(feedbackEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment, email: email, source: "souvenir" })
      }).then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        }).catch(function () {
          return { ok: res.ok, data: {} };
        });
      }).then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || "Could not send that note.");
        feedbackForm.innerHTML = "<p>Thanks. We read these at <a href=\\"mailto:hello@memorymap.world\\">hello@memorymap.world</a>.</p>";
        feedbackBtn.setAttribute("aria-expanded", "false");
      }).catch(function (err) {
        if (feedbackSend) {
          feedbackSend.disabled = false;
          feedbackSend.textContent = "Send note";
        }
        if (feedbackError) {
          feedbackError.hidden = false;
          feedbackError.textContent = (err && err.message) || "Could not send that note. Try hello@memorymap.world.";
        } else {
          mailtoFeedback(comment, email);
        }
      });
    });
  }

  draw(0);
})();
`

export async function htmlForSouvenir(
  title: string,
  stops: ExportStop[],
  look: Look,
  hostedUrl = '',
  knownRoads: LatLng[][] | null = null,
): Promise<string> {
  let roads: LatLng[][] | null = null
  if (look.followRoads && stops.length >= 2) {
    try {
      roads = await traceDriveLegs(stops)
    } catch {
      roads = knownRoads
    }
  }
  return buildSouvenirHtml(title, stops, look, hostedUrl, roads)
}

export function buildSouvenirHtml(
  title: string,
  stops: ExportStop[],
  look: Look,
  hostedUrl = '',
  roads: LatLng[][] | null = null,
): string {
  const theme = THEME_VARS[look.theme]
  const tiles = TILES[look.map]
  const payload = JSON.stringify({
    title,
    stops,
    look,
    tiles,
    hosted: hostedUrl,
    roads: look.followRoads ? roads : null,
  }).replace(/</g, '\\u003c')
  const range = dateRangeLabel(stops)
  const count = stops.length === 1 ? '1 stop' : `${stops.length} stops`

  return `<!DOCTYPE html>
<html lang="en" data-theme="${escapeHtml(look.theme)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  ${hostedUrl ? `<noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(hostedUrl)}"></noscript>` : ''}
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
.mm-workspace {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 8px 0;
  width: 100%;
  box-sizing: border-box;
}
.mm-stage {
  position: relative;
  flex: 0 0 auto;
  width: min(calc((100vh - 16px) * 16 / 10), calc(100vw - 16px - 19rem));
  aspect-ratio: 16 / 10;
  height: auto;
  margin: 0;
  min-height: 240px;
  overflow: hidden;
  border-radius: 16px;
}
.mm-play-rail {
  flex: 0 0 8.75rem;
  width: 8.75rem;
  display: grid;
  align-content: start;
  gap: 6px;
}
.mm-play-rail button,
.mm-play-rail a.mm-instagram {
  font-family: inherit;
  font-size: 14px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  border-radius: 10px;
  width: 100%;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.mm-play-rail a.mm-instagram {
  display: block;
  box-sizing: border-box;
  text-align: center;
  text-decoration: none;
}
.mm-play-rail a.mm-instagram:hover {
  color: var(--terra);
  border-color: var(--terra);
}
.mm-play-rail button#mm-play {
  background: var(--terra);
  color: var(--paper);
  border-color: var(--terra);
}
.mm-play-rail button#mm-locations[aria-pressed="true"] {
  background: var(--terra);
  color: var(--paper);
  border-color: var(--terra);
}
.mm-play-rail button:disabled { opacity: 0.4; cursor: default; }
.mm-rail {
  flex: 0 0 9.5rem;
  width: 9.5rem;
  display: grid;
  align-content: start;
  gap: 6px;
}
.mm-workspace.is-note-gone .mm-rail {
  flex-basis: auto;
  width: auto;
}
.mm-workspace.is-note-gone .mm-stage {
  width: min(calc((100vh - 16px) * 16 / 10), calc(100vw - 16px - 14.5rem));
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
  --label-fill: rgba(31, 122, 106, 0.5);
  --label-ink: #eef5f2;
  background: var(--label-fill) !important;
  color: var(--label-ink);
  border: 1px solid var(--label-fill);
  border-radius: 6px;
  box-shadow: none;
  font: 600 13px Palatino, Georgia, serif;
  padding: 4px 8px;
  white-space: nowrap;
  transition: opacity 0.75s ease, background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}
.leaflet-tooltip.mm-label.is-fading {
  pointer-events: none;
}
.leaflet-tooltip.mm-label.is-hidden,
.leaflet-tooltip.mm-label.is-crowded {
  pointer-events: none;
  opacity: 0 !important;
}
.leaflet-tooltip-right.mm-label::before { border-right-color: var(--label-fill); }
.leaflet-tooltip-left.mm-label::before { border-left-color: var(--label-fill); }
.leaflet-tooltip-top.mm-label::before { border-top-color: var(--label-fill); }
.leaflet-tooltip-bottom.mm-label::before { border-bottom-color: var(--label-fill); }
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
  padding: 14px 20px 8px;
  border-bottom: none;
}
.mm-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--terra);
}
.mm-kicker a {
  color: var(--terra);
  text-decoration: underline;
  text-underline-offset: 2px;
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
.mm-scrub-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px 12px;
  border-bottom: 1px solid var(--line);
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
.mm-credit a {
  color: var(--terra);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.mm-note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 82%, var(--terra) 10%);
  border-radius: 12px;
}
.mm-note[hidden] { display: none; }
.mm-note-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--terra);
}
.mm-note p {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--ink);
}
.mm-note p + p { margin-top: 6px; }
.mm-note a { color: var(--terra); }
#mm-note-dismiss {
  flex: none;
  align-self: flex-start;
  font-family: inherit;
  font-size: 11px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  border-radius: 8px;
  touch-action: manipulation;
}
.mm-feedback {
  position: relative;
  width: max-content;
  max-width: 100%;
}
.mm-feedback button,
.mm-feedback textarea,
.mm-feedback input {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
#mm-feedback-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  padding: 6px 8px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 88%, white);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  box-shadow: none;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
}
#mm-feedback-form {
  display: grid;
  gap: 8px;
  width: min(16rem, calc(100vw - 24px));
  max-height: min(18rem, 46vh);
  overflow: auto;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.09);
}
#mm-feedback-form[hidden] { display: none; }
#mm-feedback-form p { margin: 0; font-size: 13px; line-height: 1.4; color: var(--muted); }
#mm-feedback-form a { color: var(--terra); }
#mm-feedback-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}
#mm-feedback-form textarea,
#mm-feedback-form input {
  font-size: 15px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 72%, white);
  color: var(--ink);
  border-radius: 8px;
}
#mm-feedback-form textarea { min-height: 6.5rem; resize: vertical; }
#mm-feedback-send {
  justify-self: start;
  padding: 9px 14px;
  border: 1px solid var(--terra);
  background: var(--terra);
  color: var(--paper);
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
}
#mm-feedback-send:disabled { opacity: 0.4; cursor: default; }
#mm-feedback-error {
  margin: 0;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--terra) 45%, transparent);
  background: color-mix(in srgb, var(--terra) 12%, transparent);
  border-radius: 8px;
  color: var(--ink);
  font-size: 13px;
}
#mm-feedback-error[hidden] { display: none; }
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
@media (max-width: 960px) {
  .mm-workspace {
    flex-direction: column;
    align-items: center;
  }
  .mm-play-rail {
    flex: none;
    width: min(100%, 22rem);
    grid-template-columns: repeat(3, 1fr);
  }
  .mm-stage {
    width: min(100%, calc((100vh - 16px) * 16 / 10));
  }
  .mm-workspace.is-note-gone .mm-stage {
    width: min(100%, calc((100vh - 16px) * 16 / 10));
  }
  .mm-rail,
  .mm-workspace.is-note-gone .mm-rail {
    flex: none;
    width: min(100%, 16rem);
  }
}
@media (max-width: 640px) {
  .mm-workspace { padding: 16px 12px 0; }
  .mm-stage { width: calc(100% - 24px); min-height: 180px; }
  .mm-chrome { grid-template-columns: 1fr; }
}
  </style>
</head>
<body>
  <div class="mm-workspace">
    <nav class="mm-play-rail" aria-label="Map controls">
      <button type="button" id="mm-play" aria-pressed="false">Play tour</button>
      <button type="button" id="mm-reset">Reset</button>
      <button type="button" id="mm-locations" aria-pressed="false" disabled title="Available after the tour finishes">Locations</button>
      <button type="button" id="mm-share">Share</button>
      <button type="button" id="mm-copy">Copy link</button>
      <button type="button" id="mm-save">Save file</button>
      <a class="mm-instagram" href="${escapeHtml(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">Instagram</a>
    </nav>
    <div class="mm-stage">
      <div id="map"></div>
      <aside class="mm-date" id="mm-date" hidden>
        <strong class="mm-date-title" id="mm-date-title"></strong>
        <span class="mm-date-kicker">Date</span>
        <strong class="mm-date-value" id="mm-date-value"></strong>
      </aside>
      <p class="mm-cue" id="mm-cue">Press Play tour to watch the route appear</p>
    </div>
    <div class="mm-rail">
      <aside class="mm-note" id="mm-note">
        <div>
          <p class="mm-note-kicker">Your souvenir</p>
            <p>Play tour to watch the route. Share or Copy link to keep it. On a phone, use the link.</p>
          <p id="mm-note-link-wrap"${hostedUrl ? '' : ' hidden'}>
            <a id="mm-note-link" href="${hostedUrl ? escapeHtml(hostedUrl) : '#'}">Open the keepable copy on memorymap.world</a>
          </p>
        </div>
        <button type="button" id="mm-note-dismiss">Got it</button>
      </aside>
      <div class="mm-feedback">
          <button type="button" id="mm-feedback-btn" aria-expanded="false" aria-controls="mm-feedback-form">Feedback</button>
        <form id="mm-feedback-form" hidden>
          <p>Tell us what to improve. You can also write <a href="${CONTACT_MAILTO}">${escapeHtml(CONTACT_EMAIL)}</a>.</p>
          <label>
            Comment
            <textarea id="mm-feedback-comment" rows="5" required placeholder="What should we change or add?"></textarea>
          </label>
          <label>
            Email for a reply (optional)
            <input id="mm-feedback-email" type="email" autocomplete="email" placeholder="you@example.com" />
          </label>
          <p id="mm-feedback-error" hidden></p>
          <button type="submit" id="mm-feedback-send">Send note</button>
        </form>
      </div>
    </div>
  </div>
  <header class="mm-chrome">
    <div>
      <p class="mm-kicker">MemoryMap · <a href="${escapeHtml(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">Instagram</a></p>
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
  </header>
  <label class="mm-scrub-wrap">
    <span id="mm-scrub-label">0 / ${stops.length}</span>
    <input id="mm-scrub" type="range" min="0" max="${stops.length}" value="0" aria-label="Scrub through the route" />
  </label>
  <ol class="mm-list" id="mm-list"></ol>
  <p class="mm-credit">A MemoryMap souvenir · <a href="${escapeHtml(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">Instagram</a> · tiles need the internet</p>
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

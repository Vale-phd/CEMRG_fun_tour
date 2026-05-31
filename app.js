(function () {
  "use strict";

  const listEl = document.getElementById("siteList");
  const statusEl = document.getElementById("locStatus");
  const mapEl = document.getElementById("map");
  const promptEl = document.getElementById("arrivePrompt");
  const promptText = document.getElementById("arriveText");
  const promptListen = document.getElementById("arriveListen");
  const promptDismiss = document.getElementById("arriveDismiss");

  const DEFAULT_RADIUS = 40; // metres; "you're here" threshold
  const TRACE = location.hash.toLowerCase().indexOf("trace") !== -1;
  const POI = location.hash.toLowerCase().indexOf("poi") !== -1;

  // ---- list cards ----
  const cards = SITES.map(buildCard);
  let currentOrder = "";
  render(SITES.map((site, i) => ({ site, card: cards[i], dist: null })));

  // ---- map ----
  const map = L.map(mapEl, { zoomControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  let routeLayer = null;
  if (typeof ROUTE !== "undefined" && ROUTE.length > 1) {
    routeLayer = L.polyline(ROUTE, { color: "#7a5c3e", weight: 5, opacity: 0.85, interactive: false }).addTo(map);
    map.fitBounds(routeLayer.getBounds(), { padding: [28, 28] });
  } else {
    map.setView([51.2794, 1.0826], 15);
  }

  const stopMarkers = POI ? [] : SITES.map((site, i) => {
    const hasAudio = !!(site.audio && site.audio.length);
    const icon = L.divIcon({
      className: "stop-pin",
      html: '<span class="stop-pin__n' + (hasAudio ? "" : " stop-pin__n--mute") + '">' + (i + 1) + "</span>",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const marker = L.marker([site.lat, site.lng], { icon, title: site.name, interactive: !TRACE })
      .addTo(map)
      .bindTooltip((i + 1) + ". " + site.name, { direction: "top", offset: [0, -12] });
    if (!TRACE) marker.on("click", () => openCard(i, false));
    return marker;
  });

  setTimeout(() => map.invalidateSize(), 200);

  // ---- live location + recenter ----
  let liveMarker = null;
  let accuracyCircle = null;
  let autoCenter = !(TRACE || POI);

  const Recenter = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
      const btn = L.DomUtil.create("button", "recenter-btn");
      btn.type = "button";
      btn.innerHTML = "◎";
      btn.title = "Recentre on me";
      btn.setAttribute("aria-label", "Recentre on my location");
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, "click", () => {
        autoCenter = true;
        if (liveMarker) map.setView(liveMarker.getLatLng(), Math.max(map.getZoom(), 16));
      });
      return btn;
    },
  });
  map.addControl(new Recenter());
  map.on("dragstart", () => { autoCenter = false; });

  startLocation();
  if (POI) setupPoi();
  else if (TRACE) setupTrace();

  // ---- arrival prompt ----
  let activePromptId = null;
  const prompted = new Set();

  promptDismiss.addEventListener("click", hidePrompt);
  promptListen.addEventListener("click", () => {
    const i = SITES.findIndex((s) => s.id === activePromptId);
    hidePrompt();
    if (i >= 0) openCard(i, true);
  });

  function showPrompt(site) {
    activePromptId = site.id;
    promptText.textContent = "You’re at " + site.name;
    promptEl.hidden = false;
  }

  function hidePrompt() {
    promptEl.hidden = true;
    activePromptId = null;
  }

  // ---- open a card (scroll into view, optionally play) ----
  function openCard(index, play) {
    const card = cards[index];
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("is-focused");
    setTimeout(() => card.classList.remove("is-focused"), 2200);
    if (play) {
      const audio = card.querySelector("audio");
      if (audio) audio.play().catch(() => {});
    }
  }

  // ---- cards ----
  function buildCard(site, i) {
    const li = document.createElement("li");
    li.className = "card";

    const media = document.createElement("div");
    media.className = "card__media";
    if (site.image) {
      const img = document.createElement("img");
      img.src = site.image;
      img.alt = site.name;
      img.loading = "lazy";
      media.appendChild(img);
    } else {
      media.classList.add("card__media--plain");
      const label = document.createElement("span");
      label.className = "card__media-label";
      label.textContent = site.name;
      media.appendChild(label);
    }

    const dist = document.createElement("span");
    dist.className = "card__distance";
    dist.hidden = true;
    media.appendChild(dist);
    li.appendChild(media);

    const body = document.createElement("div");
    body.className = "card__body";

    const name = document.createElement("h2");
    name.className = "card__name";
    name.textContent = (i + 1) + ". " + site.name;
    body.appendChild(name);

    const blurb = document.createElement("p");
    blurb.className = "card__blurb";
    blurb.textContent = site.blurb;
    body.appendChild(blurb);

    if (site.audio && site.audio.length) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.src = site.audio[0].file;
      if (site.audio.length > 1) {
        body.appendChild(buildVoiceSwitcher(site, audio));
      }
      body.appendChild(audio);
    } else {
      const soon = document.createElement("p");
      soon.className = "card__soon";
      soon.textContent = "Narration coming soon";
      body.appendChild(soon);
    }

    if (site.song && site.song.file) {
      body.appendChild(buildSong(site.song));
    }
    li.appendChild(body);

    li._distEl = dist;
    return li;
  }

  function buildVoiceSwitcher(site, audio) {
    const wrap = document.createElement("div");
    wrap.className = "voices";

    const label = document.createElement("span");
    label.className = "voice-label";
    label.textContent = "Voice:";
    wrap.appendChild(label);

    site.audio.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "voice-btn";
      btn.textContent = opt.label;
      btn.setAttribute("aria-pressed", String(i === 0));
      btn.addEventListener("click", () => {
        if (audio.src.endsWith(opt.file)) return;
        const wasPlaying = !audio.paused && !audio.ended;
        audio.src = opt.file;
        audio.load();
        wrap.querySelectorAll(".voice-btn").forEach((b) =>
          b.setAttribute("aria-pressed", String(b === btn))
        );
        if (wasPlaying) audio.play().catch(() => {});
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function buildSong(song) {
    const wrap = document.createElement("div");
    wrap.className = "song";

    const label = document.createElement("span");
    label.className = "song__label";
    label.textContent = song.title ? "Song · " + song.title : "Theme song";
    wrap.appendChild(label);

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.className = "song__audio";
    audio.src = song.file;
    audio.addEventListener("error", () => wrap.remove());
    wrap.appendChild(audio);
    return wrap;
  }

  function render(entries) {
    const order = entries.map((e) => e.site.id).join(",");
    if (order === currentOrder) return;
    currentOrder = order;
    listEl.replaceChildren(...entries.map((e) => e.card));
  }

  // ---- geolocation ----
  function startLocation() {
    if (!("geolocation" in navigator)) {
      statusEl.textContent =
        "Location isn’t available here — just pick the site you’re standing at.";
      return;
    }
    navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000,
    });
  }

  function onPosition(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    const here = [latitude, longitude];

    if (!liveMarker) {
      liveMarker = L.marker(here, {
        icon: L.divIcon({
          className: "live-dot",
          html: '<span class="live-dot__core"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
      accuracyCircle = L.circle(here, {
        radius: accuracy || 0,
        className: "accuracy-circle",
        stroke: false,
        fillOpacity: 0.12,
      }).addTo(map);
      if (autoCenter) map.setView(here, Math.max(map.getZoom(), 16));
    } else {
      liveMarker.setLatLng(here);
      accuracyCircle.setLatLng(here).setRadius(accuracy || 0);
      if (autoCenter) map.panTo(here);
    }

    const entries = SITES.map((site, i) => ({
      site,
      card: cards[i],
      dist: haversine(latitude, longitude, site.lat, site.lng),
    }));
    entries.sort((a, b) => a.dist - b.dist);

    entries.forEach(({ site, card, dist }) => {
      const el = card._distEl;
      el.hidden = false;
      const near = dist <= (site.radius || DEFAULT_RADIUS);
      el.textContent = near ? "You’re here" : formatDistance(dist);
      el.classList.toggle("is-near", near);
    });

    statusEl.textContent = "Sorted by nearest — walk up to a site and press play.";
    render(entries);

    // arrival prompt for the nearest stop within its radius
    if (!TRACE && !POI) {
      entries.forEach(({ site, dist }) => {
        if (dist > (site.radius || DEFAULT_RADIUS) * 1.6) prompted.delete(site.id);
      });
      const nearest = entries.find(
        (e) => e.site.audio && e.site.audio.length && e.dist <= (e.site.radius || DEFAULT_RADIUS)
      );
      if (nearest && !prompted.has(nearest.site.id) && activePromptId !== nearest.site.id) {
        prompted.add(nearest.site.id);
        showPrompt(nearest.site);
      }
    }
  }

  function onError(err) {
    statusEl.textContent =
      err.code === err.PERMISSION_DENIED
        ? "Location is off — no problem, just pick the site you’re at."
        : "Couldn’t get a location fix — just pick the site you’re at.";
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function formatDistance(m) {
    if (m < 1000) return `${Math.round(m / 10) * 10} m away`;
    return `${(m / 1000).toFixed(1)} km away`;
  }

  // ---- trace mode (append #trace to the URL): tap the route, copy the coords ----
  function setupTrace() {
    if (routeLayer) routeLayer.setStyle({ opacity: 0.3, dashArray: "4 6" });
    const pts = [];
    const line = L.polyline([], { color: "#d63b2f", weight: 4, interactive: false }).addTo(map);
    const dots = L.layerGroup().addTo(map);

    const bar = document.createElement("div");
    bar.className = "trace-bar";
    bar.innerHTML =
      '<span class="trace-bar__msg">Trace mode — tap along the road (corners + a few midpoints). ' +
      '<b id="traceN">0</b> points</span>';
    ["Undo", "Clear", "Copy"].forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.id = "trace" + name;
      b.textContent = name;
      bar.appendChild(b);
    });
    document.body.appendChild(bar);

    const out = document.createElement("textarea");
    out.className = "trace-out";
    out.readOnly = true;
    out.hidden = true;
    document.body.appendChild(out);

    const nEl = bar.querySelector("#traceN");
    function redraw() {
      line.setLatLngs(pts);
      dots.clearLayers();
      pts.forEach((p) =>
        L.circleMarker(p, {
          radius: 4, color: "#d63b2f", weight: 2, fillColor: "#fff", fillOpacity: 1, interactive: false,
        }).addTo(dots)
      );
      nEl.textContent = String(pts.length);
    }

    map.on("click", (e) => {
      pts.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]);
      out.hidden = true;
      redraw();
    });
    bar.querySelector("#traceUndo").onclick = () => { pts.pop(); out.hidden = true; redraw(); };
    bar.querySelector("#traceClear").onclick = () => { pts.length = 0; out.hidden = true; redraw(); };
    bar.querySelector("#traceCopy").onclick = () => {
      const body = pts.map((p) => "  [" + p[0] + ", " + p[1] + "]").join(",\n");
      out.value = "const ROUTE = [\n" + body + ",\n];";
      out.hidden = false;
      out.focus();
      out.select();
      if (navigator.clipboard) navigator.clipboard.writeText(out.value).catch(() => {});
    };
  }

  // ---- stop-placement mode (append #poi to the URL): tap each POI in order ----
  function setupPoi() {
    const NAMES = [
      "St Martin's Church",
      "St Augustine's Abbey",
      "Fyndon's Gate",
      "Queen Bertha & King Ethelbert",
      "City Walls",
      "Solly's Orchard",
      "The Marlowe Theatre",
      "Westgate Towers",
      "River Tours",
      "Westgate Gardens",
      "Greyfriars Chapel",
      "The Beaney",
      "Roman Museum",
      "Canterbury Cathedral (Christchurch Gate)",
      "War Memorial",
      "St George's Tower",
    ];
    const placed = []; // { name, latlng, ni }
    let nameIdx = 0;
    const layer = L.layerGroup().addTo(map);

    const bar = document.createElement("div");
    bar.className = "trace-bar";
    const msg = document.createElement("span");
    msg.className = "trace-bar__msg";
    bar.appendChild(msg);
    ["Skip", "Undo", "Clear", "Copy"].forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.id = "poi" + name;
      b.textContent = name;
      bar.appendChild(b);
    });
    document.body.appendChild(bar);

    const out = document.createElement("textarea");
    out.className = "trace-out";
    out.readOnly = true;
    out.hidden = true;
    document.body.appendChild(out);

    function poiIcon(n) {
      return L.divIcon({
        className: "poi-pin",
        html: '<span class="poi-pin__n">' + n + "</span>",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
    }
    function redraw() {
      layer.clearLayers();
      placed.forEach((p, i) =>
        L.marker(p.latlng, { icon: poiIcon(i + 1), interactive: false })
          .addTo(layer)
          .bindTooltip(p.name, { permanent: false, direction: "top", offset: [0, -12] })
      );
      msg.textContent =
        nameIdx < NAMES.length
          ? "Next (#" + (placed.length + 1) + "): " + NAMES[nameIdx] + " — tap its spot.  " + placed.length + " placed."
          : "Done — " + placed.length + " placed. Tap Copy, then paste it to me.";
    }

    map.on("click", (e) => {
      if (nameIdx >= NAMES.length) return;
      placed.push({ name: NAMES[nameIdx], latlng: e.latlng, ni: nameIdx });
      nameIdx += 1;
      out.hidden = true;
      redraw();
    });
    bar.querySelector("#poiSkip").onclick = () => {
      if (nameIdx < NAMES.length) nameIdx += 1;
      out.hidden = true;
      redraw();
    };
    bar.querySelector("#poiUndo").onclick = () => {
      const p = placed.pop();
      if (p) nameIdx = p.ni;
      out.hidden = true;
      redraw();
    };
    bar.querySelector("#poiClear").onclick = () => {
      placed.length = 0;
      nameIdx = 0;
      out.hidden = true;
      redraw();
    };
    bar.querySelector("#poiCopy").onclick = () => {
      out.value = placed
        .map((p, i) => (i + 1) + "\t" + p.name + "\t[" + p.latlng.lat.toFixed(6) + ", " + p.latlng.lng.toFixed(6) + "]")
        .join("\n");
      out.hidden = false;
      out.focus();
      out.select();
      if (navigator.clipboard) navigator.clipboard.writeText(out.value).catch(() => {});
    };

    redraw();
  }
})();

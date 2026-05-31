(function () {
  "use strict";

  const statusEl = document.getElementById("locStatus");
  const mapEl = document.getElementById("map");
  const appEl = document.getElementById("app");
  const detailEl = document.getElementById("detail");
  const detailContent = document.getElementById("detailContent");
  const closeBtn = document.getElementById("detailClose");
  const toggleBtn = document.getElementById("detailToggle");
  const finishFloat = document.getElementById("finishFloat");
  const promptEl = document.getElementById("arrivePrompt");
  const promptText = document.getElementById("arriveText");
  const promptListen = document.getElementById("arriveListen");
  const promptDismiss = document.getElementById("arriveDismiss");

  const DEFAULT_RADIUS = 40; // metres; "you're here" threshold
  const PANEL_MS = 360; // keep in sync with the panel transition in styles.css
  const TRACE = location.hash.toLowerCase().indexOf("trace") !== -1;
  const POI = location.hash.toLowerCase().indexOf("poi") !== -1;

  // ---- the per-site cards (built once, shown in the detail panel on demand) ----
  const cards = SITES.map(buildCard);

  // ---- map ----
  const map = L.map(mapEl, { zoomControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Audio: Kokoro TTS',
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
    if (!TRACE) marker.on("click", () => openDetail(i, false));
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

  // ---- detail panel ----
  let activeIndex = -1;
  let panelTimer = null;
  const visited = new Set(); // stops the visitor has opened — their pins go green

  closeBtn.addEventListener("click", closeDetail);
  toggleBtn.addEventListener("click", toggleCollapse);
  finishFloat.addEventListener("click", closeDetail);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeIndex !== -1) closeDetail();
  });

  // Open the panel for a stop: slide the map aside, show its card, recenter.
  function openDetail(index, play) {
    const card = cards[index];
    pauseAudioExcept(index);
    detailContent.replaceChildren(card);
    detailContent.scrollTop = 0;
    setActiveMarker(index);
    markVisited(index);
    detailEl.removeAttribute("inert");
    detailEl.setAttribute("aria-hidden", "false");
    appEl.classList.add("detail-open");
    setCollapsed(false);
    hidePrompt();
    activeIndex = index;

    // let the panel finish sliding, then resize the map and frame the stop
    afterPanel(() => {
      map.invalidateSize({ animate: false });
      const s = SITES[index];
      map.setView([s.lat, s.lng], Math.max(map.getZoom(), 16), { animate: true });
    });

    if (play) {
      const audio = card.querySelector("audio");
      if (audio) audio.play().catch(() => {});
    }
    detailEl.focus({ preventScroll: true });
  }

  function closeDetail() {
    if (activeIndex === -1) return;
    const audio = cards[activeIndex].querySelector("audio");
    if (audio) audio.pause();
    setActiveMarker(-1);
    appEl.classList.remove("detail-open");
    setCollapsed(false);
    detailEl.setAttribute("aria-hidden", "true");
    detailEl.setAttribute("inert", "");
    activeIndex = -1;

    afterPanel(() => {
      detailContent.replaceChildren();
      map.invalidateSize({ animate: false });
    });
    mapEl.focus({ preventScroll: true });
  }

  function afterPanel(fn) {
    if (panelTimer) clearTimeout(panelTimer);
    panelTimer = setTimeout(() => { panelTimer = null; fn(); }, PANEL_MS);
  }

  function pauseAudioExcept(index) {
    cards.forEach((card, i) => {
      if (i === index) return;
      const audio = card.querySelector("audio");
      if (audio && !audio.paused) audio.pause();
    });
  }

  function setActiveMarker(index) {
    stopMarkers.forEach((marker, i) => {
      const el = marker && marker.getElement && marker.getElement();
      if (!el) return;
      const span = el.querySelector(".stop-pin__n");
      if (span) span.classList.toggle("stop-pin__n--active", i === index);
    });
  }

  // mark a stop (and every previously opened one) as visited — those pins turn green
  function markVisited(index) {
    if (index >= 0) visited.add(index);
    stopMarkers.forEach((marker, i) => {
      if (!visited.has(i)) return;
      const el = marker && marker.getElement && marker.getElement();
      const span = el && el.querySelector(".stop-pin__n");
      if (span) span.classList.add("stop-pin__n--visited");
    });
  }

  // collapse the sheet down to just the title + player (mobile), or restore it
  function setCollapsed(collapsed) {
    appEl.classList.toggle("detail-collapsed", collapsed);
    toggleBtn.setAttribute("aria-expanded", String(!collapsed));
    toggleBtn.setAttribute("aria-label", collapsed ? "Expand" : "Collapse");
  }

  function toggleCollapse() {
    if (activeIndex === -1) return;
    setCollapsed(!appEl.classList.contains("detail-collapsed"));
    afterPanel(() => map.invalidateSize({ animate: false }));
  }

  // ---- arrival prompt ----
  let activePromptId = null;
  const prompted = new Set();

  promptDismiss.addEventListener("click", hidePrompt);
  promptListen.addEventListener("click", () => {
    const i = SITES.findIndex((s) => s.id === activePromptId);
    hidePrompt();
    if (i >= 0) openDetail(i, true);
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

  // ---- cards ----
  function buildCard(site, i) {
    const li = document.createElement("article");
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

    // "Finish" — closes the sheet and brings the map instructions back (mobile)
    const finishBtn = document.createElement("button");
    finishBtn.type = "button";
    finishBtn.className = "voice-btn voice-finish";
    finishBtn.textContent = "Finish";
    finishBtn.addEventListener("click", closeDetail);
    const voicesRow = body.querySelector(".voices");
    if (voicesRow) {
      voicesRow.appendChild(finishBtn);
    } else {
      const actions = document.createElement("div");
      actions.className = "voices card__actions";
      actions.appendChild(finishBtn);
      body.appendChild(actions);
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

  // ---- geolocation ----
  function startLocation() {
    if (!("geolocation" in navigator)) {
      statusEl.textContent = "Tap a numbered stop to listen.";
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
      if (autoCenter && activeIndex === -1) map.setView(here, Math.max(map.getZoom(), 16));
    } else {
      liveMarker.setLatLng(here);
      accuracyCircle.setLatLng(here).setRadius(accuracy || 0);
      if (autoCenter && activeIndex === -1) map.panTo(here);
    }

    // live distance on every card (only the open one is visible)
    const entries = SITES.map((site, i) => ({
      site,
      i,
      dist: haversine(latitude, longitude, site.lat, site.lng),
    }));
    entries.sort((a, b) => a.dist - b.dist);

    entries.forEach(({ site, i, dist }) => {
      const el = cards[i]._distEl;
      el.hidden = false;
      const near = dist <= (site.radius || DEFAULT_RADIUS);
      el.textContent = near ? "You’re here" : formatDistance(dist);
      el.classList.toggle("is-near", near);
    });

    statusEl.textContent = "Tap a numbered stop — or walk up to one — to listen.";

    // arrival prompt for the nearest stop within its radius (not while reading a stop)
    if (!TRACE && !POI && activeIndex === -1) {
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
        ? "Location is off — just tap the stop you’re at."
        : "Couldn’t get a location fix — just tap the stop you’re at.";
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

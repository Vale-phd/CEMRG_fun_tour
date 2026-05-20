(function () {
  "use strict";

  const listEl = document.getElementById("siteList");
  const statusEl = document.getElementById("locStatus");
  const NEAR_METERS = 200;

  const cards = SITES.map(buildCard);
  let currentOrder = "";
  render(SITES.map((site, i) => ({ site, card: cards[i], dist: null })));
  startLocation();

  function buildCard(site) {
    const li = document.createElement("li");
    li.className = "card";

    const media = document.createElement("div");
    media.className = "card__media";
    const img = document.createElement("img");
    img.src = site.image;
    img.alt = site.name;
    img.loading = "lazy";
    media.appendChild(img);

    const dist = document.createElement("span");
    dist.className = "card__distance";
    dist.hidden = true;
    media.appendChild(dist);
    li.appendChild(media);

    const body = document.createElement("div");
    body.className = "card__body";

    const name = document.createElement("h2");
    name.className = "card__name";
    name.textContent = site.name;
    body.appendChild(name);

    const blurb = document.createElement("p");
    blurb.className = "card__blurb";
    blurb.textContent = site.blurb;
    body.appendChild(blurb);

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = site.audio[0].file;

    if (site.audio.length > 1) {
      body.appendChild(buildVoiceSwitcher(site, audio));
    }
    body.appendChild(audio);
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

  function render(entries) {
    const order = entries.map((e) => e.site.id).join(",");
    if (order === currentOrder) return;
    currentOrder = order;
    listEl.replaceChildren(...entries.map((e) => e.card));
  }

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
    const { latitude, longitude } = pos.coords;
    const entries = SITES.map((site, i) => ({
      site,
      card: cards[i],
      dist: haversine(latitude, longitude, site.lat, site.lng),
    }));
    entries.sort((a, b) => a.dist - b.dist);

    entries.forEach(({ card, dist }) => {
      const el = card._distEl;
      el.hidden = false;
      const near = dist <= NEAR_METERS;
      el.textContent = near ? "You’re here" : formatDistance(dist);
      el.classList.toggle("is-near", near);
    });

    statusEl.textContent = "Sorted by nearest — walk up to a site and press play.";
    render(entries);
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
})();

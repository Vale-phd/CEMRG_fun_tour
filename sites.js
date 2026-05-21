/*
 * Tour data.
 *
 * SITES  — the narrated stops (markers on the map, cards in the list).
 * ROUTE  — the walking route as an ordered list of [lat, lng] points.
 *
 * To add a site: copy a block, fill in the fields, write the narration in
 * content/<id>.txt, run tools/generate_audio.py, then (optionally) drop an
 * image in assets/images/. See SPEC.md for the full recipe.
 *
 * Site fields:
 *   id      unique slug; must match content/<id>.txt and the audio filenames
 *   name    display name
 *   lat,lng decimal coordinates (marker position; also used to sort the list)
 *   radius  metres; how close you must be for the "you're here" prompt
 *   blurb   one-line summary shown on the card
 *   image   optional path to an image; omit for a plain card
 *   audio   array of voice options; the first is played by default
 */
const SITES = [
  {
    id: "canterbury-cathedral",
    name: "Canterbury Cathedral",
    lat: 51.2794,
    lng: 1.0826,
    radius: 50,
    blurb:
      "Mother church of the Anglican Communion and seat of the Archbishop of Canterbury for over 1,400 years.",
    image: "assets/images/canterbury-cathedral.svg",
    audio: [
      { label: "George", file: "assets/audio/canterbury-cathedral.mp3" },
      { label: "Emma", file: "assets/audio/canterbury-cathedral-emma.mp3" },
    ],
  },
  {
    id: "fyndons-gate",
    name: "Fyndon's Gate",
    lat: 51.27905,
    lng: 1.08885,
    radius: 45,
    blurb:
      "The grand early-14th-century gateway to St Augustine's Abbey, and royal lodging for Charles I and his bride.",
    audio: [
      { label: "George", file: "assets/audio/fyndons-gate.mp3" },
      { label: "Emma", file: "assets/audio/fyndons-gate-emma.mp3" },
    ],
  },
  {
    id: "st-augustines-abbey",
    name: "St Augustine's Abbey",
    lat: 51.27795,
    lng: 1.0901,
    radius: 55,
    blurb:
      "Founded in 598 — burial place of Anglo-Saxon kings and one of the cradles of English Christianity.",
    audio: [
      { label: "George", file: "assets/audio/st-augustines-abbey.mp3" },
      { label: "Emma", file: "assets/audio/st-augustines-abbey-emma.mp3" },
    ],
  },
  {
    id: "st-martins-church",
    name: "St Martin's Church",
    lat: 51.27896,
    lng: 1.0948,
    radius: 45,
    blurb:
      "The oldest church in the English-speaking world still in use, older than St Augustine's mission itself.",
    audio: [
      { label: "George", file: "assets/audio/st-martins-church.mp3" },
      { label: "Emma", file: "assets/audio/st-martins-church-emma.mp3" },
    ],
  },
  {
    id: "westgate-towers",
    name: "Westgate Towers",
    lat: 51.28055,
    lng: 1.07631,
    radius: 45,
    blurb:
      "England's largest surviving medieval city gate, guarding the pilgrims' road in from London.",
    audio: [
      { label: "George", file: "assets/audio/westgate-towers.mp3" },
      { label: "Emma", file: "assets/audio/westgate-towers-emma.mp3" },
    ],
  },
];

/*
 * Walking route, traced from the YHA "Canterbury City Tour" map (waypoints
 * 1–12). Approximate — follows the real streets at each turn but is not a
 * surveyed GPX. Swap in an exact track here any time without touching app.js.
 */
const ROUTE = [
  [51.2736, 1.0933], // YHA, New Dover Road (start, off the printed map edge)
  [51.2743, 1.0925],
  [51.2748, 1.0943], // up St Augustine's Road
  [51.2753, 1.0956], // wp3 — Pilgrims Way / St Augustine's Road
  [51.2762, 1.0952],
  [51.2775, 1.0949],
  [51.27896, 1.0948], // St Martin's Church
  [51.2785, 1.093],
  [51.278, 1.0915], // along Longport
  [51.27795, 1.0901], // St Augustine's Abbey remains
  [51.2784, 1.0893],
  [51.27905, 1.08885], // wp4 — Fyndon's Gate, Lady Wootton's Green
  [51.27935, 1.0882], // Queen Bertha & King Ethelbert
  [51.2799, 1.086],
  [51.2801, 1.0849], // wp5 — Broad Street (city walls)
  [51.2811, 1.0847],
  [51.2823, 1.0844], // Broad Street / Military Road
  [51.2823, 1.0828],
  [51.2821, 1.0812],
  [51.2816, 1.0801], // wp6 — King Street / Borough
  [51.2809, 1.0799],
  [51.2808, 1.0793], // wp7 — Pound Lane / Solly's Orchard / The Marlowe
  [51.2818, 1.0797],
  [51.2829, 1.0799], // wp8 — The Causeway
  [51.282, 1.0788],
  [51.2812, 1.0777],
  [51.28055, 1.07631], // wp9 — Westgate Towers
  [51.2799, 1.0752],
  [51.2795, 1.0747], // wp10 — Westgate Gardens / Whitehall Road
  [51.2787, 1.0756],
  [51.2779, 1.0765], // wp11 — Old Watling Street / Rheims Way
  [51.2784, 1.0782],
  [51.279, 1.0795], // wp12 — High Street / Stour Street / The Parade
  [51.27955, 1.0805], // High Street (The Beaney, Eastbridge)
  [51.27945, 1.0815], // Roman Museum
  [51.2794, 1.0826], // Christchurch Gate — Canterbury Cathedral
  [51.279, 1.0834], // St George's Street / St George's Tower
  [51.27876, 1.08381],
  [51.2779, 1.0852], // down to St George's roundabout
  [51.2768, 1.0876], // New Dover Road / St George's Place
  [51.2752, 1.0908],
  [51.2743, 1.0925], // rejoin the start
];

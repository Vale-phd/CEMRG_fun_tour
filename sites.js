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
 *   audio   optional array of voice options; the first plays by default
 *
 * Stops are numbered on the map in this array's order (the walking order).
 */
const SITES = [
  {
    id: "st-martins-church",
    name: "St Martin's Church",
    lat: 51.278032,
    lng: 1.093665,
    radius: 45,
    blurb:
      "The oldest church in the English-speaking world still in use, older than St Augustine's mission itself.",
    image: "assets/images/st-martins-church.jpg",
    audio: [
      { label: "George", file: "assets/audio/st-martins-church.mp3" },
      { label: "Lily", file: "assets/audio/st-martins-church-lily.mp3" },
    ],
  },
  {
    id: "st-augustines-abbey",
    name: "St Augustine's Abbey",
    lat: 51.277615,
    lng: 1.087786,
    radius: 55,
    blurb:
      "Founded in 598 — burial place of Anglo-Saxon kings and one of the cradles of English Christianity.",
    image: "assets/images/st-augustines-abbey.jpg",
    audio: [
      { label: "George", file: "assets/audio/st-augustines-abbey.mp3" },
      { label: "Lily", file: "assets/audio/st-augustines-abbey-lily.mp3" },
    ],
  },
  {
    id: "fyndons-gate",
    name: "Fyndon's Gate",
    lat: 51.279065,
    lng: 1.086933,
    radius: 45,
    blurb:
      "The grand early-14th-century gateway to St Augustine's Abbey, and royal lodging for Charles I and his bride.",
    image: "assets/images/fyndons-gate.jpg",
    audio: [
      { label: "George", file: "assets/audio/fyndons-gate.mp3" },
      { label: "Lily", file: "assets/audio/fyndons-gate-lily.mp3" },
    ],
  },
  {
    id: "queen-bertha-king-ethelbert",
    name: "Queen Bertha & King Ethelbert",
    lat: 51.279229,
    lng: 1.086257,
    blurb:
      "Statues of the 6th-century Kentish king and his Frankish Christian queen, who received St Augustine's mission.",
    image: "assets/images/queen-bertha-king-ethelbert.jpg",
    audio: [
      { label: "George", file: "assets/audio/queen-bertha-king-ethelbert.mp3" },
      { label: "Lily", file: "assets/audio/queen-bertha-king-ethelbert-lily.mp3" },
    ],
  },
  {
    id: "city-walls",
    name: "City Walls",
    lat: 51.279585,
    lng: 1.085721,
    blurb:
      "Medieval walls on the line of the Roman circuit, still ringing much of the old city.",
    image: "assets/images/city-walls.jpg",
    audio: [
      { label: "George", file: "assets/audio/city-walls.mp3" },
      { label: "Lily", file: "assets/audio/city-walls-lily.mp3" },
    ],
  },
  {
    id: "marlowe-theatre",
    name: "The Marlowe Theatre",
    lat: 51.281084,
    lng: 1.078548,
    blurb:
      "Canterbury's riverside theatre, named after the playwright Christopher Marlowe, born in the city in 1564.",
    image: "assets/images/marlowe-theatre.jpg",
    audio: [
      { label: "George", file: "assets/audio/marlowe-theatre.mp3" },
      { label: "Lily", file: "assets/audio/marlowe-theatre-lily.mp3" },
    ],
  },
  {
    id: "sollys-orchard",
    name: "Solly's Orchard",
    lat: 51.28188,
    lng: 1.079155,
    blurb: "A quiet green corner beside the Great Stour, just off the riverside path.",
    image: "assets/images/sollys-orchard.jpg",
    audio: [
      { label: "George", file: "assets/audio/sollys-orchard.mp3" },
      { label: "Lily", file: "assets/audio/sollys-orchard-lily.mp3" },
    ],
  },
  {
    id: "westgate-towers",
    name: "Westgate Towers",
    lat: 51.281538,
    lng: 1.075791,
    radius: 45,
    blurb:
      "England's largest surviving medieval city gate, guarding the pilgrims' road in from London.",
    image: "assets/images/westgate-towers.jpg",
    audio: [
      { label: "George", file: "assets/audio/westgate-towers.mp3" },
      { label: "Lily", file: "assets/audio/westgate-towers-lily.mp3" },
    ],
  },
  {
    id: "river-tours",
    name: "River Tours",
    lat: 51.281306,
    lng: 1.074772,
    blurb: "Boarding point for guided rowing-boat trips along the Great Stour.",
    image: "assets/images/river-tours.jpg",
    audio: [
      { label: "George", file: "assets/audio/river-tours.mp3" },
      { label: "Lily", file: "assets/audio/river-tours-lily.mp3" },
    ],
  },
  {
    id: "westgate-gardens",
    name: "Westgate Gardens",
    lat: 51.280282,
    lng: 1.073635,
    blurb:
      "Riverside public gardens along the Great Stour beneath the old city wall.",
    image: "assets/images/westgate-gardens.jpg",
    audio: [
      { label: "George", file: "assets/audio/westgate-gardens.mp3" },
      { label: "Lily", file: "assets/audio/westgate-gardens-lily.mp3" },
    ],
  },
  {
    id: "greyfriars-chapel",
    name: "Greyfriars Chapel",
    lat: 51.278959,
    lng: 1.076746,
    blurb: "Built over the Stour around 1267 — the first Franciscan friary in England.",
    image: "assets/images/greyfriars-chapel.jpg",
    audio: [
      { label: "George", file: "assets/audio/greyfriars-chapel.mp3" },
      { label: "Lily", file: "assets/audio/greyfriars-chapel-lily.mp3" },
    ],
  },
  {
    id: "the-beaney",
    name: "The Beaney",
    lat: 51.279651,
    lng: 1.079203,
    blurb:
      "The Beaney House of Art and Knowledge: the city's museum, gallery and library.",
    image: "assets/images/the-beaney.jpg",
    audio: [
      { label: "George", file: "assets/audio/the-beaney.mp3" },
      { label: "Lily", file: "assets/audio/the-beaney-lily.mp3" },
    ],
  },
  {
    id: "canterbury-cathedral",
    name: "Canterbury Cathedral",
    lat: 51.279107,
    lng: 1.081209,
    radius: 50,
    blurb:
      "Mother church of the Anglican Communion and seat of the Archbishop of Canterbury for over 1,400 years.",
    image: "assets/images/canterbury-cathedral.jpg",
    audio: [
      { label: "George", file: "assets/audio/canterbury-cathedral.mp3" },
      { label: "Lily", file: "assets/audio/canterbury-cathedral-lily.mp3" },
    ],
  },
  {
    id: "war-memorial",
    name: "War Memorial",
    lat: 51.279226,
    lng: 1.081357,
    blurb:
      "The city war memorial at the Buttermarket, before the cathedral's Christchurch Gate.",
    image: "assets/images/war-memorial.jpg",
    audio: [
      { label: "George", file: "assets/audio/war-memorial.mp3" },
      { label: "Lily", file: "assets/audio/war-memorial-lily.mp3" },
    ],
  },
  {
    id: "roman-museum",
    name: "Roman Museum",
    lat: 51.278643,
    lng: 1.081469,
    blurb:
      "An underground museum built around an in-situ Roman mosaic and hypocaust.",
    image: "assets/images/roman-museum.jpg",
    audio: [
      { label: "George", file: "assets/audio/roman-museum.mp3" },
      { label: "Lily", file: "assets/audio/roman-museum-lily.mp3" },
    ],
  },
  {
    id: "st-georges-tower",
    name: "St George's Tower",
    lat: 51.277415,
    lng: 1.082781,
    blurb:
      "The lone tower of St George's Church, where Christopher Marlowe was baptised in 1564.",
    image: "assets/images/st-georges-tower.jpg",
    audio: [
      { label: "George", file: "assets/audio/st-georges-tower.mp3" },
      { label: "Lily", file: "assets/audio/st-georges-tower-lily.mp3" },
    ],
  },
];

/*
 * Walking route, traced by hand on the map along the real streets
 * (ordered [lat, lng] points). Replace with an exact GPX track any time.
 */
const ROUTE = [
  [51.270727, 1.092914],
  [51.273293, 1.089835],
  [51.273488, 1.090329],
  [51.274146, 1.091305],
  [51.274670, 1.091809],
  [51.275536, 1.092957],
  [51.275972, 1.093365],
  [51.276503, 1.094062],
  [51.276886, 1.093880],
  [51.277289, 1.093869],
  [51.277457, 1.092496],
  [51.277544, 1.090586],
  [51.277383, 1.089481],
  [51.277349, 1.088258],
  [51.277624, 1.086230],
  [51.277954, 1.086252],
  [51.278780, 1.086649],
  [51.279068, 1.086692],
  [51.279303, 1.085790],
  [51.279740, 1.085973],
  [51.280230, 1.085962],
  [51.281103, 1.085436],
  [51.282345, 1.083462],
  [51.281674, 1.082550],
  [51.281627, 1.082100],
  [51.281741, 1.081553],
  [51.281741, 1.081209],
  [51.281049, 1.080447],
  [51.280546, 1.079739],
  [51.280727, 1.079267],
  [51.280781, 1.079010],
  [51.281056, 1.079117],
  [51.281519, 1.079031],
  [51.281714, 1.078892],
  [51.281848, 1.078988],
  [51.282077, 1.079482],
  [51.282291, 1.079729],
  [51.282278, 1.079847],
  [51.282392, 1.079997],
  [51.282426, 1.080147],
  [51.282392, 1.080297],
  [51.282553, 1.080415],
  [51.282654, 1.079171],
  [51.282835, 1.079096],
  [51.282963, 1.078978],
  [51.282896, 1.077958],
  [51.282896, 1.077658],
  [51.282708, 1.077540],
  [51.282271, 1.076757],
  [51.281674, 1.075652],
  [51.281452, 1.075609],
  [51.281022, 1.074954],
  [51.280942, 1.074289],
  [51.280579, 1.073828],
  [51.280082, 1.073345],
  [51.279726, 1.074032],
  [51.279129, 1.073366],
  [51.279075, 1.073570],
  [51.278860, 1.073699],
  [51.278719, 1.073710],
  [51.278518, 1.074010],
  [51.278444, 1.074375],
  [51.278511, 1.074708],
  [51.278518, 1.074986],
  [51.278618, 1.075298],
  [51.278652, 1.075491],
  [51.278565, 1.075759],
  [51.278571, 1.075823],
  [51.278733, 1.075974],
  [51.278719, 1.076092],
  [51.278800, 1.076285],
  [51.278900, 1.076424],
  [51.278377, 1.077272],
  [51.278410, 1.077476],
  [51.278699, 1.077905],
  [51.278907, 1.078023],
  [51.279095, 1.078087],
  [51.279411, 1.078398],
  [51.279659, 1.078935],
  [51.278706, 1.080501],
  [51.279203, 1.081091],
  [51.278330, 1.083591],
  [51.277571, 1.082422],
  [51.277262, 1.082958],
  [51.277134, 1.083494],
  [51.277188, 1.083806],
  [51.277242, 1.083966],
  [51.277121, 1.084256],
  [51.276825, 1.084299],
  [51.276187, 1.085479],
  [51.275758, 1.086391],
  [51.275516, 1.086799],
  [51.275287, 1.087078],
  [51.274871, 1.087947],
  [51.274502, 1.088537],
  [51.274139, 1.088988],
  [51.273367, 1.089878],
  [51.270762, 1.092957],
];

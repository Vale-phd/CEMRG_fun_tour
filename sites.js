/*
 * Tour data. Each entry is one stop on the walk.
 *
 * To add a site: copy a block, fill in the fields, write the narration in
 * content/<id>.txt, run tools/generate_audio.py, then drop an image in
 * assets/images/. See SPEC.md for the full recipe.
 *
 * Fields:
 *   id      unique slug; must match content/<id>.txt and the audio filenames
 *   name    display name
 *   lat,lng decimal coordinates (used to sort the list by how near you are)
 *   blurb   one-line summary shown on the card
 *   image   path to an image (photo or illustration)
 *   audio   array of voice options; the first is played by default
 */
const SITES = [
  {
    id: "canterbury-cathedral",
    name: "Canterbury Cathedral",
    lat: 51.27983,
    lng: 1.08296,
    blurb:
      "Mother church of the Anglican Communion and seat of the Archbishop of Canterbury for over 1,400 years.",
    image: "assets/images/canterbury-cathedral.svg",
    audio: [
      { label: "George", file: "assets/audio/canterbury-cathedral.mp3" },
      { label: "Emma", file: "assets/audio/canterbury-cathedral-emma.mp3" },
    ],
  },
];

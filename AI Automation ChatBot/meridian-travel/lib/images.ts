/**
 * Image registry.
 *
 * All photography is stored locally in /public/images rather than hotlinked.
 * That was a deliberate call: Wikimedia Commons rate-limits (HTTP 429) and
 * blocks generic user agents, so linking their CDN from a live site is
 * unreliable — and they ask people not to. Serving locally also means
 * next/image can optimise properly and there are no `remotePatterns` to
 * maintain.
 *
 * Every file is CC-licensed and the required attribution travels with it.
 * The Footer renders the full credit list; do not drop `artist`/`license`.
 *
 * Sources: Wikimedia Commons, fetched at 1920px wide.
 */

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  /** Descriptive alt text — these are content images, not decoration. */
  alt: string;
  artist: string;
  license: string;
}

export const images = {
  switzerland: {
    src: "/images/switzerland.jpg",
    width: 1920,
    height: 1291,
    alt: "The Lauterbrunnen valley in Switzerland, sheer cliffs rising on both sides above green meadows",
    artist: "Chensiyuan",
    license: "CC BY-SA 4.0",
  },
  bali: {
    src: "/images/bali.jpg",
    width: 1920,
    height: 1280,
    alt: "Terraced rice paddies stepping down a hillside near Ubud, Bali",
    artist: "Vyacheslav Argenberg",
    license: "CC BY 4.0",
  },
  maldives: {
    src: "/images/maldives.jpg",
    width: 1920,
    height: 1280,
    alt: "Aerial view of a Maldivian island ringed by pale turquoise shallows",
    artist: "Dr. Ondřej Havelka",
    license: "CC BY-SA 4.0",
  },
  japan: {
    src: "/images/japan.jpg",
    width: 1920,
    height: 1280,
    alt: "A corridor of vermilion torii gates at Fushimi Inari shrine, Kyoto",
    artist: "Basile Morin",
    license: "CC BY-SA 4.0",
  },
  dubai: {
    src: "/images/dubai.jpg",
    width: 1920,
    height: 1282,
    alt: "The Burj Khalifa rising above the Dubai skyline",
    artist: "Imran Shahabuddin",
    license: "CC BY 2.0",
  },
  italy: {
    src: "/images/italy.jpg",
    width: 1920,
    height: 1280,
    alt: "Positano's pastel houses stacked above the sea at sunset on the Amalfi coast",
    artist: "JeCCo",
    license: "CC BY 4.0",
  },
  iceland: {
    src: "/images/iceland.jpg",
    width: 1920,
    height: 1280,
    alt: "Blue icebergs floating in the glacier lagoon at Jökulsárlón, Iceland",
    artist: "Tim Sackton",
    license: "CC BY-SA 2.0",
  },
  paris: {
    src: "/images/paris.jpg",
    width: 1920,
    height: 1335,
    alt: "The Eiffel Tower seen across the rooftops of Paris",
    artist: "Pedro Szekely",
    license: "CC BY-SA 2.0",
  },
  greece: {
    src: "/images/greece.jpg",
    width: 1920,
    height: 1279,
    alt: "Whitewashed houses of Oia, Santorini, at sunset above the caldera",
    artist: "TomasEE",
    license: "CC BY 3.0",
  },
  newzealand: {
    src: "/images/newzealand.jpg",
    width: 1920,
    height: 695,
    alt: "Milford Sound in New Zealand, dark peaks falling straight into still water",
    artist: "Maroš Mráz",
    license: "CC BY-SA 3.0",
  },
  morocco: {
    src: "/images/morocco.jpg",
    width: 1920,
    height: 1440,
    alt: "The evening market at Jemaa el-Fnaa square in Marrakech, Morocco",
    artist: "Forbes Johnston",
    license: "CC BY 4.0",
  },
  peru: {
    src: "/images/peru.jpg",
    width: 1920,
    height: 1276,
    alt: "The Inca citadel of Machu Picchu with Huayna Picchu rising behind it",
    artist: "Diego Delso",
    license: "CC BY-SA 4.0",
  },

  /* ── Package imagery ─────────────────────────────────────────────── */
  "pkg-alpine": {
    src: "/images/pkg-alpine.jpg",
    width: 1920,
    height: 1210,
    alt: "A mountain restaurant terrace at Grindelwald-First looking across to the Schreckhorn",
    artist: "W. Bulach",
    license: "CC BY-SA 4.0",
  },
  "pkg-uluwatu": {
    src: "/images/pkg-uluwatu.jpg",
    width: 1920,
    height: 1280,
    alt: "Uluwatu temple perched on a cliff edge above the Balinese surf",
    artist: "Anandajoti Bhikkhu",
    license: "CC BY-SA 4.0",
  },
  "pkg-maldives": {
    src: "/images/pkg-maldives.jpg",
    width: 1920,
    height: 1280,
    alt: "A thatched beach villa opening directly onto white sand in the Maldives",
    artist: "Simone Lovati",
    license: "CC BY-SA 2.0",
  },
  "pkg-morocco": {
    src: "/images/pkg-morocco.jpg",
    width: 1920,
    height: 1282,
    alt: "A Berber guide walking along the crest of a dune in the Sahara desert, Morocco",
    artist: "Mustang Joe",
    license: "CC0",
  },
  "pkg-tsumago": {
    src: "/images/pkg-tsumago.jpg",
    width: 1920,
    height: 1277,
    alt: "The old Nakasendō post road running between wooden buildings in Tsumago-juku, Japan",
    artist: "DimiTalen",
    license: "CC0",
  },
  "pkg-aurora": {
    src: "/images/pkg-aurora.jpg",
    width: 1920,
    height: 1371,
    alt: "Green aurora borealis above Kirkjufell mountain in Iceland",
    artist: "Vaidyanathan",
    license: "CC BY-SA 4.0",
  },
  "pkg-oia-domes": {
    src: "/images/pkg-oia-domes.jpg",
    width: 1920,
    height: 1280,
    alt: "Three blue church domes above the caldera at Oia, Santorini",
    artist: "Giles Laurent",
    license: "CC BY-SA 4.0",
  },
  "pkg-rubalkhali": {
    src: "/images/pkg-rubalkhali.jpg",
    width: 1920,
    height: 1074,
    alt: "Apricot-coloured dunes running to the horizon in the Rub' al Khali desert",
    artist: "Nepenthes",
    license: "CC BY-SA 3.0",
  },
  "pkg-amalfi": {
    src: "/images/pkg-amalfi.jpg",
    width: 1920,
    height: 1280,
    alt: "The town of Amalfi climbing the hillside above the Tyrrhenian sea",
    artist: "Bernard Gagnon",
    license: "CC BY 4.0",
  },
  "pkg-chambord": {
    src: "/images/pkg-chambord.jpg",
    width: 1920,
    height: 1353,
    alt: "Aerial view of the Château de Chambord and its roofline of turrets",
    artist: "Carsten Steger",
    license: "CC BY-SA 4.0",
  },
  "pkg-queenstown": {
    src: "/images/pkg-queenstown.jpg",
    width: 1920,
    height: 1280,
    alt: "Queenstown, New Zealand, on the shore of Lake Wakatipu beneath the Remarkables",
    artist: "Michelle Maria",
    license: "CC BY 3.0",
  },
  "pkg-kyoto-autumn": {
    src: "/images/pkg-kyoto-autumn.jpg",
    width: 1920,
    height: 1280,
    alt: "Red maple leaves over a temple garden at Eikandō, Kyoto, in autumn",
    artist: "Lumoplank",
    license: "CC0",
  },
  "pkg-milkbeach": {
    src: "/images/pkg-milkbeach.jpg",
    width: 1920,
    height: 1309,
    alt: "Clear shallow water over pale sand at a beach in the Small Cyclades",
    artist: "Dimosthenis Eleftheriadis",
    license: "CC BY-SA 4.0",
  },
  "pkg-trulli": {
    src: "/images/pkg-trulli.jpg",
    width: 1920,
    height: 1229,
    alt: "The conical stone roofs of the trulli houses at Alberobello, Puglia",
    artist: "Hervé Simon",
    license: "CC BY-SA 2.0",
  },
  "pkg-glacier": {
    src: "/images/pkg-glacier.jpg",
    width: 1920,
    height: 1280,
    alt: "An iceberg in fog on the glacier lagoon in south-east Iceland",
    artist: "Tim Sackton",
    license: "CC BY-SA 2.0",
  },
} as const satisfies Record<string, ImageAsset>;

export type ImageKey = keyof typeof images;

/** Ordered slides for the hero backdrop — the widest, most cinematic frames. */
export const heroSlides: ImageKey[] = [
  "switzerland",
  "greece",
  "japan",
  "pkg-aurora",
  "maldives",
];

/** Deduplicated credit list for the footer. */
export const imageCredits = Object.values(images)
  .map((i) => ({ artist: i.artist, license: i.license }))
  .filter(
    (c, i, all) =>
      all.findIndex((o) => o.artist === c.artist && o.license === c.license) === i,
  )
  .sort((a, b) => a.artist.localeCompare(b.artist));

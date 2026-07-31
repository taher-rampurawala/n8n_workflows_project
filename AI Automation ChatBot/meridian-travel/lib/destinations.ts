/**
 * Mock destination data. No external API calls — see ../CLAUDE.md.
 *
 * `image` keys into lib/images.ts, which holds the local file path plus the
 * attribution the licence requires. `gradient` is retained as the skeleton
 * colour shown behind each photo while it loads.
 */

import type { ImageKey } from "@/lib/images";

export type Season = "Spring" | "Summer" | "Autumn" | "Winter" | "Year-round";

export interface Destination {
  id: string;
  name: string;
  country: string;
  blurb: string;
  startingPrice: number;
  currency: string;
  durationDays: number;
  rating: number;
  bestSeason: Season;
  /** Tailwind gradient shown behind the photo while it loads. */
  gradient: string;
  image: ImageKey;
}

export const destinations: Destination[] = [
  {
    id: "switzerland",
    name: "The Bernese Alps",
    country: "Switzerland",
    blurb:
      "Glacier-fed lakes, cog railways climbing into cloud, and villages that smell of woodsmoke and snow.",
    startingPrice: 306000,
    currency: "INR",
    durationDays: 7,
    rating: 4.9,
    bestSeason: "Winter",
    gradient: "from-slate-700 via-sky-800 to-slate-900",
    image: "switzerland",
  },
  {
    id: "bali",
    name: "Ubud & the Bukit Coast",
    country: "Indonesia",
    blurb:
      "Rice terraces at first light, cliff temples above the surf, and long slow evenings that ask nothing of you.",
    startingPrice: 177000,
    currency: "INR",
    durationDays: 8,
    rating: 4.8,
    bestSeason: "Spring",
    gradient: "from-emerald-700 via-teal-700 to-cyan-900",
    image: "bali",
  },
  {
    id: "maldives",
    name: "Baa Atoll",
    country: "Maldives",
    blurb:
      "Water so clear the boat appears to hover. Overwater villas, manta season, and absolutely nowhere to be.",
    startingPrice: 421000,
    currency: "INR",
    durationDays: 6,
    rating: 4.9,
    bestSeason: "Year-round",
    gradient: "from-cyan-600 via-sky-700 to-blue-900",
    image: "maldives",
  },
  {
    id: "japan",
    name: "Kyoto & the Nakasendo",
    country: "Japan",
    blurb:
      "Temple gardens raked before dawn, and an old post road walked between mountain inns.",
    startingPrice: 344000,
    currency: "INR",
    durationDays: 10,
    rating: 4.9,
    bestSeason: "Autumn",
    gradient: "from-rose-800 via-red-900 to-slate-900",
    image: "japan",
  },
  {
    id: "dubai",
    name: "Dubai & the Empty Quarter",
    country: "UAE",
    blurb:
      "Glass towers at golden hour, then silence — dunes the colour of apricot running to the horizon.",
    startingPrice: 230000,
    currency: "INR",
    durationDays: 5,
    rating: 4.7,
    bestSeason: "Winter",
    gradient: "from-amber-600 via-orange-700 to-yellow-900",
    image: "dubai",
  },
  {
    id: "italy",
    name: "Amalfi & Puglia",
    country: "Italy",
    blurb:
      "Lemon groves above a cobalt sea, whitewashed trulli, and lunches that quietly become dinner.",
    startingPrice: 278000,
    currency: "INR",
    durationDays: 9,
    rating: 4.8,
    bestSeason: "Summer",
    gradient: "from-sky-700 via-amber-700 to-orange-900",
    image: "italy",
  },
  {
    id: "iceland",
    name: "Ring Road & Highlands",
    country: "Iceland",
    blurb:
      "Black sand, green fire overhead, and waterfalls you hear a full minute before you see them.",
    startingPrice: 297000,
    currency: "INR",
    durationDays: 8,
    rating: 4.8,
    bestSeason: "Autumn",
    gradient: "from-indigo-800 via-slate-800 to-emerald-900",
    image: "iceland",
  },
  {
    id: "paris",
    name: "Paris & the Loire",
    country: "France",
    blurb:
      "Mornings in the seventh, afternoons in chateaux country, and a table booked where it matters.",
    startingPrice: 249000,
    currency: "INR",
    durationDays: 6,
    rating: 4.7,
    bestSeason: "Spring",
    gradient: "from-slate-600 via-indigo-800 to-slate-900",
    image: "paris",
  },
  {
    id: "greece",
    name: "Cyclades Islands",
    country: "Greece",
    blurb:
      "Whitewash against impossible blue, island-hopped by private charter rather than timetable.",
    startingPrice: 263000,
    currency: "INR",
    durationDays: 8,
    rating: 4.8,
    bestSeason: "Summer",
    gradient: "from-sky-600 via-blue-700 to-indigo-900",
    image: "greece",
  },
  {
    id: "new-zealand",
    name: "Fiordland & Otago",
    country: "New Zealand",
    blurb:
      "Sounds carved by ice, empty roads through tussock country, and stars with no city to compete with.",
    startingPrice: 392000,
    currency: "INR",
    durationDays: 12,
    rating: 4.9,
    bestSeason: "Spring",
    gradient: "from-emerald-800 via-teal-900 to-slate-900",
    image: "newzealand",
  },
  {
    id: "morocco",
    name: "Marrakech & the Sahara",
    country: "Morocco",
    blurb:
      "Blue-tiled riads and a call to prayer at dusk, then two nights beneath more stars than the desert lets you count anywhere else.",
    startingPrice: 201000,
    currency: "INR",
    durationDays: 7,
    rating: 4.7,
    bestSeason: "Autumn",
    gradient: "from-red-800 via-orange-800 to-amber-900",
    image: "morocco",
  },
  {
    id: "peru",
    name: "Cusco & Machu Picchu",
    country: "Peru",
    blurb:
      "Terraces cut into cloud forest, a train that climbs switchback by switchback, and stonework laid so precisely a blade still won't fit the seams.",
    startingPrice: 268000,
    currency: "INR",
    durationDays: 8,
    rating: 4.9,
    bestSeason: "Summer",
    gradient: "from-sky-700 via-slate-700 to-emerald-900",
    image: "peru",
  },
];

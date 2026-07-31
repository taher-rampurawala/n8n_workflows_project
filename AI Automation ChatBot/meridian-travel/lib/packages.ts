/**
 * Mock package catalogue — 14 journeys, meeting the brief's 12–15 target.
 *
 * Rendered on-page (no routes): "View Details" opens PackageModal, never
 * navigates. Enquiry only — no booking, no payment. See ../CLAUDE.md.
 *
 * `image` keys into lib/images.ts (local files + required attribution).
 */

import type { ImageKey } from "@/lib/images";

export type Difficulty = "Relaxed" | "Moderate" | "Active" | "Challenging";
export type TripStyle =
  | "Honeymoon"
  | "Family"
  | "Adventure"
  | "Cultural"
  | "Beach"
  | "Wellness"
  | "Group";

export interface ItineraryDay {
  day: number;
  title: string;
  detail: string;
}

export interface PackageReview {
  author: string;
  country: string;
  rating: number;
  text: string;
}

export interface TravelPackage {
  id: string;
  name: string;
  destinationId: string;
  region: "Europe" | "Asia" | "Middle East" | "Oceania" | "Africa" | "Americas";
  styles: TripStyle[];
  durationDays: number;
  durationNights: number;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  difficulty: Difficulty;
  groupSizeMin: number;
  groupSizeMax: number;
  summary: string;
  highlights: string[];
  itinerary: ItineraryDay[];
  accommodation: string[];
  meals: string;
  activities: string[];
  exclusions: string[];
  travelTips: string[];
  reviews: PackageReview[];
  gradient: string;
  image: ImageKey;
}

export const packages: TravelPackage[] = [
  {
    id: "alpine-quiet",
    name: "The Alpine Quiet",
    destinationId: "switzerland",
    region: "Europe",
    styles: ["Wellness", "Cultural"],
    durationDays: 7,
    durationNights: 6,
    price: 306000,
    currency: "INR",
    rating: 4.9,
    reviewCount: 128,
    difficulty: "Moderate",
    groupSizeMin: 2,
    groupSizeMax: 10,
    summary:
      "A week in the Bernese Oberland built around mountain air, thermal water, and trains that arrive exactly when they say they will.",
    highlights: [
      "Private cog-railway ascent to Kleine Scheidegg",
      "Thermal bathing at a members-only alpine spa",
      "Cheese cellar tasting with a fourth-generation affineur",
      "Guided glacier walk with certified mountain leader",
    ],
    itinerary: [
      { day: 1, title: "Arrive Zürich", detail: "Private transfer to Grindelwald; evening at leisure." },
      { day: 2, title: "The high railway", detail: "Cog railway to Kleine Scheidegg, walk down to Wengen." },
      { day: 3, title: "Glacier day", detail: "Guided ice walk, afternoon in the thermal baths." },
      { day: 4, title: "Lauterbrunnen valley", detail: "Seventy-two waterfalls, and a long lunch." },
      { day: 5, title: "Cheese and cellars", detail: "Affineur tasting, then free afternoon." },
      { day: 6, title: "Interlaken", detail: "Lake day — optional paragliding descent." },
      { day: 7, title: "Depart", detail: "Transfer to Zürich." },
    ],
    accommodation: ["5★ alpine lodge, 4 nights", "Boutique lakeside hotel, 2 nights"],
    meals: "Daily breakfast, 3 dinners, 1 tasting lunch",
    activities: ["Glacier walk", "Thermal spa", "Cheese tasting", "Optional paragliding"],
    exclusions: ["International flights", "Travel insurance", "Optional paragliding fee", "Personal expenses"],
    travelTips: [
      "Layer — valley and summit can differ by 15°C.",
      "Swiss rail is punctual to the minute; do not be late.",
      "Bring broken-in walking boots for the glacier day.",
    ],
    reviews: [
      { author: "Priya N.", country: "India", rating: 5, text: "The pacing was the best part — never rushed, never idle." },
      { author: "Tom W.", country: "UK", rating: 5, text: "The glacier guide was extraordinary. Worth the trip alone." },
    ],
    gradient: "from-slate-700 via-sky-800 to-slate-900",
    image: "pkg-alpine",
  },
  {
    id: "bali-slow",
    name: "Bali, Slowly",
    destinationId: "bali",
    region: "Asia",
    styles: ["Honeymoon", "Wellness", "Beach"],
    durationDays: 8,
    durationNights: 7,
    price: 177000,
    currency: "INR",
    rating: 4.8,
    reviewCount: 214,
    difficulty: "Relaxed",
    groupSizeMin: 2,
    groupSizeMax: 6,
    summary:
      "Ubud's green interior first, then the Bukit coast — designed for couples who want the island without the itinerary.",
    highlights: [
      "Private villa with plunge pool over the Ayung gorge",
      "Sunrise rice-terrace walk before the crowds",
      "Balinese blessing ceremony with a local family",
      "Cliffside seafood dinner at Uluwatu",
    ],
    itinerary: [
      { day: 1, title: "Arrive Denpasar", detail: "Transfer to Ubud; welcome dinner." },
      { day: 2, title: "Terraces at dawn", detail: "Early walk through Tegallalang before the tour buses." },
      { day: 3, title: "Temples and water", detail: "Tirta Empul, then a free afternoon." },
      { day: 4, title: "Ubud at leisure", detail: "Spa morning, markets, optional cooking class." },
      { day: 5, title: "South to the Bukit", detail: "Transfer to the coast; sunset at Uluwatu." },
      { day: 6, title: "Beach day", detail: "Padang Padang and Bingin; nothing scheduled." },
      { day: 7, title: "Ocean morning", detail: "Optional surf lesson or snorkel charter." },
      { day: 8, title: "Depart", detail: "Transfer to Denpasar." },
    ],
    accommodation: ["Private pool villa, Ubud — 4 nights", "Clifftop resort, Uluwatu — 3 nights"],
    meals: "Daily breakfast, welcome dinner, 1 cliffside dinner",
    activities: ["Rice terrace walk", "Temple visits", "Spa", "Optional surf lesson"],
    exclusions: ["International flights", "Visa on arrival fee", "Travel insurance", "Optional activities"],
    travelTips: [
      "Cover shoulders and knees at temples; sarongs are provided.",
      "Ubud to Uluwatu is ~2 hours — longer in traffic.",
      "Carry small cash; many warungs are cash-only.",
    ],
    reviews: [
      { author: "Aisha & Omar", country: "UAE", rating: 5, text: "Our honeymoon, and they got the balance exactly right." },
      { author: "Grace L.", country: "Australia", rating: 4, text: "Villa was stunning. Would have liked one more beach day." },
    ],
    gradient: "from-emerald-700 via-teal-700 to-cyan-900",
    image: "pkg-uluwatu",
  },
  {
    id: "maldives-still",
    name: "Baa Atoll Stillness",
    destinationId: "maldives",
    region: "Asia",
    styles: ["Honeymoon", "Beach", "Wellness"],
    durationDays: 6,
    durationNights: 5,
    price: 421000,
    currency: "INR",
    rating: 4.9,
    reviewCount: 96,
    difficulty: "Relaxed",
    groupSizeMin: 2,
    groupSizeMax: 4,
    summary:
      "An overwater villa in a UNESCO biosphere reserve, timed to manta season. Deliberately unstructured.",
    highlights: [
      "Overwater villa with direct lagoon access",
      "Hanifaru Bay manta and whale shark snorkel",
      "Private sandbank dinner",
      "Marine biologist-led reef walk",
    ],
    itinerary: [
      { day: 1, title: "Arrive Malé", detail: "Seaplane to Baa Atoll; sunset arrival." },
      { day: 2, title: "Reef day", detail: "Guided house-reef snorkel with resident biologist." },
      { day: 3, title: "Hanifaru Bay", detail: "Manta aggregation excursion (seasonal)." },
      { day: 4, title: "Nothing", detail: "Deliberately unscheduled. Spa optional." },
      { day: 5, title: "Sandbank", detail: "Private dinner on a sandbank at sunset." },
      { day: 6, title: "Depart", detail: "Seaplane to Malé." },
    ],
    accommodation: ["Overwater villa, 5 nights"],
    meals: "Full board; sandbank dinner included",
    activities: ["Snorkelling", "Manta excursion", "Spa", "Optional diving"],
    exclusions: ["International flights", "Diving certification", "Premium spirits", "Travel insurance"],
    travelTips: [
      "Manta season runs roughly May–November; sightings are never guaranteed.",
      "Reef-safe sunscreen only — enforced at the resort.",
      "Seaplanes fly daylight hours only; book flights accordingly.",
    ],
    reviews: [
      { author: "Daniel R.", country: "Germany", rating: 5, text: "The sandbank dinner is not a gimmick. It was the highlight." },
    ],
    gradient: "from-cyan-600 via-sky-700 to-blue-900",
    image: "pkg-maldives",
  },
  {
    id: "japan-old-road",
    name: "The Old Road: Kyoto & Nakasendo",
    destinationId: "japan",
    region: "Asia",
    styles: ["Cultural", "Adventure"],
    durationDays: 10,
    durationNights: 9,
    price: 344000,
    currency: "INR",
    rating: 4.9,
    reviewCount: 173,
    difficulty: "Active",
    groupSizeMin: 2,
    groupSizeMax: 12,
    summary:
      "Temple mornings in Kyoto, then three days walking the old post road between Magome and Narai, staying in family-run ryokan.",
    highlights: [
      "Dawn entry to a normally-closed temple garden",
      "Three-day guided Nakasendo walk",
      "Ryokan stays with kaiseki dinners",
      "Tea ceremony with a working practitioner, not a performance",
    ],
    itinerary: [
      { day: 1, title: "Arrive Osaka", detail: "Transfer to Kyoto." },
      { day: 2, title: "Kyoto east", detail: "Dawn garden visit; Higashiyama on foot." },
      { day: 3, title: "Kyoto west", detail: "Arashiyama bamboo, then tea ceremony." },
      { day: 4, title: "To the mountains", detail: "Rail to Nakatsugawa; first ryokan night." },
      { day: 5, title: "Magome to Tsumago", detail: "8km walk over the Magome pass." },
      { day: 6, title: "Tsumago to Nojiri", detail: "Longer valley stage, ~14km." },
      { day: 7, title: "Narai", detail: "Final stage into the best-preserved post town." },
      { day: 8, title: "To Tokyo", detail: "Rail east; evening free." },
      { day: 9, title: "Tokyo", detail: "Guided morning, afternoon at leisure." },
      { day: 10, title: "Depart", detail: "Transfer to Haneda or Narita." },
    ],
    accommodation: ["Kyoto machiya townhouse, 3 nights", "Traditional ryokan, 4 nights", "Tokyo hotel, 2 nights"],
    meals: "Daily breakfast, 4 kaiseki dinners",
    activities: ["Guided walking", "Tea ceremony", "Temple visits", "Onsen bathing"],
    exclusions: ["International flights", "Japan Rail Pass", "Travel insurance", "Most lunches"],
    travelTips: [
      "Luggage is forwarded between ryokan — pack a small daypack.",
      "Tattoos may restrict onsen access; ask us in advance.",
      "The walking stages are hilly but not technical.",
    ],
    reviews: [
      { author: "Meera S.", country: "India", rating: 5, text: "Walking into Narai at dusk is something I still think about." },
      { author: "Jon P.", country: "Canada", rating: 5, text: "Genuinely well-guided. Nothing felt touristy." },
    ],
    gradient: "from-rose-800 via-red-900 to-slate-900",
    image: "pkg-tsumago",
  },
  {
    id: "iceland-ring",
    name: "Fire, Ice & Empty Roads",
    destinationId: "iceland",
    region: "Europe",
    styles: ["Adventure", "Family"],
    durationDays: 8,
    durationNights: 7,
    price: 297000,
    currency: "INR",
    rating: 4.8,
    reviewCount: 141,
    difficulty: "Moderate",
    groupSizeMin: 2,
    groupSizeMax: 8,
    summary:
      "A self-drive Ring Road loop with the logistics removed — every night booked, every detour worth taking already marked.",
    highlights: [
      "Glacier lagoon boat among the icebergs",
      "Aurora watching from a dark-sky lodge",
      "Private geothermal bathing away from the crowds",
      "Puffin colony visit (seasonal)",
    ],
    itinerary: [
      { day: 1, title: "Arrive Keflavík", detail: "Collect vehicle; night near Reykjavík." },
      { day: 2, title: "South coast", detail: "Seljalandsfoss, Skógafoss, black sand at Vík." },
      { day: 3, title: "Glacier country", detail: "Jökulsárlón lagoon and Diamond Beach." },
      { day: 4, title: "East fjords", detail: "Slow coastal driving; fishing villages." },
      { day: 5, title: "Lake Mývatn", detail: "Geothermal fields and nature baths." },
      { day: 6, title: "North", detail: "Goðafoss and Akureyri." },
      { day: 7, title: "West", detail: "Return south through the highlands' edge." },
      { day: 8, title: "Depart", detail: "Return vehicle at Keflavík." },
    ],
    accommodation: ["Boutique guesthouses and countryside lodges, 7 nights"],
    meals: "Daily breakfast",
    activities: ["Self-drive touring", "Glacier lagoon cruise", "Geothermal bathing", "Aurora watching"],
    exclusions: ["International flights", "Fuel", "Lunches and dinners", "Travel insurance", "Vehicle excess waiver"],
    travelTips: [
      "Check road.is daily in shoulder season — conditions change fast.",
      "Aurora requires dark, clear skies; September–March only.",
      "Never park on the road to photograph. It is the main cause of accidents.",
    ],
    reviews: [
      { author: "The Alvarez family", country: "Spain", rating: 5, text: "Perfect with teenagers. Enough freedom, zero planning stress." },
    ],
    gradient: "from-indigo-800 via-slate-800 to-emerald-900",
    image: "pkg-aurora",
  },
  {
    id: "cyclades-charter",
    name: "Cyclades by Private Charter",
    destinationId: "greece",
    region: "Europe",
    styles: ["Group", "Beach", "Family"],
    durationDays: 8,
    durationNights: 7,
    price: 263000,
    currency: "INR",
    rating: 4.8,
    reviewCount: 87,
    difficulty: "Relaxed",
    groupSizeMin: 4,
    groupSizeMax: 12,
    summary:
      "Island-hopping on your own schedule rather than the ferry timetable's — anchored off beaches the day boats never reach.",
    highlights: [
      "Private skippered charter for the full week",
      "Swimming stops unreachable by road",
      "Long tavern dinners in working harbours",
      "Sunset approach into Santorini's caldera",
    ],
    itinerary: [
      { day: 1, title: "Board at Paros", detail: "Provision and settle in; harbour dinner." },
      { day: 2, title: "Antiparos", detail: "Cave visit and swimming stops." },
      { day: 3, title: "Naxos", detail: "Mountain villages and the Portara at sunset." },
      { day: 4, title: "Small Cyclades", detail: "Koufonisia — the best water of the week." },
      { day: 5, title: "Ios", detail: "Quiet northern bays, not the town." },
      { day: 6, title: "Santorini", detail: "Caldera approach at golden hour." },
      { day: 7, title: "Thirasia", detail: "The caldera's quiet side." },
      { day: 8, title: "Disembark", detail: "Transfer to Santorini airport." },
    ],
    accommodation: ["Private charter yacht with en-suite cabins, 7 nights"],
    meals: "Daily breakfast and 4 onboard lunches",
    activities: ["Sailing", "Swimming and snorkelling", "Village walks", "Paddleboarding"],
    exclusions: ["International flights", "Most dinners ashore", "Fuel surcharge", "Travel insurance", "Crew gratuity"],
    travelTips: [
      "The meltemi wind peaks in July–August; routes may adjust for safety.",
      "Soft luggage only — hard cases will not stow.",
      "Cabins are comfortable but compact. This is a yacht, not a suite.",
    ],
    reviews: [
      { author: "Sofia K.", country: "Greece", rating: 5, text: "We're Greek and it still showed us islands we'd never seen properly." },
      { author: "Mark T.", country: "USA", rating: 4, text: "Superb. Be ready for a route change if the wind gets up." },
    ],
    gradient: "from-sky-600 via-blue-700 to-indigo-900",
    image: "pkg-oia-domes",
  },
  {
    id: "empty-quarter",
    name: "Towers & the Empty Quarter",
    destinationId: "dubai",
    region: "Middle East",
    styles: ["Family", "Adventure", "Cultural"],
    durationDays: 5,
    durationNights: 4,
    price: 230000,
    currency: "INR",
    rating: 4.7,
    reviewCount: 112,
    difficulty: "Relaxed",
    groupSizeMin: 2,
    groupSizeMax: 8,
    summary:
      "Two days of glass-and-gold city, then two in the largest sand desert on earth. The contrast is the whole point.",
    highlights: [
      "Sunset from the 148th floor of the Burj Khalifa",
      "Overnight in a private desert camp under full dark sky",
      "Dune drive with a licensed desert guide",
      "Old Dubai dhow crossing and spice souk walk",
    ],
    itinerary: [
      { day: 1, title: "Arrive Dubai", detail: "Transfer to the Marina; evening at leisure." },
      { day: 2, title: "Old and new", detail: "Al Fahidi quarter, abra crossing, souks, then Burj Khalifa at sunset." },
      { day: 3, title: "Into the sand", detail: "Drive to the Rub' al Khali edge; camp arrival and dune walk." },
      { day: 4, title: "Desert morning", detail: "Sunrise over the dunes, falconry demonstration, return to the city." },
      { day: 5, title: "Depart", detail: "Transfer to DXB." },
    ],
    accommodation: ["Marina hotel, 2 nights", "Private desert camp, 2 nights"],
    meals: "Daily breakfast, 2 camp dinners",
    activities: ["Dune driving", "Falconry", "Souk walking tour", "Observation deck"],
    exclusions: ["International flights", "Travel insurance", "Alcohol", "Optional hot-air balloon"],
    travelTips: [
      "May–September is genuinely too hot for the desert nights; travel November–March.",
      "Camps are comfortable but remote — bring anything you cannot do without.",
      "Dress modestly in the old quarter and at the souks.",
    ],
    reviews: [
      { author: "Hannah B.", country: "UK", rating: 5, text: "The desert half redeemed a city I thought I wouldn't like." },
      { author: "Rajesh K.", country: "India", rating: 4, text: "Camp was excellent. City days felt slightly rushed." },
    ],
    gradient: "from-amber-600 via-orange-700 to-yellow-900",
    image: "pkg-rubalkhali",
  },
  {
    id: "amalfi-coast",
    name: "The Amalfi Coast, Properly",
    destinationId: "italy",
    region: "Europe",
    styles: ["Honeymoon", "Cultural", "Beach"],
    durationDays: 7,
    durationNights: 6,
    price: 278000,
    currency: "INR",
    rating: 4.8,
    reviewCount: 165,
    difficulty: "Moderate",
    groupSizeMin: 2,
    groupSizeMax: 8,
    summary:
      "Positano and Ravello without the coach traffic — moved by private boat wherever the road would cost you an hour.",
    highlights: [
      "Private boat transfers along the coast",
      "Walk the Path of the Gods above Praiano",
      "Lemon grove lunch with the family that farms it",
      "Evening concert in the Ravello gardens (seasonal)",
    ],
    itinerary: [
      { day: 1, title: "Arrive Naples", detail: "Private transfer to Positano." },
      { day: 2, title: "Positano", detail: "Morning at leisure; afternoon boat to Nerano for lunch." },
      { day: 3, title: "Path of the Gods", detail: "Guided ridge walk, ~6km, finishing in Praiano." },
      { day: 4, title: "Capri", detail: "Early boat to beat the day trippers." },
      { day: 5, title: "Ravello", detail: "Villa gardens and an evening concert in season." },
      { day: 6, title: "Lemon country", detail: "Grove visit and long family lunch." },
      { day: 7, title: "Depart", detail: "Transfer to Naples." },
    ],
    accommodation: ["Cliffside hotel, Positano — 4 nights", "Historic villa, Ravello — 2 nights"],
    meals: "Daily breakfast, 2 dinners, 1 grove lunch",
    activities: ["Coastal walking", "Private boat", "Garden visits", "Food tasting"],
    exclusions: ["International flights", "Travel insurance", "Most dinners", "Concert tickets out of season"],
    travelTips: [
      "The coast is vertical — expect steps everywhere, and pack light.",
      "August is crowded and hot; May, June and September are better.",
      "The Path of the Gods needs proper shoes, not sandals.",
    ],
    reviews: [
      { author: "Elena V.", country: "Italy", rating: 5, text: "Using boats instead of that road was worth every cent." },
      { author: "Peter H.", country: "Ireland", rating: 5, text: "The lemon grove lunch was the nicest afternoon of our year." },
    ],
    gradient: "from-sky-700 via-amber-700 to-orange-900",
    image: "pkg-amalfi",
  },
  {
    id: "puglia-trulli",
    name: "Puglia: Stone Roofs & Long Lunches",
    destinationId: "italy",
    region: "Europe",
    styles: ["Family", "Cultural"],
    durationDays: 8,
    durationNights: 7,
    price: 220000,
    currency: "INR",
    rating: 4.7,
    reviewCount: 78,
    difficulty: "Relaxed",
    groupSizeMin: 2,
    groupSizeMax: 10,
    summary:
      "Italy's heel at its own pace — whitewashed towns, olive country, and a converted trullo to come back to each evening.",
    highlights: [
      "Two nights in a restored trullo at Alberobello",
      "Orecchiette-making with a Bari nonna",
      "Baroque Lecce by evening light",
      "Adriatic swimming at Polignano a Mare",
    ],
    itinerary: [
      { day: 1, title: "Arrive Bari", detail: "Collect vehicle; transfer to the Itria valley." },
      { day: 2, title: "Alberobello", detail: "Trulli district on foot before the day buses." },
      { day: 3, title: "Locorotondo & Martina Franca", detail: "Hill towns and a wine tasting." },
      { day: 4, title: "Olive country", detail: "Working masseria visit and oil tasting." },
      { day: 5, title: "Lecce", detail: "Baroque centre; papier-mâché workshop." },
      { day: 6, title: "Otranto", detail: "Adriatic beaches and the mosaic cathedral." },
      { day: 7, title: "Polignano a Mare", detail: "Cliff swimming and a farewell dinner." },
      { day: 8, title: "Depart", detail: "Return vehicle at Bari." },
    ],
    accommodation: ["Restored trullo, 2 nights", "Masseria farmhouse, 3 nights", "Lecce townhouse, 2 nights"],
    meals: "Daily breakfast, 3 dinners, 1 cooking class lunch",
    activities: ["Cooking class", "Olive oil tasting", "Wine tasting", "Sea swimming"],
    exclusions: ["International flights", "Vehicle hire fuel", "Travel insurance", "Most lunches"],
    travelTips: [
      "A car is essential here; public transport is thin.",
      "Towns shut for riposo in the early afternoon — plan around it.",
      "Trulli are charming but small; luggage space is limited.",
    ],
    reviews: [
      { author: "Nadia F.", country: "France", rating: 5, text: "The masseria was the highlight — we didn't want to leave." },
      { author: "Chris D.", country: "USA", rating: 4, text: "Wonderful food. Driving the small lanes takes some nerve." },
    ],
    gradient: "from-amber-700 via-orange-800 to-stone-900",
    image: "pkg-trulli",
  },
  {
    id: "paris-loire",
    name: "Paris & the Châteaux",
    destinationId: "paris",
    region: "Europe",
    styles: ["Cultural", "Honeymoon"],
    durationDays: 6,
    durationNights: 5,
    price: 249000,
    currency: "INR",
    rating: 4.7,
    reviewCount: 134,
    difficulty: "Relaxed",
    groupSizeMin: 2,
    groupSizeMax: 8,
    summary:
      "Three days in Paris with the queues handled, then south into Loire château country and the vineyards around it.",
    highlights: [
      "Reserved-entry mornings at the Louvre and Orsay",
      "Private after-hours château visit at Chambord",
      "Vouvray cellar tasting with the winemaker",
      "Seine dinner cruise on a small classic boat",
    ],
    itinerary: [
      { day: 1, title: "Arrive Paris", detail: "Transfer to the 7th; evening walk along the Seine." },
      { day: 2, title: "Museums", detail: "Reserved entry to the Louvre; afternoon at the Orsay." },
      { day: 3, title: "Montmartre & Marais", detail: "Guided morning, free afternoon, evening cruise." },
      { day: 4, title: "To the Loire", detail: "Rail to Tours; Chambord in the late afternoon." },
      { day: 5, title: "Châteaux and cellars", detail: "Chenonceau, then a Vouvray tasting." },
      { day: 6, title: "Depart", detail: "Rail to Paris and onward transfer." },
    ],
    accommodation: ["Boutique hotel, Paris 7th — 3 nights", "Loire manor house, 2 nights"],
    meals: "Daily breakfast, 1 cruise dinner, 1 tasting lunch",
    activities: ["Museum visits", "Château tours", "Wine tasting", "Seine cruise"],
    exclusions: ["International flights", "Rail upgrades", "Travel insurance", "Most dinners"],
    travelTips: [
      "Museum reservations are time-stamped; arriving late forfeits the slot.",
      "The Loire is best by car or bicycle — we arrange either.",
      "Sundays close many shops but museums stay open.",
    ],
    reviews: [
      { author: "Lauren M.", country: "Canada", rating: 5, text: "Skipping every queue changed how the city felt." },
      { author: "Ahmed S.", country: "Egypt", rating: 4, text: "Chambord after hours was unforgettable. Wish we'd had another Loire day." },
    ],
    gradient: "from-slate-600 via-indigo-800 to-slate-900",
    image: "pkg-chambord",
  },
  {
    id: "nz-southern",
    name: "Southern Alps & Fiordland",
    destinationId: "new-zealand",
    region: "Oceania",
    styles: ["Adventure", "Family"],
    durationDays: 12,
    durationNights: 11,
    price: 392000,
    currency: "INR",
    rating: 4.9,
    reviewCount: 103,
    difficulty: "Active",
    groupSizeMin: 2,
    groupSizeMax: 8,
    summary:
      "South Island end to end — Queenstown, the glaciers, and an overnight cruise on Doubtful Sound with no other boats in sight.",
    highlights: [
      "Overnight cruise on Doubtful Sound",
      "Helicopter landing on the Franz Josef glacier",
      "Dark-sky stargazing at Lake Tekapo",
      "Central Otago pinot tasting",
    ],
    itinerary: [
      { day: 1, title: "Arrive Christchurch", detail: "Collect vehicle; night in the city." },
      { day: 2, title: "Lake Tekapo", detail: "Drive inland; observatory stargazing after dark." },
      { day: 3, title: "Mount Cook", detail: "Hooker Valley walk beneath the highest peak." },
      { day: 4, title: "To Wanaka", detail: "Lindis Pass; lakeside evening." },
      { day: 5, title: "Queenstown", detail: "Arrive via the Crown Range; free afternoon." },
      { day: 6, title: "Otago wine", detail: "Gibbston valley cellars and a long lunch." },
      { day: 7, title: "Doubtful Sound", detail: "Overnight cruise into Fiordland." },
      { day: 8, title: "Te Anau", detail: "Return to shore; glow-worm caves in the evening." },
      { day: 9, title: "West coast", detail: "Long drive north through rainforest." },
      { day: 10, title: "Franz Josef", detail: "Helicopter glacier landing (weather permitting)." },
      { day: 11, title: "Arthur's Pass", detail: "Alpine crossing back east." },
      { day: 12, title: "Depart", detail: "Return vehicle at Christchurch." },
    ],
    accommodation: ["Lodges and boutique hotels, 10 nights", "Overnight cruise vessel, 1 night"],
    meals: "Daily breakfast, all meals aboard the cruise, 2 dinners",
    activities: ["Hiking", "Scenic helicopter flight", "Wine tasting", "Stargazing", "Kayaking"],
    exclusions: ["International flights", "Fuel", "Travel insurance", "Helicopter weather rescheduling costs"],
    travelTips: [
      "Distances look short on a map and are not — the driving is the trip.",
      "Sandflies in Fiordland are relentless; bring repellent.",
      "Helicopter flights cancel often for weather. Build in flexibility.",
    ],
    reviews: [
      { author: "Ben & Kate", country: "UK", rating: 5, text: "Doubtful Sound overnight is the single best thing we've ever booked." },
      { author: "Yuki T.", country: "Japan", rating: 5, text: "Twelve days felt right. Any shorter and it would be a blur." },
    ],
    gradient: "from-emerald-800 via-teal-900 to-slate-900",
    image: "pkg-queenstown",
  },
  {
    id: "kyoto-autumn",
    name: "Kyoto in Autumn",
    destinationId: "japan",
    region: "Asia",
    styles: ["Cultural", "Wellness"],
    durationDays: 6,
    durationNights: 5,
    price: 282000,
    currency: "INR",
    rating: 4.9,
    reviewCount: 156,
    difficulty: "Relaxed",
    groupSizeMin: 2,
    groupSizeMax: 10,
    summary:
      "A short, deliberately slow trip timed to the maple season, built around gardens that are best in the first hour of the day.",
    highlights: [
      "Night illumination at Eikandō during the maple peak",
      "Private dawn access to a moss garden",
      "Kaiseki dinner at a long-established ryotei",
      "Half-day in Uji, tea country since the 12th century",
    ],
    itinerary: [
      { day: 1, title: "Arrive Kyoto", detail: "Transfer from Osaka; evening in Gion." },
      { day: 2, title: "Eastern hills", detail: "Dawn garden, Nanzen-ji, and the aqueduct." },
      { day: 3, title: "Arashiyama", detail: "Bamboo grove early, then Okochi Sanso villa." },
      { day: 4, title: "Uji", detail: "Byodo-in and a tea house tasting." },
      { day: 5, title: "Maple night", detail: "Free day; evening illumination at Eikandō." },
      { day: 6, title: "Depart", detail: "Transfer to Kansai." },
    ],
    accommodation: ["Machiya townhouse, 3 nights", "Traditional ryokan, 2 nights"],
    meals: "Daily breakfast, 1 kaiseki dinner, 1 tea tasting",
    activities: ["Garden visits", "Tea ceremony", "Temple illuminations", "Onsen bathing"],
    exclusions: ["International flights", "Rail pass", "Travel insurance", "Most dinners"],
    travelTips: [
      "Peak maple colour is roughly mid to late November and shifts yearly.",
      "Illumination evenings are busy — we book timed entry where it exists.",
      "Kyoto is a walking city; comfortable shoes matter more than anything else.",
    ],
    reviews: [
      { author: "Sarah L.", country: "Australia", rating: 5, text: "The dawn garden was silent. Worth getting up for, twice over." },
      { author: "Miguel A.", country: "Spain", rating: 5, text: "Six days was plenty for Kyoto done slowly." },
    ],
    gradient: "from-orange-700 via-red-800 to-slate-900",
    image: "pkg-kyoto-autumn",
  },
  {
    id: "small-cyclades",
    name: "The Small Cyclades",
    destinationId: "greece",
    region: "Europe",
    styles: ["Beach", "Wellness", "Honeymoon"],
    durationDays: 7,
    durationNights: 6,
    price: 187000,
    currency: "INR",
    rating: 4.8,
    reviewCount: 64,
    difficulty: "Relaxed",
    groupSizeMin: 2,
    groupSizeMax: 6,
    summary:
      "Koufonisia, Schinoussa and Iraklia — three islands most people have never heard of, where the water is the entire attraction.",
    highlights: [
      "Walk the whole of Pano Koufonisi in a morning",
      "Swimming coves reachable only on foot",
      "Family-run tavernas with no printed menu",
      "Private boat day to Keros",
    ],
    itinerary: [
      { day: 1, title: "Arrive Naxos", detail: "Ferry to Koufonisia; sunset arrival." },
      { day: 2, title: "The coast path", detail: "Walk the north shore, swimming as you go." },
      { day: 3, title: "Boat day", detail: "Private caique to Keros and the sea caves." },
      { day: 4, title: "Schinoussa", detail: "Short ferry; a quieter island still." },
      { day: 5, title: "Iraklia", detail: "Cave hike and an empty southern beach." },
      { day: 6, title: "Back to Koufonisia", detail: "Last swim; farewell dinner at the harbour." },
      { day: 7, title: "Depart", detail: "Ferry to Naxos and onward." },
    ],
    accommodation: ["Small guesthouses and studios, 6 nights"],
    meals: "Daily breakfast, 2 dinners",
    activities: ["Swimming", "Coastal walking", "Private boat", "Snorkelling"],
    exclusions: ["International flights", "Ferry upgrades", "Travel insurance", "Most meals"],
    travelTips: [
      "Ferries here are small and weather-dependent; keep the return day loose.",
      "There are no cars to speak of on Koufonisia. That is the point.",
      "ATMs are scarce — bring cash from Naxos.",
    ],
    reviews: [
      { author: "Freya J.", country: "Denmark", rating: 5, text: "The water genuinely looks like the photographs. I didn't believe it either." },
      { author: "Nikos P.", country: "Greece", rating: 5, text: "Quietest week I've had in the Aegean in twenty years." },
    ],
    gradient: "from-cyan-500 via-sky-600 to-blue-800",
    image: "pkg-milkbeach",
  },
  {
    id: "iceland-winter",
    name: "Iceland in Winter",
    destinationId: "iceland",
    region: "Europe",
    styles: ["Adventure", "Honeymoon"],
    durationDays: 6,
    durationNights: 5,
    price: 273000,
    currency: "INR",
    rating: 4.8,
    reviewCount: 91,
    difficulty: "Moderate",
    groupSizeMin: 2,
    groupSizeMax: 8,
    summary:
      "The south coast in its hardest, best season — ice caves, four-hour days, and the aurora when the sky cooperates.",
    highlights: [
      "Guided blue ice cave beneath Vatnajökull",
      "Zodiac among the icebergs on the glacier lagoon",
      "Aurora watching from a remote lodge",
      "Private geothermal bathing after dark",
    ],
    itinerary: [
      { day: 1, title: "Arrive Keflavík", detail: "Transfer to Reykjavík; evening at leisure." },
      { day: 2, title: "Golden Circle", detail: "Þingvellir, Geysir, Gullfoss in winter light." },
      { day: 3, title: "South coast", detail: "Waterfalls and black sand; night at a dark-sky lodge." },
      { day: 4, title: "Ice cave", detail: "Guided cave visit and the glacier lagoon by zodiac." },
      { day: 5, title: "Return west", detail: "Geothermal bathing; last aurora attempt." },
      { day: 6, title: "Depart", detail: "Transfer to Keflavík." },
    ],
    accommodation: ["Reykjavík hotel, 2 nights", "Countryside dark-sky lodge, 3 nights"],
    meals: "Daily breakfast, 2 dinners",
    activities: ["Ice caving", "Zodiac cruise", "Aurora watching", "Geothermal bathing"],
    exclusions: ["International flights", "Travel insurance", "Most dinners", "Crampon hire"],
    travelTips: [
      "Ice caves only exist November–March, and each season's cave differs.",
      "Daylight is around four to five hours in December — days are planned around it.",
      "Aurora is never guaranteed. Five nights gives a fair chance, not a promise.",
    ],
    reviews: [
      { author: "Owen R.", country: "New Zealand", rating: 5, text: "The ice cave is genuinely otherworldly. Go before it melts out." },
      { author: "Clara M.", country: "Brazil", rating: 4, text: "Saw the aurora on night four after three cloudy ones. Worth the wait." },
    ],
    gradient: "from-sky-800 via-slate-800 to-indigo-950",
    image: "pkg-glacier",
  },
  {
    id: "marrakech-sahara",
    name: "Marrakech & the Sahara",
    destinationId: "morocco",
    region: "Africa",
    styles: ["Adventure", "Cultural", "Family"],
    durationDays: 7,
    durationNights: 6,
    price: 225000,
    currency: "INR",
    rating: 4.7,
    reviewCount: 102,
    difficulty: "Moderate",
    groupSizeMin: 2,
    groupSizeMax: 10,
    summary:
      "Medina alleys and mountain passes first, then a camel trek into dunes that go pink at sunset and silent after dark.",
    highlights: [
      "Private riad in the heart of the Marrakech medina",
      "High Atlas crossing via the Tizi n'Tichka pass",
      "Camel trek into the Erg Chebbi dunes at sunset",
      "A night under canvas at a private desert camp",
    ],
    itinerary: [
      { day: 1, title: "Arrive Marrakech", detail: "Transfer to a riad in the medina; evening at Jemaa el-Fnaa." },
      { day: 2, title: "Marrakech", detail: "Majorelle Garden, Bahia Palace, and the souks with a private guide." },
      { day: 3, title: "Over the Atlas", detail: "Tizi n'Tichka pass and the kasbah at Aït Benhaddou; overnight Dades Valley." },
      { day: 4, title: "To the dunes", detail: "Todra Gorge, then on to Merzouga; camel trek at sunset into the Sahara." },
      { day: 5, title: "Sunrise and the long return", detail: "Dawn over the dunes; drive back toward Marrakech via Ouarzazate." },
      { day: 6, title: "Marrakech", detail: "Hammam and spa morning; free afternoon in the medina." },
      { day: 7, title: "Depart", detail: "Transfer to Marrakech airport." },
    ],
    accommodation: ["Boutique riad, Marrakech — 4 nights (split)", "Kasbah guesthouse, Dades Valley — 1 night", "Private desert camp, Merzouga — 1 night"],
    meals: "Daily breakfast, 2 dinners, 1 desert camp dinner under the stars",
    activities: ["Camel trekking", "Desert camping", "Medina walking tour", "Hammam spa"],
    exclusions: ["International flights", "Travel insurance", "Most lunches", "Alcohol"],
    travelTips: [
      "Desert nights are cold even when the days are hot — pack real layers for Merzouga.",
      "Dress modestly outside riads and resorts; shoulders and knees covered is customary.",
      "The Tizi n'Tichka pass has sharp switchbacks — sit toward the front if you're prone to motion sickness.",
    ],
    reviews: [
      { author: "Isabelle R.", country: "France", rating: 5, text: "The desert camp made the whole trip. Silence like I've never heard." },
      { author: "Arjun M.", country: "India", rating: 4, text: "Incredible range of landscape in one week. The mountain pass day is long — worth it." },
    ],
    gradient: "from-red-800 via-orange-800 to-amber-900",
    image: "pkg-morocco",
  },
];

/** Convenience lookups used by the chat assistant's package discovery. */
export const regions = [...new Set(packages.map((p) => p.region))];
export const tripStyles = [...new Set(packages.flatMap((p) => p.styles))];

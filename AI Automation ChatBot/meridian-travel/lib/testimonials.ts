/**
 * Mock testimonials for the carousel. Fictional people, original copy —
 * nothing here is reused from any reference material (see ../CLAUDE.md).
 *
 * `avatarGradient` stands in for the customer photo until imagery is sourced.
 */

export interface Testimonial {
  id: string;
  name: string;
  country: string;
  rating: number;
  trip: string;
  text: string;
  /** Initials shown inside the placeholder avatar. */
  initials: string;
  avatarGradient: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "t-1",
    name: "Ananya Deshpande",
    country: "India",
    rating: 5,
    trip: "The Old Road: Kyoto & Nakasendō",
    text: "I've booked a lot of trips and this was the first one where nobody had to fix anything mid-way. Luggage was always where it should be, the guides were genuinely knowledgeable, and the walking days were pitched exactly right for us.",
    initials: "AD",
    avatarGradient: "from-rose-500 to-orange-600",
  },
  {
    id: "t-2",
    name: "Callum Ferguson",
    country: "Scotland",
    rating: 5,
    trip: "Fire, Ice & Empty Roads",
    text: "Self-drive without the planning headache. Every overnight was already sorted, and the notes on which detours were actually worth it saved us days of guessing. We saw the aurora on the fifth night.",
    initials: "CF",
    avatarGradient: "from-indigo-500 to-emerald-600",
  },
  {
    id: "t-3",
    name: "Lucía Moreno",
    country: "Mexico",
    rating: 5,
    trip: "Bali, Slowly",
    text: "We asked for a honeymoon that wasn't packed with activities and they actually listened. Half the days had nothing scheduled at all, which sounds simple but almost nobody gets it right.",
    initials: "LM",
    avatarGradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "t-4",
    name: "Yusuf Rahman",
    country: "Malaysia",
    rating: 4,
    trip: "Cyclades by Private Charter",
    text: "The wind forced a route change on day three and the crew handled it so smoothly the kids didn't even notice. Ended up anchored somewhere better than the original plan.",
    initials: "YR",
    avatarGradient: "from-sky-500 to-blue-700",
  },
  {
    id: "t-5",
    name: "Ingrid Halvorsen",
    country: "Norway",
    rating: 5,
    trip: "The Alpine Quiet",
    text: "I travel in the mountains often and I still learned things from our guide. The thermal spa afternoon after the glacier day was a small scheduling decision that made the whole week.",
    initials: "IH",
    avatarGradient: "from-slate-500 to-sky-700",
  },
];

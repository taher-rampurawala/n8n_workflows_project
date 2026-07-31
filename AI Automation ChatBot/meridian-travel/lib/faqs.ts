/**
 * Single source of truth for FAQ content.
 *
 * The brief requires the FAQ section and the chatbot to stay in sync, so both
 * read from this array — the accordion renders `question`/`answer`, and the
 * chatbot's mock matcher scores against `keywords`. Add a topic once, here.
 *
 * Payment options are DISPLAY ONLY — describe accepted methods in prose,
 * implement nothing.
 */

export interface Faq {
  id: string;
  question: string;
  answer: string;
  /** Lowercase tokens the chatbot matches user queries against. */
  keywords: string[];
}

export const faqs: Faq[] = [
  {
    id: "visa",
    question: "Do you help with visa requirements?",
    answer:
      "Yes. Once your itinerary is confirmed we send a destination-specific visa brief covering which visa applies to your nationality, processing times, and the supporting documents you'll need. We prepare invitation and accommodation letters where a consulate requires them. We can't submit an application on your behalf or influence a decision — the consulate is always the deciding authority.",
    keywords: ["visa", "visas", "consulate", "embassy", "entry", "permit"],
  },
  {
    id: "passport",
    question: "How much passport validity do I need?",
    answer:
      "As a rule, six months of validity beyond your return date, plus at least two blank facing pages. Some destinations are stricter, and a handful accept three months. We flag the exact requirement for your route in your pre-departure pack. If your passport is close to the line, renew before booking rather than after.",
    keywords: ["passport", "validity", "expiry", "blank pages", "six months"],
  },
  {
    id: "cancellation",
    question: "What is your cancellation policy?",
    answer:
      "Cancel more than 60 days before departure and you forfeit only the deposit. Between 60 and 30 days, 50% of the trip cost applies. Inside 30 days, the booking is non-refundable, because supplier commitments are already paid. Some flights, charters, and peak-season lodges carry stricter individual terms, and those are always stated on your confirmation before you commit.",
    keywords: ["cancel", "cancellation", "cancelling", "policy", "deposit", "forfeit"],
  },
  {
    id: "refund",
    question: "How do refunds work?",
    answer:
      "Approved refunds are returned to the original payment method within 7–14 business days of confirmation. Where a supplier holds non-recoverable costs, we itemise exactly what was retained and why. If a trip is cancelled by us — which is rare, and usually a safety call — you receive a full refund or a no-cost transfer to another departure, whichever you prefer.",
    keywords: ["refund", "refunds", "money back", "reimburse", "repayment"],
  },
  {
    id: "insurance",
    question: "Do I need travel insurance?",
    answer:
      "Yes — comprehensive travel insurance is a condition of booking. It must cover medical treatment, emergency repatriation, and trip cancellation. If your itinerary includes diving, glacier walking, or high-altitude trekking, check that those activities are named in your policy, as standard cover often excludes them. We're happy to review your policy wording against your itinerary.",
    keywords: ["insurance", "insured", "medical", "cover", "coverage", "repatriation"],
  },
  {
    id: "group-discounts",
    question: "Do you offer group discounts?",
    answer:
      "We do. Groups of six or more receive 5% off the land portion, and groups of ten or more receive 10% plus one complimentary place on most departures. Multi-generational and celebration groups can be quoted as a private departure, which is often better value than it sounds. Tell our team your numbers and we'll price it properly.",
    keywords: ["group", "groups", "discount", "discounts", "family rate", "bulk", "party"],
  },
  {
    id: "best-time",
    question: "When is the best time to travel?",
    answer:
      "It depends entirely on where you're going. The Maldives and Bali are strongest from April to October; Japan is at its best in spring and autumn; Iceland's aurora season runs September to March; the Alps split cleanly into a summer walking season and a winter snow season. Every package page lists its best season, and our team will steer you toward shoulder dates where the weather still holds but the crowds have gone.",
    keywords: ["best time", "when", "season", "seasonal", "weather", "month", "shoulder"],
  },
  {
    id: "payment-options",
    question: "What payment methods do you accept?",
    answer:
      "Bookings are confirmed with a 25% deposit, with the balance due 45 days before departure. We accept major credit and debit cards, UPI, net banking, and NEFT/RTGS bank transfer. Interest-free EMI plans are available on trips over ₹2,50,000 with most major Indian card issuers. All prices are quoted in INR and include GST unless your consultant confirms otherwise in writing.",
    keywords: ["payment", "pay", "card", "credit", "debit", "instalment", "installment", "deposit", "upi", "bank transfer"],
  },
];

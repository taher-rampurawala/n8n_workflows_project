/** Shared site chrome config. Section ids double as smooth-scroll targets. */

export const siteConfig = {
  name: "Meridian & Co.",
  tagline: "Extraordinary journeys, thoughtfully designed.",
  email: "journeys@meridianandco.example",
  phone: "+1 (415) 555-0148",
  address: "218 Harbour Row, Suite 12\nSan Francisco, CA 94111",
  hours: "Mon–Fri 9:00–18:00 PT · Sat 10:00–14:00 PT",
} as const;

/**
 * The chat agent's persona name. Kept separate from `siteConfig.name` since
 * that field is shared site-wide branding (Nav/Footer logos etc.) — the
 * assistant needs a distinct, personal identity ("Musafir") without
 * repurposing the company name.
 */
export const assistantName = "Musafir";

export const navSections = [
  { id: "home", label: "Home" },
  { id: "destinations", label: "Destinations" },
  { id: "packages", label: "Packages" },
  { id: "about", label: "About Us" },
  { id: "faq", label: "FAQs" },
  { id: "contact", label: "Contact" },
] as const;

/**
 * The "Plan My Trip" CTA opens the chat assistant (one consistent behaviour,
 * as the brief requires). Nav and ChatWidget are siblings, so a DOM event is
 * simpler than lifting state through page.tsx.
 */
export const OPEN_CHAT_EVENT = "meridian:open-chat";

export function openChat() {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}

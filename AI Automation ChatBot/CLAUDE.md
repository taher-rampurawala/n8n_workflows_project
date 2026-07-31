# Build Standard — Premium One-Page Marketing Site + AI Chat Widget

A reusable specification for building a single-page, high-polish marketing site
for any niche, with a floating AI chat widget backed by an external **n8n**
agent.

This document is the standard, not a record of any particular build. Follow it
top to bottom to produce a new site to the same quality bar.

---

## 1. What this builds

A **one-page** marketing website for a single brand, plus a floating chat
assistant. No CMS, no database, no backend of your own — all content is typed
mock data committed to the repo, and the only outbound call is the n8n chat
webhook.

**Hard constraints — do not violate without an explicit decision:**

- Every section is reachable by smooth-scroll from one sticky nav.
  **No additional routes or pages.**
- Detail views open as **modals**, never as a new page.
- **No real transactions.** Enquiry / lead capture only — no checkout, no
  payment, no account system, anywhere, including inside detail modals.
- Payment methods may be *described in copy*; nothing is implemented.
- All brand, copy and imagery must be original. Never reuse identifying details
  (name, logo, exact wording) from a reference site used for layout inspiration.
- No conversation logic in the frontend — see §9.

---

## 2. Tech stack

Verified working set. Pin these unless you have a reason and have re-run §5.

| Package | Version | Note |
|---|---|---|
| next | 16.2.12 | Turbopack is the default bundler |
| react / react-dom | 19.2.4 | |
| typescript | 5.x | |
| tailwindcss | 4.x | + `@tailwindcss/postcss` |
| shadcn/ui | 4.16.0 | radix base, CSS variables |
| framer-motion | 12.x | primary animation library |
| gsap | 3.x | only for pinned/scrubbed scroll timelines |
| lenis | 1.x | smooth scroll |
| lucide-react | 1.x | **no brand icons in v1** — see §12 |
| eslint | 9.x | **do not bump to 10** — see §5 |

Runtime: **Node ≥20** is a hard floor (Tailwind 4). Node 24 LTS + npm 11
verified.

> **Next 16 differs substantially from most training data.** The real docs ship
> inside the package at `node_modules/next/dist/docs/`. Read the relevant guide
> before writing framework-level code rather than relying on recalled Next 15
> patterns.

---

## 3. Scaffolding recipe

```bash
# 1. App — no src/, App Router, Tailwind, ESLint
npx --yes create-next-app@latest <name> --ts --eslint --tailwind \
    --no-src-dir --app --import-alias "@/*" --use-npm --yes

# 2. shadcn/ui
npx --yes shadcn@latest init -y -b radix -p nova --no-monorepo \
    --css-variables --no-rtl --pointer

# 3. Primitives
npx --yes shadcn@latest add button dialog accordion card input textarea \
    label badge separator -y

# 4. Animation stack
npm install framer-motion gsap lenis lucide-react

# 5. Apply the overrides from §5, then
npm install
npm approve-scripts sharp unrs-resolver
```

**shadcn CLI gotchas (v4.16):**
- `-b/--base` selects the **primitive library** (`radix` | `base` | `aria`) — it
  is *not* a base colour. Passing a colour fails validation.
- Theme is `-p/--preset`: `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`,
  `sera`, `rhea`. **Omit it and the CLI prompts interactively**, which hangs in
  a non-interactive shell.

**Tailwind 4 has no `tailwind.config`.** The theme lives in `app/globals.css`
under `@theme inline`. Font families are declared there as CSS custom
properties.

**npm 11 gates install scripts.** `sharp` (required for `next/image`
optimisation) and `unrs-resolver` must be approved or image optimisation
silently lacks its native backend.

---

## 4. Project structure

```
<app>/
├── app/
│   ├── layout.tsx        # fonts, SEO + OpenGraph metadata
│   ├── page.tsx          # composes every section — the entire site
│   └── globals.css       # Tailwind 4 @theme, light/dark tokens
├── components/
│   ├── Nav.tsx           # sticky glass nav, scroll-spy, mobile menu
│   ├── Hero.tsx          # full-screen hero
│   ├── Showcase.tsx      # card grid (categories / highlights)
│   ├── Catalogue.tsx     # detailed offering grid
│   ├── CatalogueModal.tsx# detail modal — never a route
│   ├── Stats.tsx         # animated counters / trust signals
│   ├── Testimonials.tsx  # carousel
│   ├── About.tsx         # story, mission, timeline
│   ├── FAQ.tsx           # accordion
│   ├── Contact.tsx       # enquiry form
│   ├── Footer.tsx        # links, newsletter, credits
│   ├── ChatWidget.tsx    # AI chat UI
│   ├── SectionHeading.tsx
│   ├── SmoothScroll.tsx  # Lenis provider
│   └── ui/               # shadcn primitives
├── lib/                  # ALL content and logic — see §5
└── public/images/        # local photography
```

**Section order:** sticky nav → hero → showcase → catalogue → stats →
testimonials → about → FAQ → contact → footer, plus the floating chat widget.

**Conventions:**
- No `src/` directory. Import alias `@/*`.
- **Content is never hardcoded in components.** Components render typed data
  from `lib/`.
- One primary CTA behaviour, used consistently everywhere it appears.

---

## 5. Data layer

All renderable content lives in `lib/` as typed arrays. This is what makes the
build re-skinnable for a different niche without touching components.

| File | Role |
|---|---|
| `lib/site.ts` | Brand name, contact details, nav sections, CTA event |
| `lib/showcase.ts` | Card-grid entries |
| `lib/catalogue.ts` | Detailed offerings rendered in the modal |
| `lib/faqs.ts` | FAQ content **and** the chat agent's knowledge source |
| `lib/testimonials.ts` | Carousel entries |
| `lib/images.ts` | Image registry + licence attribution |
| `lib/format.ts` | Currency / locale formatting |
| `lib/chat.ts` | Chat types + the single n8n integration point |

**Rules:**
- Export a TypeScript `interface` per entity and type the array against it.
  Changing niche means changing field *values*, not component code.
- **FAQ entries carry a `keywords: string[]`** so the same array can be handed
  to the chat agent as its knowledge base. The on-page FAQ and the assistant
  must never drift apart.
- Cross-reference by key, not by duplicating data (e.g. an entry stores an
  image *key* that resolves in `lib/images.ts`).

---

## 6. Dependency security — DO NOT "FIX" THESE ⚠️

A fresh scaffold ships with roughly a dozen high-severity advisories. Resolve
them to `npm audit` → **0** with load-bearing `overrides` in `package.json`:

```json
"overrides": {
  "postcss": "^8.5.25",
  "sharp": "^0.35.3",
  "brace-expansion": "^5.0.9",
  "minimatch": "^10.2.6"
}
```

- **`postcss`** — next hard-pins a vulnerable 8.4.x (path traversal + arbitrary
  file read via `sourceMappingURL`).
- **`sharp`** — next pins a version with inherited libvips CVEs.

**Three traps, each of which will cost you an hour:**

1. **`brace-expansion` and `minimatch` must be upgraded together.** No patched
   1.x–4.x of `brace-expansion` exists; only the v5 line is safe. But v5's CJS
   build exports `expand` as a **named** export, while `minimatch@3` does
   `require('brace-expansion')` expecting a callable default. Overriding
   `brace-expansion` alone breaks ESLint with
   `TypeError: expand is not a function`. Forcing `minimatch@^10` alongside it
   fixes this, because minimatch 10 expects the v5 shape.

2. **Do not upgrade ESLint to 10.** `eslint-config-next` advertises peer
   `eslint >=9.0.0`, but the `eslint-plugin-react` it bundles still calls
   `context.getFilename()`, removed in ESLint 10 →
   `TypeError: contextOrFilename.getFilename is not a function`.

3. **Never run `npm audit fix --force`.** Its suggested remedy for the
   postcss/sharp advisories is to **downgrade `next` to 9.3.3**, destroying the
   project.

Keep the `allowScripts` entries for `sharp` and `unrs-resolver`.

After any dependency change, re-verify with §13 — a clean `npm audit` alone is
not enough, since these overrides can break the toolchain while still auditing
clean.

---

## 7. Imagery pipeline

**Store images locally in `public/images/` and register them in
`lib/images.ts`. Do not hotlink.**

Hotlinking a free-image host is unreliable in production: they rate-limit
(HTTP 429), block generic user agents, and generally ask not to be used as a
CDN. Local files also let `next/image` optimise properly — expect roughly an
800 KB source to serve at ~45 KB at card width. Serving locally also means
`next.config.ts` needs **no** `images.remotePatterns` entry.

**Registry shape** — one entry per image carrying `src`, `width`, `height`,
descriptive `alt`, `artist`, `license`.

**When sourcing from Wikimedia Commons:**
- Only **API-generated thumbnail widths exist.** Hand-building a
  `/thumb/…/<N>px-…` URL returns **400**. Call the API with `iiurlwidth` and use
  the `thumburl` it returns — it snaps to an allowed width.
- Send a **descriptive User-Agent including contact details.** A spoofed
  `Mozilla/5.0` is blocked outright.
- Request `extmetadata` in the same call to capture `Artist` and
  `LicenseShortName`.
- Throttle ~1.5 s between requests, and **verify every file is a valid image**
  after download rather than trusting the fetch.

**Attribution is a licence condition, not decoration.** For CC BY / CC BY-SA
imagery the credit must be rendered — a full credit list in the footer plus
per-photo credits where the image is featured. Never strip it.

**Rendering rules:**
- `next/image` everywhere; raw `<img>` tags are forbidden.
- Every image needs meaningful `alt` — these are content, not decoration.
- Always set `sizes`. `priority` only on the first above-the-fold image.

---

## 8. Currency & locale

- Store prices as **plain integers** in the data layer; never as formatted
  strings.
- Format through a **single module** (`lib/format.ts`) so currency can be
  changed in one place.
- **Pin the locale explicitly** in `Intl.NumberFormat` (e.g. `en-IN` for
  lakh/crore grouping). This is not only about correct grouping — an unpinned
  `toLocaleString()` can format differently on server and client and cause a
  hydration mismatch.
- If you convert from another currency, round to marketing-friendly figures
  rather than exact conversions, and record the rate and date in a comment.
- Currency also appears in copy — the payment FAQ and any budget-related chat
  prompt chips. Update those alongside the formatter.

---

## 9. AI chat widget + n8n

**The frontend contains no conversation logic.** Intent handling, FAQ answers,
catalogue discovery, enquiry lookup and lead capture all belong to the n8n
agent. `lib/chat.ts` only moves text in and out. This keeps the swap from mock
to live a one-line change.

**Wiring:**
1. `.env.local` → `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL=https://<n8n>/webhook/<path>`
2. n8n: Webhook (POST, "Respond to Webhook" mode) → AI Agent → Respond to
   Webhook returning `{ "reply": "..." }`
3. Enable CORS for the site origin.

**Contract** — request body:
```ts
{ message: string, sessionId: string, history: { role, text }[] }
```
`sessionId` is stable per browser tab; wire it into the agent's memory node.
Response: `{ reply: string }`.

Before the env var is set, the widget must remain fully demonstrable — show a
"demo mode" indicator and a placeholder reply. **Nothing else in the UI changes
when it goes live.**

**Required widget features:**
animated launcher with unread indicator · spring-in panel · distinct bot/user
bubbles · typing indicator · suggested prompt chips · auto-growing composer
(Enter sends, Shift+Enter newline) · error state with retry · abortable
in-flight requests · full-screen on mobile.

---

## 10. Design system

- **Typography:** one display face for headings, one highly legible face for
  body/UI, loaded via `next/font/google` and exposed as
  `--font-display` / `--font-body`. Choose the pairing once and don't
  re-litigate it mid-build.
- **Palette:** a primary, one accent, one or two secondary accents, and three
  neutrals (light / dark / mid). Define as CSS custom properties under `:root`
  and `.dark`. Pick values that suit the niche, not generic corporate blue.
- **Light and dark mode are both required.**
- **Visual language:** glassmorphism nav and floating cards, soft gradients,
  blur, generous whitespace, large corner radii, restrained shadows.
- **Nothing ships with default shadcn styling.** Every button, card and form
  control is deliberately styled.
- **Animation is purposeful, never decorative for its own sake:** scroll
  reveals, hover zoom, animated counters, hero text reveal, subtle parallax.
  Cut anything that costs measurable performance.

---

## 11. Accessibility & performance — non-negotiable

- Mobile-first and fully responsive.
- Semantic HTML; SEO metadata and OpenGraph in `app/layout.tsx`.
- **ARIA on every custom interactive component** — chat widget and modals
  especially: `role="dialog"`, `aria-live` on the chat transcript, labelled
  controls, `aria-current` on active nav items.
- **Full keyboard support.** Escape closes overlays and returns focus to the
  trigger. Visible focus rings everywhere.
- **`prefers-reduced-motion` respected throughout** — disable smooth-scroll
  hijacking, hold carousels/slideshows on a single frame, snap counters to
  their final value, drop entrance transforms.
- Decorative overlays marked `aria-hidden`; screen-reader-only text where an
  icon alone carries meaning.

---

## 12. Known traps

| Trap | Detail |
|---|---|
| **lucide-react v1 dropped brand icons** | `Twitter`, `Facebook`, `Instagram`, `Linkedin` no longer exist. Inline the brand SVG paths instead of adding a dependency. |
| **React 19 lint rules** | Calling `setState` synchronously in an effect body, and reading refs during render, are now **errors**. Use lazy `useState` initialisers and move work into handlers or callbacks. |
| **PowerShell 5.1 corrupts UTF-8** | `Get-Content`/`Set-Content` round-trips read UTF-8 as ANSI, mangling em dashes and accented characters. **Edit source files with the editor, never via shell string replacement.** |
| **Hydration vs. browser extensions** | Password managers inject `<div>`s next to inputs before React hydrates, producing recoverable hydration errors. Put `suppressHydrationWarning` on the form and its field wrappers, and **verify in an incognito window before hunting for a code bug**. |
| **`new Date()` in render** | Statically prerendered pages bake the build-time value while the client computes live — they diverge across a New Year boundary. Guard any rendered date. |
| **Turbopack errors are terse** | A missing export reads `Export X doesn't exist in target module`. Check the package's actual exports before assuming the fault is elsewhere. |
| **Interactive CLIs hang** | Any scaffolding command must be fully flagged. A prompt in a non-interactive shell blocks until timeout. |

---

## 13. Verification

Run all four. A green audit alone does not prove the toolchain works.

```bash
npm run lint    # expect exit 0
npm run build   # expect exit 0
npm audit       # expect "found 0 vulnerabilities"
npm run dev     # http://localhost:3000
```

Then confirm in a browser: images load and are served optimised via
`/_next/image`, no console hydration errors, keyboard navigation reaches every
control, and the layout holds from 320 px upward.

---

## 14. Definition of done

- [ ] All sections present, single page, no extra routes
- [ ] 8–10 showcase entries; 12–15 catalogue entries
- [ ] Detail modal covers full detail, ends in an **enquiry** action
- [ ] 8+ FAQs, shared verbatim with the chat agent
- [ ] All imagery local, optimised, `alt`-described and attributed
- [ ] Light and dark mode both verified
- [ ] Chat widget complete per §9, demo mode functional
- [ ] `prefers-reduced-motion` honoured across every animation
- [ ] `npm audit` → 0, lint → 0, build → 0
- [ ] No leftover scaffold artefacts (default SVGs, placeholder copy, unused deps)

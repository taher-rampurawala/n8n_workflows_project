"use client";

import { useState, useSyncExternalStore } from "react";
import { Compass } from "lucide-react";

const emptySubscribe = () => () => {};
/**
 * True once this render is happening on the client, false during SSR and the
 * first hydration pass. useSyncExternalStore (not useState+useEffect) is the
 * React-sanctioned way to read this — it doesn't call setState inside an
 * effect, so it doesn't trip the react-hooks/set-state-in-effect rule.
 */
function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
import { navSections, siteConfig } from "@/lib/site";
import { imageCredits } from "@/lib/images";

/*
 * lucide-react v1 removed its brand icons, so the social marks are inlined
 * here rather than imported. Keep them as plain paths — no extra dependency.
 */
type IconProps = { className?: string };

const Instagram = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const XMark = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Facebook = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
  </svg>
);

const LinkedIn = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13M7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0" />
  </svg>
);

const socials = [
  { icon: Instagram, label: "Instagram" },
  { icon: XMark, label: "X" },
  { icon: Facebook, label: "Facebook" },
  { icon: LinkedIn, label: "LinkedIn" },
];

export function Footer() {
  const [subscribed, setSubscribed] = useState(false);

  /*
   * `suppressHydrationWarning` only covers an element's own attributes/text —
   * it does NOT cover password-manager extensions (LastPass, 1Password, …)
   * injecting a sibling <div> icon next to an <input type="email"> before
   * React hydrates. That extra child still trips a hydration mismatch on the
   * parent. The reliable fix is to not hydrate a real <input> here at all:
   * render an inert, non-form-shaped placeholder for the first client pass
   * (which matches the server output exactly, so hydration succeeds cleanly),
   * then swap in the live input once mounted. That swap is an ordinary
   * client render, not a hydration diff, so nothing an extension injects
   * into it afterward can ever be flagged as a mismatch.
   */
  const mounted = useHasMounted();

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">
      {/* Subtle animated background element */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-600/20 via-cyan-500/20 to-teal-600/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
                <Compass className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                {siteConfig.name}
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              {siteConfig.tagline} Independent travel designers working across
              six continents since 2010.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubscribed(true);
              }}
              className="mt-6 max-w-sm"
            >
              <label htmlFor="newsletter" className="text-sm font-medium">
                Occasional dispatches
              </label>
              {subscribed ? (
                <p role="status" className="mt-2 text-sm text-cyan-300">
                  Thank you — you&apos;re on the list.
                </p>
              ) : mounted ? (
                <div className="mt-2 flex gap-2">
                  <input
                    id="newsletter"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-white/90"
                  >
                    Join
                  </button>
                </div>
              ) : (
                // Pre-mount placeholder: no <input>, so nothing here reads as
                // a form field to a password manager. Same dimensions as the
                // live version above to avoid layout shift on swap.
                <div className="mt-2 flex gap-2" aria-hidden>
                  <div className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/40">
                    you@example.com
                  </div>
                  <div className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-900">
                    Join
                  </div>
                </div>
              )}
            </form>
          </div>

          <nav aria-label="Footer">
            <p className="font-display text-sm font-semibold">Explore</p>
            <ul className="mt-4 space-y-2.5">
              {navSections.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-sm text-white/60 transition hover:text-white"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="font-display text-sm font-semibold">Get in touch</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              <li>
                <a href={`mailto:${siteConfig.email}`} className="transition hover:text-white">
                  {siteConfig.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${siteConfig.phone.replace(/[^+\d]/g, "")}`}
                  className="transition hover:text-white"
                >
                  {siteConfig.phone}
                </a>
              </li>
              <li className="whitespace-pre-line">{siteConfig.address}</li>
            </ul>

            <ul className="mt-5 flex gap-2">
              {socials.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <a
                    href="#"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/60 transition hover:border-cyan-400 hover:text-white"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/*
          Attribution is a licence condition for the CC BY / CC BY-SA photos
          used across the site, not decoration. Do not remove.
        */}
        <details className="mt-12 border-t border-white/10 pt-6">
          <summary className="cursor-pointer text-xs text-white/50 transition hover:text-white/80">
            Photography credits ({imageCredits.length} contributors)
          </summary>
          <p className="mt-3 text-[11px] leading-relaxed text-white/40">
            Imagery via Wikimedia Commons, used under the licences shown:{" "}
            {imageCredits.map((c, i) => (
              <span key={`${c.artist}-${c.license}`}>
                {c.artist} ({c.license})
                {i < imageCredits.length - 1 ? " · " : ""}
              </span>
            ))}
            .
          </p>
        </details>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          {/*
            The page is prerendered, so this year is baked at build time while
            the client computes it live — they diverge across a New Year
            boundary (and across timezones near midnight on 31 Dec).
          */}
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>A demonstration site — packages and reviews are illustrative.</p>
        </div>
      </div>
    </footer>
  );
}

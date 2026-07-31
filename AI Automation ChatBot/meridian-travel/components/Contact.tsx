"use client";

import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { destinations } from "@/lib/destinations";
import { siteConfig } from "@/lib/site";
import { SectionHeading } from "@/components/SectionHeading";

/**
 * Enquiry form — lead capture only, no payment. Submission is local: it will
 * post to the same n8n workflow that backs the chat assistant once that's
 * wired up. See lib/chat.ts for the integration point.
 */
export function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    // TODO: POST to the n8n enquiry webhook.
    console.log("Enquiry submitted:", data);
    setSent(true);
  };

  return (
    <section
      id="contact"
      className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 lg:px-8 lg:py-32"
    >
      <SectionHeading
        eyebrow="Contact"
        title="Tell us where you're thinking of going"
        description="A consultant replies within one business day — usually sooner."
      />

      <div className="mt-14 grid gap-10 lg:grid-cols-5 lg:gap-14">
        {/* Form */}
        <div className="lg:col-span-3">
          {sent ? (
            <div
              role="status"
              className="rounded-3xl border border-emerald-300/60 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-950/30"
            >
              <p className="font-display text-xl font-semibold text-emerald-900 dark:text-emerald-200">
                Thank you — that&apos;s with us.
              </p>
              <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
                One of our travel consultants will contact you shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-5 text-sm font-medium text-emerald-900 underline underline-offset-4 dark:text-emerald-200"
              >
                Send another enquiry
              </button>
            </div>
          ) : (
            /*
             * suppressHydrationWarning: password managers and autofill
             * extensions (1Password, LastPass, Dashlane, Bitwarden…) inject
             * their own <div> wrappers and icons next to inputs *before*
             * React hydrates, which React reports as a mismatch. The server
             * HTML here is deterministic — this silences a browser-side edit
             * we don't control, not a bug in our markup.
             */
            <form
              onSubmit={onSubmit}
              suppressHydrationWarning
              className="grid gap-5 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Full name" required>
                  <Input id="name" name="name" required autoComplete="name" placeholder="Your name" />
                </Field>
                <Field id="email" label="Email" required>
                  <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
                </Field>
                <Field id="phone" label="Phone">
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+1 555 000 0000" />
                </Field>
                <Field id="date" label="Preferred travel date">
                  <Input id="date" name="travelDate" type="date" />
                </Field>
              </div>

              <Field id="destination" label="Destination you're interested in">
                <select
                  id="destination"
                  name="destination"
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">Not sure yet</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}, {d.country}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="message" label="Anything else we should know?">
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder="Who's travelling, roughly when, and what you'd like the trip to feel like."
                />
              </Field>

              <button
                type="submit"
                className="mt-1 w-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-3.5 text-sm font-medium text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
              >
                Send enquiry
              </button>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Enquiry only — we never ask for payment details here.
              </p>
            </form>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4 lg:col-span-2">
          <InfoCard icon={MapPin} title="Studio">
            <span className="whitespace-pre-line">{siteConfig.address}</span>
          </InfoCard>
          <InfoCard icon={Mail} title="Email">
            <a href={`mailto:${siteConfig.email}`} className="hover:text-cyan-700 dark:hover:text-cyan-400">
              {siteConfig.email}
            </a>
          </InfoCard>
          <InfoCard icon={Phone} title="Phone">
            <a href={`tel:${siteConfig.phone.replace(/[^+\d]/g, "")}`} className="hover:text-cyan-700 dark:hover:text-cyan-400">
              {siteConfig.phone}
            </a>
          </InfoCard>
          <InfoCard icon={Clock} title="Working hours">
            {siteConfig.hours}
          </InfoCard>

          {/* Map placeholder — no live API wiring needed this pass. */}
          <div
            role="img"
            aria-label="Map placeholder showing the studio location in San Francisco"
            className="relative grid h-44 place-items-center overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-sky-950"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.25)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <span className="relative flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-900/90 dark:text-slate-200">
              <MapPin className="h-3.5 w-3.5 text-cyan-600" aria-hidden />
              Harbour Row, San Francisco
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    // Extensions inject their markup at this level, next to the input.
    <div className="grid gap-2" suppressHydrationWarning>
      <Label htmlFor={id} className="text-sm">
        {label}
        {required && <span className="text-cyan-600"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-teal-500/15 text-cyan-700 dark:text-cyan-400">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {children}
        </p>
      </div>
    </div>
  );
}

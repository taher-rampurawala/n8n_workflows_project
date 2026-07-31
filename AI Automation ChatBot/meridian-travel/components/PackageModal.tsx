"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openChat } from "@/lib/site";
import { images } from "@/lib/images";
import { formatINR } from "@/lib/format";
import type { TravelPackage } from "@/lib/packages";

/**
 * Premium detail panel. Opens in place — never navigates, and offers an
 * Enquiry action only. No booking, no payment anywhere in this flow.
 */
export function PackageModal({
  travelPackage: p,
  onOpenChange,
}: {
  travelPackage: TravelPackage | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={p !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {p && (
          <>
            <div
              className={`relative h-48 shrink-0 overflow-hidden bg-gradient-to-br ${p.gradient}`}
            >
              <Image
                src={images[p.image].src}
                alt={images[p.image].alt}
                fill
                sizes="(min-width: 640px) 42rem, 100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <p className="absolute bottom-3 right-4 text-[10px] text-white/70">
                Photo: {images[p.image].artist} · {images[p.image].license}
              </p>
            </div>

            <div className="p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="font-display text-2xl tracking-tight">
                  {p.name}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {p.summary}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {[
                  `${p.durationDays}D / ${p.durationNights}N`,
                  p.difficulty,
                  `${p.groupSizeMin}–${p.groupSizeMax} travellers`,
                  ...p.styles,
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <Block title="Itinerary">
                <ol className="space-y-3">
                  {p.itinerary.map((d) => (
                    <li key={d.day} className="flex gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-[11px] font-semibold text-white">
                        {d.day}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {d.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {d.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Block>

              <div className="grid gap-6 sm:grid-cols-2">
                <Block title="Accommodation">
                  <List items={p.accommodation} />
                </Block>
                <Block title="Activities">
                  <List items={p.activities} />
                </Block>
                <Block title="Meals">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {p.meals}
                  </p>
                </Block>
                <Block title="Not included">
                  <List items={p.exclusions} />
                </Block>
              </div>

              <Block title="Travel tips">
                <List items={p.travelTips} />
              </Block>

              <Block title={`Reviews (${p.reviewCount})`}>
                <ul className="space-y-3">
                  {p.reviews.map((r) => (
                    <li
                      key={r.author}
                      className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {r.author}
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {r.country}
                          </span>
                        </p>
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-3 w-3 fill-amber-400 text-amber-400"
                              aria-hidden
                            />
                          ))}
                          <span className="sr-only">{r.rating} out of 5</span>
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                        {r.text}
                      </p>
                    </li>
                  ))}
                </ul>
              </Block>

              <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl bg-slate-900 p-5 sm:flex-row dark:bg-white/10">
                <div className="text-center sm:text-left">
                  <p className="font-display text-2xl font-semibold text-white">
                    {formatINR(p.price)}
                    <span className="ml-1 text-sm font-normal text-white/60">
                      per person
                    </span>
                  </p>
                  <p className="text-xs text-white/60">
                    Enquiry only — nothing is charged here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    openChat();
                  }}
                  className="w-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-3 text-sm font-medium text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:w-auto"
                >
                  Enquire about this trip
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
        {title}
      </h4>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"
        >
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Star, Users } from "lucide-react";
import { packages, type TravelPackage } from "@/lib/packages";
import { images } from "@/lib/images";
import { formatINR } from "@/lib/format";
import { SectionHeading } from "@/components/SectionHeading";
import { PackageModal } from "@/components/PackageModal";

export function Packages() {
  const [selected, setSelected] = useState<TravelPackage | null>(null);

  return (
    <section
      id="packages"
      className="scroll-mt-24 bg-slate-50 py-24 lg:py-32 dark:bg-white/[0.02]"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Travel packages"
          title="Curated journeys, ready to tailor"
          description="Every itinerary below is a starting point. Tell us what to change and we'll rebuild it around you."
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            >
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5">
                <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${p.gradient}`}>
                  <Image
                    src={images[p.image].src}
                    alt={images[p.image].alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                  <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                    {p.rating} ({p.reviewCount})
                  </span>
                  <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-slate-800 backdrop-blur-sm">
                    {p.difficulty}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                    {p.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {p.summary}
                  </p>

                  <ul className="mt-4 space-y-1.5">
                    {p.highlights.slice(0, 3).map((h) => (
                      <li
                        key={h}
                        className="flex gap-2 text-xs text-slate-600 dark:text-slate-400"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {p.durationDays}D / {p.durationNights}N
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {p.groupSizeMin}–{p.groupSizeMax}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-200/70 pt-4 dark:border-white/10">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      from{" "}
                      <span className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                        {formatINR(p.price)}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </article>
            </motion.li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {packages.length} of our journeys shown. Ask the assistant if you have
          somewhere else in mind.
        </p>
      </div>

      <PackageModal
        travelPackage={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </section>
  );
}

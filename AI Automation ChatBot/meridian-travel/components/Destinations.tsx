"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { destinations } from "@/lib/destinations";
import { images } from "@/lib/images";
import { formatINR } from "@/lib/format";
import { SectionHeading } from "@/components/SectionHeading";

export function Destinations() {
  return (
    <section
      id="destinations"
      className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 lg:px-8 lg:py-32"
    >
      <SectionHeading
        eyebrow="Featured destinations"
        title="Places worth the journey"
        description="Ten regions our consultants know personally — not from a brochure."
      />

      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((d, i) => (
          <motion.li
            key={d.id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            className="group"
          >
            <article className="relative h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5">
              <div
                className={`relative h-52 overflow-hidden bg-gradient-to-br ${d.gradient}`}
              >
                <Image
                  src={images[d.image].src}
                  alt={images[d.image].alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Scrim keeps the white badges legible over bright photography. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
                <span className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-slate-800 backdrop-blur-sm">
                  {d.bestSeason}
                </span>
                <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                  {d.rating}
                </span>
              </div>

              <div className="p-5">
                <p className="text-xs uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  {d.country}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  {d.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {d.blurb}
                </p>
                <div className="mt-4 flex items-baseline justify-between border-t border-slate-200/70 pt-4 dark:border-white/10">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {d.durationDays} days
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    from{" "}
                    <span className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                      {formatINR(d.startingPrice)}
                    </span>
                  </p>
                </div>
              </div>
            </article>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

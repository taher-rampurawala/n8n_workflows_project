"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { testimonials } from "@/lib/testimonials";
import { SectionHeading } from "@/components/SectionHeading";

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => go(1), 6000);
    return () => clearInterval(id);
  }, [paused, go]);

  const t = testimonials[index];

  return (
    <section className="bg-slate-50 py-24 lg:py-32 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Testimonials"
          title="What travellers tell us afterwards"
        />

        <div
          className="relative mt-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="rounded-3xl border border-slate-200/70 bg-white p-8 shadow-sm sm:p-12 dark:border-white/10 dark:bg-white/5">
            <Quote
              className="h-8 w-8 text-cyan-500/30"
              aria-hidden
            />
            <div aria-live="polite" className="min-h-[13rem] sm:min-h-[11rem]">
              <AnimatePresence mode="wait">
                <motion.figure
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <blockquote className="mt-4 text-lg leading-relaxed text-slate-700 dark:text-slate-200">
                    {t.text}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br ${t.avatarGradient} text-sm font-semibold text-white`}
                      aria-hidden
                    >
                      {t.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {t.name}
                        <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                          {t.country}
                        </span>
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {t.trip}
                      </p>
                    </div>
                    <span className="ml-auto flex shrink-0 items-center gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                          aria-hidden
                        />
                      ))}
                      <span className="sr-only">{t.rating} out of 5</span>
                    </span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>

            <ul className="flex items-center gap-2">
              {testimonials.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    className={`h-2 rounded-full transition-all ${
                      i === index
                        ? "w-6 bg-gradient-to-r from-sky-500 to-teal-500"
                        : "w-2 bg-slate-300 hover:bg-slate-400 dark:bg-white/20"
                    }`}
                  />
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

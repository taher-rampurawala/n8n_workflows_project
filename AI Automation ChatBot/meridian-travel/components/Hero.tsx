"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, MapPin, Search, Sparkles } from "lucide-react";
import { openChat } from "@/lib/site";
import { heroSlides, images } from "@/lib/images";

const stats = [
  { value: "150+", label: "Destinations" },
  { value: "10,000+", label: "Travellers" },
  { value: "4.9", label: "Average rating" },
];

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  /*
   * Resolved open item: the brief left hero background as video-vs-slideshow.
   * This is the animated destination slideshow — a crossfading Ken Burns
   * sequence. It costs a fraction of a video's bandwidth, needs no poster
   * frame, and reuses imagery the page already ships.
   */
  const [slide, setSlide] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return; // Hold on a single frame instead of cycling.
    const id = setInterval(
      () => setSlide((s) => (s + 1) % heroSlides.length),
      6500,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section
      id="home"
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-950"
    >
      <div className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.div
              className="absolute inset-0"
              initial={reduceMotion ? undefined : { scale: 1.08 }}
              animate={reduceMotion ? undefined : { scale: 1 }}
              transition={{ duration: 8, ease: "linear" }}
            >
              <Image
                src={images[heroSlides[slide]].src}
                alt={images[heroSlides[slide]].alt}
                fill
                sizes="100vw"
                priority={slide === 0}
                className="object-cover"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Scrims — the headline must stay legible over every slide. */}
      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,146,60,0.15),transparent_55%)]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-28 text-center lg:px-8">
        <motion.p
          custom={0}
          variants={rise}
          initial="hidden"
          animate="show"
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs text-white/90 backdrop-blur-md"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Bespoke itineraries, planned by people who have been there
        </motion.p>

        <motion.h1
          custom={1}
          variants={rise}
          initial="hidden"
          animate="show"
          className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Discover extraordinary
          <span className="block bg-gradient-to-r from-sky-300 via-cyan-200 to-amber-200 bg-clip-text text-transparent">
            journeys around the world
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={rise}
          initial="hidden"
          animate="show"
          className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg"
        >
          Small-group and private travel across six continents — designed
          around how you actually want to spend your time away.
        </motion.p>

        {/* Visual-only inspiration bar. Intentionally non-functional per brief. */}
        <motion.div
          custom={3}
          variants={rise}
          initial="hidden"
          animate="show"
          aria-hidden
          className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md sm:flex-row sm:items-center sm:rounded-full"
        >
          <div className="flex flex-1 items-center gap-2 px-4 py-2.5 text-sm text-white/60">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>Where would you like to go?</span>
          </div>
          <div className="hidden h-6 w-px bg-white/20 sm:block" />
          <div className="flex-1 px-4 py-2.5 text-sm text-white/60">
            When — flexible
          </div>
          <span className="grid place-items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-3 text-sm font-medium text-white sm:px-5">
            <Search className="h-4 w-4" />
          </span>
        </motion.div>

        <motion.div
          custom={4}
          variants={rise}
          initial="hidden"
          animate="show"
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="#packages"
            className="w-full rounded-full bg-white px-7 py-3.5 text-sm font-medium text-slate-900 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-auto"
          >
            Explore packages
          </a>
          <button
            type="button"
            onClick={openChat}
            className="w-full rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-auto"
          >
            Plan My Trip
          </button>
        </motion.div>

        {/* Floating stat cards */}
        <motion.ul
          custom={5}
          variants={rise}
          initial="hidden"
          animate="show"
          className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-3"
        >
          {stats.map((s) => (
            <li
              key={s.label}
              className="rounded-2xl border border-white/15 bg-white/10 px-3 py-4 backdrop-blur-md"
            >
              <p className="font-display text-xl font-semibold text-white sm:text-2xl">
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] text-white/60 sm:text-xs">
                {s.label}
              </p>
            </li>
          ))}
        </motion.ul>
      </div>

      {/* Slide selector — doubles as the progress indicator. */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4">
        <ul className="flex items-center gap-2">
          {heroSlides.map((key, i) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Show ${images[key].alt}`}
                aria-current={i === slide ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === slide ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            </li>
          ))}
        </ul>
        <motion.a
          href="#destinations"
          aria-label="Scroll to destinations"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-white/60 transition hover:text-white"
        >
          <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
        </motion.a>
      </div>

      <p className="absolute bottom-3 right-4 z-10 text-[10px] text-white/40">
        Photo: {images[heroSlides[slide]].artist} ·{" "}
        {images[heroSlides[slide]].license}
      </p>
    </section>
  );
}

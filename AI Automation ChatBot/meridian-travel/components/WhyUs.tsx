"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Award,
  BadgeCheck,
  Globe2,
  Headphones,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const reasons = [
  { icon: Award, value: 15, suffix: "+", label: "Years experience", copy: "Planning travel since 2010, through every kind of disruption." },
  { icon: Users, value: 10000, suffix: "+", label: "Happy travellers", copy: "Most of our bookings now come from past guests." },
  { icon: Globe2, value: 150, suffix: "+", label: "Destinations", copy: "Six continents, and consultants who have been to each." },
  { icon: Headphones, value: 24, suffix: "×7", label: "Support", copy: "A real person on the line, in your timezone, mid-trip." },
  { icon: ShieldCheck, value: 100, suffix: "%", label: "Best price guarantee", copy: "Find the same itinerary cheaper and we'll match it." },
  { icon: BadgeCheck, value: 4.9, suffix: "/5", label: "Average rating", copy: "Across 2,400+ verified post-trip reviews." },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(0);
  const isDecimal = !Number.isInteger(value);

  useEffect(() => {
    if (!inView) return;
    // Reduced motion collapses the duration to zero rather than calling
    // setState synchronously — the first frame lands straight on the value.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      // Guard the zero-duration case: 0/0 would be NaN, not 1.
      const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {isDecimal ? display.toFixed(1) : Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}

export function WhyUs() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <SectionHeading
        eyebrow="Why travel with us"
        title="The difference is in the planning"
        description="Anyone can sell you a flight and a hotel. The value is in everything between them."
      />

      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map(({ icon: Icon, ...r }, i) => (
          <motion.li
            key={r.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-teal-500/15 text-cyan-700 dark:text-cyan-400">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              <Counter value={r.value} suffix={r.suffix} />
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              {r.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {r.copy}
            </p>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

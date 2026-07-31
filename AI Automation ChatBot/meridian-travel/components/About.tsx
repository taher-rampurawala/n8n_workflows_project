"use client";

import { motion } from "framer-motion";
import { Compass, Heart, Leaf, Target } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const timeline = [
  { year: "2010", title: "Two desks and a map", copy: "Founded by two former expedition guides who were tired of selling other people's itineraries." },
  { year: "2014", title: "First private departures", copy: "Guests started asking for their own dates. We stopped running fixed groups only." },
  { year: "2019", title: "Consultants on the ground", copy: "Local specialists in twelve regions, so advice comes from someone who lives there." },
  { year: "2023", title: "Carbon-costed trips", copy: "Every itinerary now shows its footprint, and we fund removal for all of it." },
  { year: "Today", title: "150+ destinations", copy: "Still independent, still answering the phone ourselves." },
];

const values = [
  { icon: Target, title: "Precision", copy: "The right hotel on the right night matters more than the longest list of inclusions." },
  { icon: Heart, title: "Honesty", copy: "If a destination is wrong for your dates, we'll tell you and suggest another." },
  { icon: Leaf, title: "Lighter footprints", copy: "Smaller groups, local operators, and carbon we actually account for." },
  { icon: Compass, title: "Independence", copy: "No supplier owns us, so no supplier decides where we send you." },
];

export function About() {
  return (
    <section
      id="about"
      className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 lg:px-8 lg:py-32"
    >
      <SectionHeading
        eyebrow="About us"
        title="Fifteen years of getting people to the right place"
        description="Meridian & Co. exists because the best trips are designed, not assembled from a dropdown."
      />

      <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Timeline */}
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            How we got here
          </h3>
          <ol className="mt-6 space-y-6 border-l border-slate-200 pl-6 dark:border-white/10">
            {timeline.map((item, i) => (
              <motion.li
                key={item.year}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="relative"
              >
                <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 ring-4 ring-white dark:ring-slate-950" />
                <p className="font-display text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                  {item.year}
                </p>
                <p className="mt-0.5 font-medium text-slate-900 dark:text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.copy}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Mission + values */}
        <div>
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-teal-950 p-8">
            <h3 className="font-display text-lg font-semibold text-white">
              Our mission
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              To design travel that people remember in detail years later — by
              knowing the places properly, planning honestly, and staying
              reachable from the first enquiry to the flight home.
            </p>
            <h3 className="mt-6 font-display text-lg font-semibold text-white">
              Our vision
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              A travel company small enough to care about one itinerary and
              capable enough to run it anywhere on earth.
            </p>
          </div>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {values.map(({ icon: Icon, ...v }, i) => (
              <motion.li
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-white/5"
              >
                <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden />
                <p className="mt-3 font-medium text-slate-900 dark:text-white">
                  {v.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {v.copy}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/faqs";
import { openChat } from "@/lib/site";
import { SectionHeading } from "@/components/SectionHeading";

/**
 * Renders lib/faqs.ts directly — the same array the n8n agent should be given
 * as its knowledge source, so the page and the assistant never drift apart.
 */
export function FAQ() {
  return (
    <section
      id="faq"
      className="bg-slate-50 py-24 lg:py-32 dark:bg-white/[0.02]"
    >
      <div className="mx-auto max-w-3xl scroll-mt-24 px-5 lg:px-8">
        <SectionHeading
          eyebrow="FAQs"
          title="The questions we're asked most"
          description="If yours isn't here, the assistant can answer it — or a consultant will."
        />

        <Accordion type="single" collapsible className="mt-12 w-full">
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border-b border-slate-200 dark:border-white/10"
            >
              <AccordionTrigger className="py-5 text-left font-display text-base font-medium tracking-tight hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 rounded-3xl border border-slate-200/70 bg-white p-6 text-center dark:border-white/10 dark:bg-white/5">
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Still deciding?
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Ask the travel assistant anything about destinations, timing, or
            what a trip actually includes.
          </p>
          <button
            type="button"
            onClick={openChat}
            className="mt-5 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-3 text-sm font-medium text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Ask the assistant
          </button>
        </div>
      </div>
    </section>
  );
}

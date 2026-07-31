import { SmoothScroll } from "@/components/SmoothScroll";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Destinations } from "@/components/Destinations";
import { Packages } from "@/components/Packages";
import { WhyUs } from "@/components/WhyUs";
import { Testimonials } from "@/components/Testimonials";
import { About } from "@/components/About";
import { FAQ } from "@/components/FAQ";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";

/**
 * Single page. Every section is reachable by smooth-scroll from the sticky
 * nav — no additional routes (see ./CLAUDE.md and ../CLAUDE.md).
 */
export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      <main className="flex-1">
        <Hero />
        <Destinations />
        <Packages />
        <WhyUs />
        <Testimonials />
        <About />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}

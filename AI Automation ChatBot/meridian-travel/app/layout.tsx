import type { Metadata } from "next";
import { Sora, Manrope } from "next/font/google";
import "./globals.css";

// Display / headings — cinematic, used at hero scale.
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Body / UI — highly legible at small sizes.
const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meridian-and-co.example.com"),
  title: {
    default: "Meridian & Co. — Extraordinary Journeys, Thoughtfully Designed",
    template: "%s | Meridian & Co.",
  },
  description:
    "Curated luxury travel experiences across 150+ destinations. Discover handcrafted journeys, speak to our travel assistant, and plan a trip made entirely around you.",
  keywords: [
    "luxury travel",
    "bespoke holidays",
    "curated travel packages",
    "honeymoon travel",
    "adventure travel",
  ],
  openGraph: {
    type: "website",
    siteName: "Meridian & Co.",
    title: "Meridian & Co. — Extraordinary Journeys, Thoughtfully Designed",
    description:
      "Curated luxury travel experiences across 150+ destinations. Plan a journey made entirely around you.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian & Co. — Extraordinary Journeys, Thoughtfully Designed",
    description:
      "Curated luxury travel experiences across 150+ destinations.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}

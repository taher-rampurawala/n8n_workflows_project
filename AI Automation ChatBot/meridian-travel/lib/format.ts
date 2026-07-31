/**
 * Currency formatting.
 *
 * All prices in this project are stored and displayed in INR. Figures were
 * converted from the original USD brief at 1 USD = ₹95.694305 (live rate,
 * 31 Jul 2026) and rounded to the nearest ₹1,000 — travel packages are
 * marketed at round numbers, not exact conversions.
 *
 * The locale is pinned to "en-IN" rather than left to the browser. That gives
 * Indian digit grouping (₹3,06,000 — lakh/crore, not thousands) and, just as
 * importantly, makes the output identical on server and client so it can't
 * cause a hydration mismatch.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹3,06,000 */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** Compact form for tight spaces: ₹3.06L / ₹1.2Cr */
export function formatINRShort(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)}L`;
  return inr.format(amount);
}

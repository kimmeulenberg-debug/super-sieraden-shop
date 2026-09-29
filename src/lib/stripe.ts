"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Client-only Stripe loader.
 *
 * Alleen de publishable key komt hier terecht (veilig voor de browserbundel).
 * De secret key leeft uitsluitend server-side, zie src/lib/stripe-server.ts.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

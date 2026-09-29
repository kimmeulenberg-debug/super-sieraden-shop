import Stripe from "stripe";

/**
 * Server-only Stripe client.
 *
 * Server-only: dit bestand mag alleen worden geimporteerd in Route Handlers
 * of Server Components, nooit in Client Components. Zo blijft de secret key
 * buiten de client bundle (vergelijkbaar met de scheiding in src/lib/shopify.ts).
 *
 * Status: werkt alleen zodra STRIPE_SECRET_KEY in .env.local staat. Zonder
 * geldige key geeft getStripeServer() `null` terug, zodat de aanroepende
 * route een nette foutmelding kan tonen in plaats van te crashen.
 */
let stripeClient: Stripe | null = null;

export function getStripeServer(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

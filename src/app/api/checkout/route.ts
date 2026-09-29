import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe-server";
import { getMollieClient, createMolliePayment } from "@/lib/mollie";
import { computeOrderTotals, type CartItemInput } from "@/lib/checkout";

interface CheckoutRequestBody {
  items: CartItemInput[];
  shippingOption: string;
  paymentProvider?: "stripe" | "mollie";
  molliePaymentMethod?: "ideal" | "wero";
}

export async function POST(request: Request) {
  let body: CheckoutRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const paymentProvider = body.paymentProvider || "stripe";

  if (items.length === 0) {
    return NextResponse.json({ error: "Winkelmandje is leeg." }, { status: 400 });
  }

  const isValidItems = items.every(
    (item) =>
      typeof item.id === "string" &&
      typeof item.price === "number" &&
      item.price > 0 &&
      typeof item.quantity === "number" &&
      item.quantity > 0
  );

  if (!isValidItems) {
    return NextResponse.json({ error: "Ongeldige winkelmandje-items." }, { status: 400 });
  }

  const { total } = computeOrderTotals(items, body.shippingOption);
  const amountInCents = Math.round(total * 100);

  // STRIPE PAYMENT
  if (paymentProvider === "stripe") {
    const stripe = getStripeServer();

    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Betalen is momenteel niet beschikbaar: STRIPE_SECRET_KEY ontbreekt in de serverconfiguratie.",
        },
        { status: 503 }
      );
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        total,
      });
    } catch (error) {
      console.error("[api/checkout] Kon Stripe PaymentIntent niet aanmaken:", error);
      return NextResponse.json(
        { error: "Er ging iets mis bij het voorbereiden van de betaling." },
        { status: 500 }
      );
    }
  }

  // MOLLIE PAYMENT
  if (paymentProvider === "mollie") {
    const mollieClient = getMollieClient();

    if (!mollieClient) {
      return NextResponse.json(
        {
          error:
            "Mollie betaling is niet beschikbaar: MOLLIE_API_KEY ontbreekt in de serverconfiguratie.",
        },
        { status: 503 }
      );
    }

    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      const payment = await createMolliePayment({
        amount: amountInCents,
        description: `Bestelling via Super Sieraden Shop (${items.length} item${items.length > 1 ? "s" : ""})`,
        redirectUrl: `${baseUrl}/checkout?redirect_status=succeeded`,
        webhookUrl: `${baseUrl}/api/webhooks/mollie`,
        orderId: `temp-${Date.now()}`,
        customerEmail: "temp@example.com",
        customerName: "Customer",
        method: body.molliePaymentMethod || "ideal",
      });

      return NextResponse.json({
        molliePaymentId: payment.id,
        mollieCheckoutUrl: payment._links?.checkout?.href,
        total,
      });
    } catch (error) {
      console.error("[api/checkout] Kon Mollie betaling niet aanmaken:", error);
      return NextResponse.json(
        { error: "Er ging iets mis bij het voorbereiden van de Mollie betaling." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Onbekende betaalprovider." },
    { status: 400 }
  );
}

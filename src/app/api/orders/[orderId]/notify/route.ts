import { NextResponse } from "next/server";
import { getOrderById, OrderServiceError } from "@/lib/orders";
import { sendTikkieOwnerNotification } from "@/lib/tikkie-email";
import { sendOrderShippedEmail } from "@/lib/shipped-email";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Stuurt een mail opnieuw: standaard de "nieuwe Tikkie-bestelling"-melding naar de
 * eigenaar; met {"type":"shipped"} de verzendmail naar de klant.
 * Alleen na inloggen in /admin (zie src/proxy.ts).
 */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const body = (await request.json().catch(() => ({}))) as { type?: string };
  const type = body.type === "shipped" ? "shipped" : "owner";

  try {
    const result = await getOrderById(orderId);
    if (!result) {
      return NextResponse.json({ error: "Bestelling niet gevonden." }, { status: 404 });
    }

    if (type === "shipped" && result.order.status !== "shipped") {
      return NextResponse.json({ error: "Deze bestelling heeft nog niet de status verzonden." }, { status: 409 });
    }
    if (type === "owner" && result.order.payment_provider !== "tikkie") {
      return NextResponse.json({ error: "Alleen voor Tikkie-bestellingen." }, { status: 409 });
    }

    const sent =
      type === "shipped"
        ? await sendOrderShippedEmail({ order: result.order, items: result.items })
        : await sendTikkieOwnerNotification({
            order: result.order,
            items: result.items,
            siteUrl: getSiteUrl(request),
          });
    if (!sent) {
      return NextResponse.json(
        { error: "De mail kon niet worden verzonden. Is RESEND_API_KEY ingesteld in Vercel en is er opnieuw gedeployed?" },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/orders/:orderId/notify] Onverwachte fout:", error);
    return NextResponse.json({ error: "Melding versturen is mislukt." }, { status: 500 });
  }
}

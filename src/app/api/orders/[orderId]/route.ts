import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrderById,
  updateOrderStatus,
  markTikkieOrderPaid,
  stripOrderSecrets,
  OrderServiceError,
  ORDER_STATUSES,
} from "@/lib/orders";
import { sendTikkiePaidEmail } from "@/lib/tikkie-email";
import { sendOrderShippedEmail } from "@/lib/shipped-email";

/**
 * GET/PATCH voor een enkele order. Routes zijn thin: valideren, delegeren
 * naar src/lib/orders.ts, resultaat teruggeven.
 *
 * Let op: momenteel geen authenticatie/autorisatie. PATCH kan de status van
 * elke order wijzigen zonder in te loggen. Voeg vóór productiegebruik RBAC
 * toe op deze specifieke route (bv. alleen voor de rol "admin").
 */

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { orderId } = await params;

  try {
    const result = await getOrderById(orderId);

    if (!result) {
      return NextResponse.json({ error: "Bestelling niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ ...result, order: stripOrderSecrets(result.order) });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/orders/:orderId] Onverwachte fout bij ophalen order:", error);
    return NextResponse.json({ error: "Order kon niet worden opgehaald." }, { status: 500 });
  }
}

const updateStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional(),
    // Alleen "paid" en alleen voor Tikkie-orders; Stripe/Mollie gaan via hun webhooks.
    paymentStatus: z.literal("paid").optional(),
  })
  .refine((value) => value.status !== undefined || value.paymentStatus !== undefined, {
    message: "Geef een status of paymentStatus op.",
  });

export async function PATCH(request: Request, { params }: RouteParams) {
  const { orderId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ongeldige status.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    let updatedOrder = null;
    let shippedEmailSent: boolean | undefined;

    if (parsed.data.paymentStatus === "paid") {
      const existing = await getOrderById(orderId);
      const wasAlreadyPaid = existing?.order.payment_status === "paid";
      updatedOrder = await markTikkieOrderPaid(orderId);
      if (updatedOrder && !wasAlreadyPaid) {
        await sendTikkiePaidEmail({ order: updatedOrder }).catch((emailError) =>
          console.error("[api/orders/:orderId] Betaling-ontvangen-mail mislukt:", emailError)
        );
      }
    }

    if (parsed.data.status) {
      const before = parsed.data.status === "shipped" ? await getOrderById(orderId) : null;
      updatedOrder = await updateOrderStatus(orderId, parsed.data.status as typeof ORDER_STATUSES[number]);

      // Alleen mailen bij de overgang naar "verzonden", niet bij herhaald opslaan.
      if (updatedOrder && before && before.order.status !== "shipped") {
        shippedEmailSent = await sendOrderShippedEmail({ order: updatedOrder, items: before.items });
      }
    }

    if (!updatedOrder) {
      return NextResponse.json({ error: "Bestelling niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ success: true, updatedOrder: stripOrderSecrets(updatedOrder), shippedEmailSent });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/orders/:orderId] Onverwachte fout bij bijwerken status:", error);
    return NextResponse.json({ error: "Status kon niet worden bijgewerkt." }, { status: 500 });
  }
}

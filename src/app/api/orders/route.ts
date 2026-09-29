import { NextResponse } from "next/server";
import { billingSchema, type CartItemInput } from "@/lib/checkout";
import { createOrder, getOrders, OrderServiceError, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

/**
 * Route is thin: valideert de aanvraag, delegeert naar src/lib/orders.ts en
 * geeft het resultaat terug. Geen business logic hier.
 */
interface CreateOrderRequestBody {
  items: CartItemInput[];
  billing: unknown;
  paymentIntentId?: string;
  molliePaymentId?: string;
  paymentProvider?: "stripe" | "mollie";
}

export async function POST(request: Request) {
  let body: CreateOrderRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "Winkelmandje is leeg." }, { status: 400 });
  }

  const billingResult = billingSchema.safeParse(body.billing);

  if (!billingResult.success) {
    return NextResponse.json(
      { error: "Ongeldige facturatiegegevens.", issues: billingResult.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { order, items: orderItems } = await createOrder({
      items,
      billing: billingResult.data,
      paymentIntentId: body.paymentIntentId,
      molliePaymentId: body.molliePaymentId,
      paymentProvider: body.paymentProvider,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      order,
      items: orderItems,
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/orders] Onverwachte fout bij aanmaken order:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het opslaan van de bestelling." }, { status: 500 });
  }
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Let op: deze route heeft momenteel geen authenticatie/autorisatie (RBAC).
 * Zolang /admin niet met een wachtwoord of login is beveiligd, is deze lijst
 * met klantgegevens publiek bereikbaar. Voeg vóór productiegebruik RBAC toe
 * op deze specifieke route (niet op routerniveau).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const statusParam = searchParams.get("status");
  const status =
    statusParam && ORDER_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;

  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  const page = Math.max(Number.parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE, 1),
    100
  );

  try {
    const result = await getOrders({ status, dateFrom, dateTo, page, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/orders] Onverwachte fout bij ophalen orders:", error);
    return NextResponse.json({ error: "Orders konden niet worden opgehaald." }, { status: 500 });
  }
}

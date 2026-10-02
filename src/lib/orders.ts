import { getSupabaseAdmin } from "@/lib/db";
import { getStripeServer } from "@/lib/stripe-server";
import { resolveCartItems, ProductServiceError, type CartLineInput } from "@/lib/products-db";
import { randomBytes } from "node:crypto";
import {
  computeOrderTotals,
  TIKKIE_MAX_TOTAL,
  isPaymentProviderEnabled,
  type BillingFormValues,
} from "@/lib/checkout";

/**
 * Order Management: gedeelde types en databasefuncties.
 *
 * Bevat alle Supabase-toegang voor orders/order_items. Route Handlers roepen
 * uitsluitend deze functies aan (thin routes, geen business logic in de routes
 * zelf). Bedragen worden altijd server-side herberekend via computeOrderTotals
 * zodat een gemanipuleerd totaalbedrag vanaf de client nooit wordt vertrouwd.
 */

export type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentProvider = "stripe" | "mollie" | "tikkie";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "shipped", "delivered", "cancelled"];

export interface OrderRecord {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_postcode: string | null;
  customer_country: string;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  shipping_method: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  stripe_payment_id: string | null;
  mollie_payment_id: string | null;
  payment_provider: PaymentProvider;
  tikkie_confirm_token: string | null;
  tikkie_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  created_at: string;
}

/** Orderrecord zonder geheime velden; gebruik dit voor alles wat naar de browser gaat. */
export type PublicOrderRecord = Omit<OrderRecord, "tikkie_confirm_token">;

export function stripOrderSecrets(order: OrderRecord): PublicOrderRecord {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tikkie_confirm_token, ...publicOrder } = order;
  return publicOrder;
}

export class OrderServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "OrderServiceError";
  }
}

/**
 * Controleert bij Stripe zelf dat deze betaling echt is gelukt en precies het
 * orderbedrag betreft. Zonder deze controle kan iedereen met een verzonnen
 * paymentIntentId een order als "betaald" laten opslaan.
 */
async function assertStripePaymentSucceeded(paymentIntentId: string, totalEuro: number): Promise<void> {
  const stripe = getStripeServer();
  if (!stripe) {
    throw new OrderServiceError("Betaling controleren is niet beschikbaar: STRIPE_SECRET_KEY ontbreekt.", 503);
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error("[lib/orders] Kon Stripe PaymentIntent niet ophalen:", error);
    throw new OrderServiceError("De betaling kon niet worden geverifieerd.", 400);
  }

  if (paymentIntent.status !== "succeeded") {
    throw new OrderServiceError("De betaling is niet voltooid.", 402);
  }
  if (paymentIntent.currency !== "eur" || paymentIntent.amount !== Math.round(totalEuro * 100)) {
    console.error(
      `[lib/orders] Bedrag komt niet overeen: betaald ${paymentIntent.amount} ${paymentIntent.currency}, order ${Math.round(totalEuro * 100)} eur (${paymentIntentId})`
    );
    throw new OrderServiceError("Het betaalde bedrag komt niet overeen met de bestelling.", 400);
  }
}

export interface CreateOrderInput {
  // Alleen id en aantal worden gebruikt; naam en prijs komen uit de database.
  items: CartLineInput[];
  billing: BillingFormValues;
  paymentIntentId?: string;
  molliePaymentId?: string;
  paymentProvider?: PaymentProvider;
}

export interface CreateOrderResult {
  order: OrderRecord;
  items: OrderItemRecord[];
}

/**
 * Create een order + bijbehorende order_items in Supabase.
 *
 * Gooit OrderServiceError met een passende HTTP-status bij validatie- of
 * databasefouten, zodat de aanroepende route deze rechtstreeks kan vertalen
 * naar een response.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new OrderServiceError(
      "Bestellingen opslaan is niet beschikbaar: Supabase is niet geconfigureerd.",
      503
    );
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new OrderServiceError("Ongeldige winkelmandje-items.", 400);
  }

  let trustedItems;
  try {
    trustedItems = await resolveCartItems(input.items);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      throw new OrderServiceError(error.message, error.status);
    }
    throw error;
  }

  const { billing } = input;
  const { subtotal, tax, shipping, total } = computeOrderTotals(trustedItems, billing.shippingOption);
  const orderNumber = `ORD-${Date.now()}`;
  const paymentProvider = input.paymentProvider ?? "stripe";

  if (!isPaymentProviderEnabled(paymentProvider)) {
    throw new OrderServiceError("Deze betaalmethode is momenteel niet beschikbaar.", 400);
  }

  if (paymentProvider === "tikkie" && total > TIKKIE_MAX_TOTAL) {
    throw new OrderServiceError(
      `Betalen met Tikkie is mogelijk tot € ${TIKKIE_MAX_TOTAL}. Kies een andere betaalmethode.`,
      400
    );
  }
  const tikkieConfirmToken = paymentProvider === "tikkie" ? randomBytes(24).toString("hex") : null;

  // Betaal-ID's worden alleen gebruikt voor de provider waar ze bij horen; een
  // meegestuurd ID bij Tikkie mag een order nooit als "betaald" markeren.
  let paymentStatus: PaymentStatus = "pending";
  let stripePaymentId: string | null = null;
  let molliePaymentId: string | null = null;

  if (paymentProvider === "stripe") {
    if (!input.paymentIntentId) {
      throw new OrderServiceError("Betaling ontbreekt voor deze bestelling.", 400);
    }

    // Idempotent: dezelfde betaling (bv. pagina opnieuw geladen) levert dezelfde order op.
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_payment_id", input.paymentIntentId)
      .maybeSingle<{ id: string }>();
    if (existing) {
      const found = await getOrderById(existing.id);
      if (found) return found;
    }

    await assertStripePaymentSucceeded(input.paymentIntentId, total);
    paymentStatus = "paid";
    stripePaymentId = input.paymentIntentId;
  } else if (paymentProvider === "mollie") {
    molliePaymentId = input.molliePaymentId ?? null;
    paymentStatus = molliePaymentId ? "paid" : "pending";
  }

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_email: billing.email,
      customer_name: `${billing.firstName} ${billing.lastName}`.trim(),
      customer_phone: billing.phone,
      customer_address: billing.address,
      customer_city: billing.city,
      customer_postcode: billing.postalCode,
      customer_country: billing.country,
      subtotal,
      tax,
      shipping_cost: shipping,
      total,
      shipping_method: billing.shippingOption,
      status: "pending",
      payment_status: paymentStatus,
      stripe_payment_id: stripePaymentId,
      mollie_payment_id: molliePaymentId,
      payment_provider: paymentProvider,
      ...(tikkieConfirmToken ? { tikkie_confirm_token: tikkieConfirmToken } : {}),
    })
    .select()
    .single<OrderRecord>();

  if (orderError || !orderRow) {
    console.error("[lib/orders] Kon order niet aanmaken:", orderError);
    throw new OrderServiceError("De bestelling kon niet worden opgeslagen.", 500);
  }

  const itemsPayload = trustedItems.map((item) => ({
    order_id: orderRow.id,
    product_id: item.id,
    product_name: item.name,
    product_price: item.price,
    quantity: item.quantity,
    total: item.price * item.quantity,
  }));

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsPayload)
    .select<"*", OrderItemRecord>();

  if (itemsError || !itemRows) {
    console.error("[lib/orders] Kon order_items niet aanmaken, order wordt teruggedraaid:", itemsError);
    // Compensating action: supabase-js ondersteunt geen multi-table transacties
    // vanaf de client, dus de zojuist aangemaakte order wordt hier expliciet
    // opgeruimd om een "lege" order zonder items te voorkomen.
    await supabase.from("orders").delete().eq("id", orderRow.id);
    throw new OrderServiceError("De bestelling kon niet volledig worden opgeslagen.", 500);
  }

  return { order: orderRow, items: itemRows };
}

export interface OrderListFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface OrderListResult {
  orders: OrderRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Haal een gepagineerde, filterbare lijst van orders op, gesorteerd op
 * aanmaakdatum (nieuwste eerst).
 */
export async function getOrders(filters: OrderListFilters): Promise<OrderListResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new OrderServiceError("Orders ophalen is niet beschikbaar: Supabase is niet geconfigureerd.", 503);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error, count } = await query.returns<OrderRecord[]>();

  if (error) {
    console.error("[lib/orders] Kon orders niet ophalen:", error);
    throw new OrderServiceError("Orders konden niet worden opgehaald.", 500);
  }

  return { orders: data ?? [], total: count ?? 0, page: filters.page, pageSize: filters.pageSize };
}

/**
 * Haal een enkele order op met bijbehorende order_items.
 * Retourneert `null` als de order niet bestaat (geen exception).
 */
export async function getOrderById(
  orderId: string
): Promise<{ order: OrderRecord; items: OrderItemRecord[] } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new OrderServiceError("Order ophalen is niet beschikbaar: Supabase is niet geconfigureerd.", 503);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRecord>();

  if (orderError) {
    console.error("[lib/orders] Kon order niet ophalen:", orderError);
    throw new OrderServiceError("Order kon niet worden opgehaald.", 500);
  }

  if (!order) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .returns<OrderItemRecord[]>();

  if (itemsError) {
    console.error("[lib/orders] Kon order_items niet ophalen:", itemsError);
    throw new OrderServiceError("Orderregels konden niet worden opgehaald.", 500);
  }

  return { order, items: items ?? [] };
}

/**
 * Werk de status van een order bij (pending, shipped, delivered, cancelled).
 * Retourneert `null` als de order niet bestaat.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<OrderRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new OrderServiceError("Status bijwerken is niet beschikbaar: Supabase is niet geconfigureerd.", 503);
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .maybeSingle<OrderRecord>();

  if (error) {
    console.error("[lib/orders] Kon orderstatus niet bijwerken:", error);
    throw new OrderServiceError("Orderstatus kon niet worden bijgewerkt.", 500);
  }

  return data;
}

/**
 * Klant meldt via de link in de mail dat de Tikkie is betaald. Dit zet alleen
 * een tijdstempel; payment_status blijft 'pending' tot de eigenaar de betaling
 * heeft gecontroleerd. Retourneert `null` bij een onbekende token.
 */
export async function confirmTikkieByToken(
  token: string
): Promise<{ order: OrderRecord; alreadyConfirmed: boolean } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new OrderServiceError("Bevestigen is niet beschikbaar: Supabase is niet geconfigureerd.", 503);
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tikkie_confirm_token", token)
    .eq("payment_provider", "tikkie")
    .maybeSingle<OrderRecord>();

  if (error) {
    console.error("[lib/orders] Kon order niet ophalen via Tikkie-token:", error);
    throw new OrderServiceError("Bevestigen is mislukt.", 500);
  }
  if (!order) return null;

  if (order.tikkie_confirmed_at || order.payment_status === "paid") {
    return { order, alreadyConfirmed: true };
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ tikkie_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", order.id)
    .select()
    .single<OrderRecord>();

  if (updateError || !updated) {
    console.error("[lib/orders] Kon Tikkie-bevestiging niet opslaan:", updateError);
    throw new OrderServiceError("Bevestigen is mislukt.", 500);
  }

  return { order: updated, alreadyConfirmed: false };
}

/**
 * Markeer een Tikkie-order als betaald (alleen door de eigenaar via /admin).
 * Stripe- en Mollie-orders worden uitsluitend door hun webhooks bijgewerkt,
 * dus voor die providers wordt hier een 409 gegeven.
 */
export async function markTikkieOrderPaid(orderId: string): Promise<OrderRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new OrderServiceError("Betaalstatus bijwerken is niet beschikbaar: Supabase is niet geconfigureerd.", 503);
  }

  const { data: existing, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRecord>();

  if (fetchError) {
    console.error("[lib/orders] Kon order niet ophalen:", fetchError);
    throw new OrderServiceError("Order kon niet worden opgehaald.", 500);
  }
  if (!existing) return null;
  if (existing.payment_provider !== "tikkie") {
    throw new OrderServiceError("Alleen Tikkie-bestellingen kunnen handmatig als betaald worden gemarkeerd.", 409);
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single<OrderRecord>();

  if (error || !data) {
    console.error("[lib/orders] Kon betaalstatus niet bijwerken:", error);
    throw new OrderServiceError("Betaalstatus kon niet worden bijgewerkt.", 500);
  }
  return data;
}

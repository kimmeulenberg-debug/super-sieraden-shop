import { getSupabaseAdmin } from "@/lib/db";
import { computeOrderTotals, type BillingFormValues, type CartItemInput } from "@/lib/checkout";

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
export type PaymentProvider = "stripe" | "mollie";

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

export class OrderServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "OrderServiceError";
  }
}

function isValidCartItems(items: unknown): items is CartItemInput[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        item.price > 0 &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    )
  );
}

export interface CreateOrderInput {
  items: CartItemInput[];
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

  if (!isValidCartItems(input.items)) {
    throw new OrderServiceError("Ongeldige winkelmandje-items.", 400);
  }

  const { billing } = input;
  const { subtotal, tax, shipping, total } = computeOrderTotals(input.items, billing.shippingOption);
  const orderNumber = `ORD-${Date.now()}`;

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
      payment_status: input.paymentIntentId || input.molliePaymentId ? "paid" : "pending",
      stripe_payment_id: input.paymentIntentId ?? null,
      mollie_payment_id: input.molliePaymentId ?? null,
      payment_provider: input.paymentProvider ?? "stripe",
    })
    .select()
    .single<OrderRecord>();

  if (orderError || !orderRow) {
    console.error("[lib/orders] Kon order niet aanmaken:", orderError);
    throw new OrderServiceError("De bestelling kon niet worden opgeslagen.", 500);
  }

  const itemsPayload = input.items.map((item) => ({
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

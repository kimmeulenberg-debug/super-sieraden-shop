"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountShell from "@/components/account/AccountShell";
import { formatPrice } from "@/lib/checkout";
import type { OrderItemRecord, PublicOrderRecord } from "@/lib/orders";
import { useAccountStore } from "@/store/account";

interface LoadedOrder {
  id: string;
  order: PublicOrderRecord | null;
  items: OrderItemRecord[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "In behandeling",
  shipped: "Verzonden",
  delivered: "Bezorgd",
  cancelled: "Geannuleerd",
};

function paymentLabel(order: PublicOrderRecord): string {
  if (order.payment_status === "paid") return "Betaald";
  if (order.payment_status === "failed") return "Betaling mislukt";
  if (order.payment_status === "refunded") return "Terugbetaald";
  return order.payment_provider === "tikkie" ? "Wacht op betaling via Tikkie" : "Wacht op betaling";
}

export default function AccountOrdersPage() {
  const orderIds = useAccountStore((state) => state.orderIds);
  const [orders, setOrders] = useState<LoadedOrder[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const loaded = await Promise.all(
        orderIds.map(async (id): Promise<LoadedOrder> => {
          try {
            const response = await fetch(`/api/orders/${id}`);
            if (!response.ok) return { id, order: null, items: [] };
            const data = (await response.json()) as { order: PublicOrderRecord; items: OrderItemRecord[] };
            return { id, order: data.order, items: data.items };
          } catch {
            return { id, order: null, items: [] };
          }
        })
      );
      if (!cancelled) setOrders(loaded);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderIds]);

  return (
    <AccountShell title="Mijn bestellingen" description="De bestellingen die je op dit apparaat hebt geplaatst.">
      {orders === null ? (
        <p className="text-sm text-gray-600">Bestellingen worden geladen...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="mb-4 text-gray-700">Je hebt op dit apparaat nog geen bestellingen geplaatst.</p>
          <Link
            href="/"
            className="inline-block rounded bg-[#C9A961] px-6 py-3 font-medium text-white transition-colors hover:bg-[#B39450]"
          >
            Verder winkelen
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map(({ id, order, items }) => (
            <li key={id} className="rounded-lg border border-gray-200 p-5">
              {order ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="font-semibold text-[#C9A961]">{formatPrice(order.total)}</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-700">
                    {items.map((item) => `${item.product_name} × ${item.quantity}`).join(", ")}
                  </p>
                  <p className="mt-3 text-sm text-gray-600">
                    {STATUS_LABELS[order.status] ?? order.status} · {paymentLabel(order)}
                  </p>
                  <Link
                    href={`/order-confirmation/${id}`}
                    className="mt-3 inline-block text-sm font-medium text-[#C9A961] hover:text-[#B39450]"
                  >
                    Bekijk bestelling →
                  </Link>
                </>
              ) : (
                <p className="text-sm text-gray-600">Deze bestelling kon niet worden opgehaald.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}

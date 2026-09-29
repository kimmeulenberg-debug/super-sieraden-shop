"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { estimatedDeliveryDate, formatPrice } from "@/lib/checkout";
import type { OrderRecord, OrderItemRecord } from "@/lib/orders";

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="#2D2D2D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface OrderDetail {
  order: OrderRecord;
  items: OrderItemRecord[];
}

type LoadState = "loading" | "not-found" | "error" | "ready";

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [state, setState] = useState<LoadState>("loading");
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setState("loading");
      try {
        const response = await fetch(`/api/orders/${orderId}`);

        if (cancelled) return;

        if (response.status === 404) {
          setState("not-found");
          return;
        }

        if (!response.ok) {
          setState("error");
          return;
        }

        const data = (await response.json()) as OrderDetail;
        setDetail(data);
        setState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("[order-confirmation] Kon order niet ophalen:", error);
        setState("error");
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-[700px] px-6 py-16 text-center">
        <p className="text-sm text-ink-soft">Bestelling wordt geladen...</p>
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <div className="mx-auto max-w-[700px] px-6 py-16 text-center">
        <h1 className="text-2xl font-medium text-ink">Bestelling niet gevonden</h1>
        <p className="mt-2 text-sm text-ink-soft">
          We konden bestelling <span className="font-medium text-ink">{orderId}</span> niet
          terugvinden.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded bg-goud px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark"
        >
          Verder winkelen
        </Link>
      </div>
    );
  }

  if (state === "error" || !detail) {
    return (
      <div className="mx-auto max-w-[700px] px-6 py-16 text-center">
        <h1 className="text-2xl font-medium text-ink">Er ging iets mis</h1>
        <p className="mt-2 text-sm text-ink-soft">
          We konden je bestelling niet ophalen. Probeer de pagina te vernieuwen of neem contact
          met ons op.
        </p>
      </div>
    );
  }

  const { order, items } = detail;

  return (
    <div className="mx-auto max-w-[700px] px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mintgroen">
        <CheckIcon />
      </div>
      <h1 className="mt-6 text-[28px] font-medium leading-9 text-ink">
        Bedankt voor je bestelling!
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Bestelnummer: <span className="font-semibold text-ink">{order.order_number}</span>
      </p>

      <div className="mt-8 rounded border border-border-soft bg-card p-6 text-left">
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm text-ink">
              <span>
                {item.product_name} &times; {item.quantity}
              </span>
              <span className="font-medium text-goud">{formatPrice(item.total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-1 border-t border-border-soft pt-4 text-sm text-ink-soft">
          <div className="flex justify-between">
            <span>Subtotaal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>BTW (21%)</span>
            <span>{formatPrice(order.tax)}</span>
          </div>
          <div className="flex justify-between">
            <span>Verzending</span>
            <span>{order.shipping_cost === 0 ? "Gratis" : formatPrice(order.shipping_cost)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold text-ink">
            <span>Totaal</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        Status: <span className="font-medium text-ink">{order.status}</span>
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Verwachte levering:{" "}
        <span className="font-medium text-ink">{estimatedDeliveryDate(order.shipping_method)}</span>
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded bg-goud px-8 py-3.5 text-base font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark"
      >
        Verder winkelen
      </Link>
    </div>
  );
}

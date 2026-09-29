"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { getCartTotals, useCartStore } from "@/store/store";

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPrice(price: number) {
  return `€ ${price.toFixed(2).replace(".", ",")}`;
}

export default function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const items = useCartStore((state) => state.items);
  const closeCart = useCartStore((state) => state.closeCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCart();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  const { subtotal, tax, total } = getCartTotals(items);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={closeCart}
        className={clsx(
          "fixed inset-0 z-[1999] bg-black/40 transition-opacity duration-300 ease-out",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Winkelmandje"
        aria-hidden={!isOpen}
        className={clsx(
          "fixed right-0 top-0 z-[2000] flex h-full w-full max-w-[420px] flex-col bg-white shadow-[-2px_0_12px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
          <h2 className="text-lg font-medium text-ink">Je winkelmandje</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Sluiten"
            className="cursor-pointer text-ink transition-colors duration-150 ease-in-out hover:text-goud"
          >
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-ink-soft">Je winkelmandje is nog leeg.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto px-6 py-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-3 border-b border-border-soft py-4 last:border-b-0"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-card">
                  {item.image && item.image.trim() ? (
                    <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="line-clamp-2 text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-sm font-semibold text-goud">{formatPrice(item.price)}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Aantal verlagen voor ${item.name}`}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-border-soft text-ink transition-colors duration-150 ease-in-out hover:border-goud"
                    >
                      &minus;
                    </button>
                    <span className="w-5 text-center text-sm" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`Aantal verhogen voor ${item.name}`}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-border-soft text-ink transition-colors duration-150 ease-in-out hover:border-goud"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Verwijder ${item.name} uit winkelmandje`}
                      className="ml-auto cursor-pointer text-ink-soft transition-colors duration-150 ease-in-out hover:text-red-500"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border-soft px-6 py-4">
          <div className="flex justify-between text-sm text-ink-soft">
            <span>Subtotaal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-ink-soft">
            <span>BTW (21%)</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold text-ink">
            <span>Totaal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Link
            href="/checkout"
            onClick={closeCart}
            className={clsx(
              "mt-4 block w-full cursor-pointer rounded bg-goud py-3 text-center text-base font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark",
              items.length === 0 && "pointer-events-none opacity-50"
            )}
            aria-disabled={items.length === 0}
            tabIndex={items.length === 0 ? -1 : undefined}
          >
            Naar afrekenen
          </Link>
        </div>
      </aside>
    </>
  );
}

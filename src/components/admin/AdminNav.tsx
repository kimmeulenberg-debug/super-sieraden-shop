"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

/**
 * Navigatiebalk voor het admin-dashboard, met actieve-status highlighting.
 * Losstaand "use client"-component omdat usePathname() nodig is voor de
 * actieve link; de rest van de admin-layout kan zo een Server Component
 * blijven.
 */
const NAV_ITEMS = [
  { href: "/admin/orders", label: "Bestellingen" },
  { href: "/admin/products", label: "Producten" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6">
      <Link href="/admin/orders" className="text-base font-semibold text-ink">
        Super Sieraden Shop <span className="text-goud">Admin</span>
      </Link>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname?.startsWith(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "text-sm font-medium transition-colors duration-150 ease-in-out hover:text-goud",
              isActive ? "text-goud" : "text-ink-soft"
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <span
        aria-disabled="true"
        title="Nog niet beschikbaar"
        className="cursor-not-allowed text-sm font-medium text-ink-soft/50"
      >
        Instellingen
      </span>
    </div>
  );
}

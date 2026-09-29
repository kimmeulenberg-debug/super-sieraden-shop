"use client";

import Link from "next/link";
import { useCartStore, useWishlistStore } from "@/store/store";

const NAV_LINKS = [
  { label: "Oorbellen", href: "/oorbellen" },
  { label: "Ringen", href: "/ringen" },
  { label: "Kettingen", href: "/kettingen" },
  { label: "Armbandjes", href: "/armbandjes" },
  { label: "Aanbiedingen", href: "/aanbiedingen" },
];

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.35-9.5-8.5C.7 8.2 2.4 4.5 6 4.5c2 0 3.3 1 4 2.2.7-1.2 2-2.2 4-2.2 3.6 0 5.3 3.7 3.5 7-2.5 4.15-9.5 8.5-9.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const wishlistCount = useWishlistStore((state) => state.productIds.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const toggleCart = useCartStore((state) => state.toggleCart);

  return (
    <header className="sticky top-0 z-[100] flex h-[60px] items-center justify-between bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] animate-fade-in">
      <Link href="/" className="flex items-center" aria-label="Naar de homepage">
        <svg width="150" height="36" viewBox="0 0 150 36" role="img" aria-label="Super Sieraden Shop logo">
          <circle cx="14" cy="18" r="9" fill="#C9A961" />
          <text x="30" y="23" fontFamily="var(--font-jost), sans-serif" fontSize="16" fontWeight="600" fill="#2D2D2D">
            Super Sieraden Shop
          </text>
        </svg>
      </Link>

      <nav aria-label="Hoofdnavigatie" className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-base font-medium text-ink underline decoration-1 decoration-transparent underline-offset-4 transition-colors duration-200 ease-in-out hover:text-goud hover:decoration-goud"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4 text-ink">
        <button type="button" aria-label="Zoeken" className="cursor-pointer transition-[color,opacity] duration-150 hover:text-goud hover:opacity-80">
          <SearchIcon />
        </button>
        <Link href="/account" aria-label="Account" className="cursor-pointer transition-[color,opacity] duration-150 hover:text-goud hover:opacity-80 flex items-center justify-center">
          <AccountIcon />
        </Link>
        <Link
          href="/wishlist"
          aria-label={`Wishlist, ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
          className="relative cursor-pointer transition-[color,opacity] duration-150 hover:text-goud hover:opacity-80 flex items-center justify-center"
        >
          <HeartIcon />
          {wishlistCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium leading-none text-white">
              {wishlistCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleCart}
          aria-label={`Winkelmandje, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          className="relative cursor-pointer transition-[color,opacity] duration-150 hover:text-goud hover:opacity-80"
        >
          <BagIcon />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-goud text-[10px] font-medium leading-none text-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

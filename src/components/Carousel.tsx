"use client";

import { useRef } from "react";
import Link from "next/link";

const CATEGORIES = [
  "Nieuw in sieraden",
  "Cadeaus",
  "Bestsellers",
  "Oorbellen",
  "Kettingen",
  "Armbanden",
  "Ringen",
  "Enkelbandjes",
  "Bedels",
  "Horloges",
  "Kralen",
  "Hartjes",
  "Persoonlijke",
  "Gegraveerde",
  "Initial",
  "Vriendschap",
];

export default function Carousel() {
  const scrollerRef = useRef<HTMLUListElement>(null);

  function scrollBy(distance: number) {
    scrollerRef.current?.scrollBy({ left: distance, behavior: "smooth" });
  }

  return (
    <div className="flex h-[60px] items-center justify-between gap-4 bg-white px-6 py-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Vorige categorieen"
          onClick={() => scrollBy(-300)}
          className="shrink-0 cursor-pointer text-ink transition-[color,opacity] duration-150 ease-in-out hover:text-goud hover:opacity-80"
        >
          &lsaquo;
        </button>

        <ul
          ref={scrollerRef}
          className="flex min-w-0 list-none gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORIES.map((category, index) => (
            <li
              key={category}
              className="animate-fade-in shrink-0"
              style={{ "--stagger-delay": `${index * 50}ms` } as React.CSSProperties}
            >
              <Link
                href="/"
                className="whitespace-nowrap text-sm font-normal text-ink underline decoration-1 decoration-transparent underline-offset-4 transition-colors duration-150 ease-in-out hover:decoration-goud"
              >
                {category}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          aria-label="Volgende categorieen"
          onClick={() => scrollBy(300)}
          className="shrink-0 cursor-pointer text-ink transition-[color,opacity] duration-150 ease-in-out hover:text-goud hover:opacity-80"
        >
          &rsaquo;
        </button>
      </div>

      <button
        type="button"
        className="shrink-0 cursor-pointer rounded border border-border-soft bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 ease-in-out hover:border-goud"
      >
        Filters &amp; sorteren
      </button>
    </div>
  );
}

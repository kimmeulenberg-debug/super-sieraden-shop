"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Product } from "@/lib/products";
import { useWishlistStore } from "@/store/store";
import AddToCartButton from "./AddToCartButton";

interface ProductCardProps {
  product: Product;
  index: number;
}

function formatPrice(price: number) {
  return `€ ${price.toFixed(2).replace(".", ",")}`;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [justToggled, setJustToggled] = useState(false);
  const isWishlisted = useWishlistStore((state) =>
    state.productIds.includes(product.id)
  );
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);

  function handleCardClick() {
    router.push(`/sieraden/${product.handle}`);
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  }

  function handleWishlistClick(event: React.MouseEvent) {
    event.stopPropagation();
    toggleWishlist(product.id);
    setJustToggled(true);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="animate-card-in group relative cursor-pointer rounded border border-border-soft bg-card p-3 transition-shadow duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
      style={{ "--stagger-delay": `${index * 50}ms` } as React.CSSProperties}
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-card">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 25vw, 20vw"
          className={clsx(
            "object-cover transition-opacity duration-[400ms] ease-out",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
        />

        {product.giftLabel && (
          <span className="absolute left-2 top-2 rounded-sm bg-lavendel/90 px-2 py-1 text-xs font-medium text-ink">
            Perfect gift
          </span>
        )}

        <button
          type="button"
          onClick={handleWishlistClick}
          onAnimationEnd={() => setJustToggled(false)}
          aria-label={
            isWishlisted ? "Verwijder van wishlist" : "Toevoegen aan wishlist"
          }
          aria-pressed={isWishlisted}
          className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className={clsx(
              "transition-colors duration-300",
              justToggled && "animate-heart-bounce"
            )}
            fill={isWishlisted ? "#F5D9E8" : "none"}
            aria-hidden="true"
          >
            <path
              d="M12 20s-7-4.35-9.5-8.5C.7 8.2 2.4 4.5 6 4.5c2 0 3.3 1 4 2.2.7-1.2 2-2.2 4-2.2 3.6 0 5.3 3.7 3.5 7-2.5 4.15-9.5 8.5-9.5 8.5Z"
              stroke="#666666"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <p className="mt-2 line-clamp-2 text-sm font-medium text-ink">
        {product.name}
      </p>
      <p className="mt-1 text-sm font-semibold text-goud">
        {formatPrice(product.price)}
      </p>
      <AddToCartButton product={product} className="mt-2 w-full px-3 py-2 text-xs" />
    </div>
  );
}

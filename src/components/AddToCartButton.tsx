"use client";

import clsx from "clsx";
import type { Product } from "@/lib/products";
import { useCartStore, useToastStore } from "@/store/store";

interface AddToCartButtonProps {
  product: Product;
  className?: string;
  fullWidth?: boolean;
}

export default function AddToCartButton({
  product,
  className,
  fullWidth = false,
}: AddToCartButtonProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const showToast = useToastStore((state) => state.showToast);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    // Losstaan van de wishlist-knop: deze knop opent de kaart niet en
    // togglet geen wishlist, hij voegt enkel toe aan het winkelmandje.
    event.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    showToast("Toegevoegd aan winkelmandje", "success");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "cursor-pointer rounded bg-goud font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark",
        fullWidth ? "w-full" : "",
        className ?? "px-4 py-2 text-xs"
      )}
    >
      In winkelmandje
    </button>
  );
}

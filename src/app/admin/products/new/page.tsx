"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import type { ProductFormValues } from "@/lib/products-db";
import { useToastStore } from "@/store/store";

export default function NewProductPage() {
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(values: ProductFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Product kon niet worden aangemaakt.");
      }

      showToast("Product toegevoegd", "success");
      router.push("/admin/products");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product kon niet worden aangemaakt.";
      setServerError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/products" className="text-sm text-ink-soft underline hover:text-goud">
          &larr; Terug naar producten
        </Link>
        <h1 className="mt-2 text-2xl font-medium text-ink">Nieuw product</h1>
      </div>

      <div className="max-w-[720px] rounded border border-border-soft bg-white p-6">
        <ProductForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Voeg product toe"
          serverError={serverError}
        />
      </div>
    </div>
  );
}

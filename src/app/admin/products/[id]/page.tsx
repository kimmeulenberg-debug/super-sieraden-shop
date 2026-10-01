"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import type { ProductFormValues, ProductRecord } from "@/lib/products-db";
import { useToastStore } from "@/store/store";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/products/${id}`);
        const data = await response.json();

        if (cancelled) return;

        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          setLoadError(data.error ?? "Product kon niet worden opgehaald.");
          return;
        }

        setProduct(data.product as ProductRecord);
      } catch (error) {
        if (cancelled) return;
        console.error("[admin/products/:id] Kon product niet ophalen:", error);
        setLoadError("Product kon niet worden opgehaald.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(values: ProductFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Product kon niet worden bijgewerkt.");
      }

      showToast("Product bijgewerkt", "success");
      router.push("/admin/products");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product kon niet worden bijgewerkt.";
      setServerError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Weet je zeker dat je dit product wilt verwijderen? Het wordt gedeactiveerd en verdwijnt uit de shop."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Product kon niet worden verwijderd.");
      }

      showToast("Product verwijderd", "success");
      router.push("/admin/products");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product kon niet worden verwijderd.";
      showToast(message, "error");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-ink-soft">Product wordt geladen...</p>;
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">{loadError ?? "Product niet gevonden."}</p>
        <Link href="/admin/products" className="text-sm font-medium text-goud underline">
          &larr; Terug naar producten
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/products" className="text-sm text-ink-soft underline hover:text-goud">
          &larr; Terug naar producten
        </Link>
        <h1 className="mt-2 text-2xl font-medium text-ink">{product.name}</h1>
      </div>

      <div className="max-w-[720px] rounded border border-border-soft bg-white p-6">
        <ProductForm
          defaultValues={{
            name: product.name,
            description: product.description ?? "",
            price: product.price,
            category: (product.category as ProductFormValues["category"]) ?? "oorbellen",
            image_url: product.image_url ?? "",
            sku: product.sku ?? "",
            stock_quantity: product.stock_quantity,
            is_active: product.is_active,
          }}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Bijwerk product"
          serverError={serverError}
        />
      </div>

      <div className="max-w-[720px]">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 transition-colors duration-150 ease-in-out hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Bezig met verwijderen..." : "Verwijder product"}
        </button>
      </div>
    </div>
  );
}

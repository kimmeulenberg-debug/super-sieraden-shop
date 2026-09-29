"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/checkout";
import { PRODUCT_CATEGORIES, type ProductRecord } from "@/lib/products-db";
import { useToastStore } from "@/store/store";

const PAGE_SIZE = 20;
const PLACEHOLDER_IMAGE = "/products/placeholder.svg";

const CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Alle categorieën" },
  ...PRODUCT_CATEGORIES.map((category) => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1),
  })),
];

const ACTIVE_FILTER_OPTIONS: { value: "" | "true" | "false"; label: string }[] = [
  { value: "", label: "Alle statussen" },
  { value: "true", label: "Actief" },
  { value: "false", label: "Inactief" },
];

export default function AdminProductsPage() {
  const showToast = useToastStore((state) => state.showToast);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (category) params.set("category", category);
      if (activeFilter) params.set("active", activeFilter);
      if (search.trim()) params.set("search", search.trim());

      try {
        const response = await fetch(`/api/products?${params.toString()}`);
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "Producten konden niet worden opgehaald.");
          setProducts([]);
          setTotal(0);
          return;
        }

        setProducts(data.products as ProductRecord[]);
        setTotal(data.total as number);
      } catch (loadError) {
        if (cancelled) return;
        console.error("[admin/products] Kon producten niet ophalen:", loadError);
        setError("Producten konden niet worden opgehaald.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [page, category, activeFilter, search]);

  async function handleDelete(product: ProductRecord) {
    const confirmed = window.confirm(
      `Weet je zeker dat je "${product.name}" wilt verwijderen? Het product wordt gedeactiveerd.`
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Product kon niet worden verwijderd.");
      }

      showToast("Product verwijderd", "success");
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, is_active: false } : item))
      );
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Product kon niet worden verwijderd.";
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-ink">Producten</h1>
        <Link
          href="/admin/products/new"
          className="rounded bg-goud px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark"
        >
          + Nieuw product
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded border border-border-soft bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-xs font-medium text-ink-soft">
            Zoeken (naam)
          </label>
          <input
            id="search"
            type="text"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Zoek op productnaam..."
            className="rounded border border-border-soft px-3 py-2 text-sm text-ink outline-none focus:border-goud"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category-filter" className="text-xs font-medium text-ink-soft">
            Categorie
          </label>
          <select
            id="category-filter"
            value={category}
            onChange={(event) => {
              setPage(1);
              setCategory(event.target.value);
            }}
            className="rounded border border-border-soft bg-white px-3 py-2 text-sm text-ink outline-none focus:border-goud"
          >
            {CATEGORY_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="active-filter" className="text-xs font-medium text-ink-soft">
            Status
          </label>
          <select
            id="active-filter"
            value={activeFilter}
            onChange={(event) => {
              setPage(1);
              setActiveFilter(event.target.value as "" | "true" | "false");
            }}
            className="rounded border border-border-soft bg-white px-3 py-2 text-sm text-ink outline-none focus:border-goud"
          >
            {ACTIVE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded border border-border-soft bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft bg-card text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Afbeelding</th>
              <th className="px-4 py-3">Naam</th>
              <th className="px-4 py-3">Prijs</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Acties</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  Producten worden geladen...
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  Geen producten gevonden.
                </td>
              </tr>
            )}
            {!isLoading &&
              products.map((product, index) => (
                <tr key={product.id} className={rowClassName(index)}>
                  <td className="px-4 py-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-sm bg-card">
                      <Image
                        src={product.image_url || PLACEHOLDER_IMAGE}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{product.name}</td>
                  <td className="px-4 py-3 font-medium text-goud">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3 text-ink-soft">{product.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        product.is_active
                          ? "inline-flex items-center rounded-full bg-mintgroen px-3 py-1 text-xs font-semibold text-[#1f7a4d]"
                          : "inline-flex items-center rounded-full bg-roze-zacht px-3 py-1 text-xs font-semibold text-[#9c2b4f]"
                      }
                    >
                      {product.is_active ? "Actief" : "Inactief"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium text-goud underline underline-offset-2 hover:text-goud-dark"
                      >
                        Bewerken
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product.id}
                        className="font-medium text-red-600 underline underline-offset-2 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          Pagina {page} van {totalPages} ({total} producten)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="rounded border border-border-soft px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Vorige
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
            className="rounded border border-border-soft px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Volgende
          </button>
        </div>
      </div>
    </div>
  );
}

function rowClassName(index: number): string {
  return index % 2 === 0
    ? "border-b border-border-soft transition-colors duration-150 ease-in-out hover:bg-card"
    : "border-b border-border-soft bg-card/50 transition-colors duration-150 ease-in-out hover:bg-card";
}

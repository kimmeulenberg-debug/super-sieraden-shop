"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  PRODUCT_CATEGORIES,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/products-db";

/**
 * Herbruikbaar productformulier, gedeeld tussen de "nieuw product"- en
 * "product bewerken"-pagina's. Bevat alleen presentatie en validatie; het
 * daadwerkelijke opslaan (API-call, redirect, toast) is aan de aanroepende
 * pagina (thin component, business logic in de pagina/route, niet hier
 * verstopt in een gedeeld formulier).
 */

const CATEGORY_LABELS: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
  oorbellen: "Oorbellen",
  ringen: "Ringen",
  kettingen: "Kettingen",
  armbandjes: "Armbandjes",
  aanbiedingen: "Aanbiedingen",
};

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  serverError?: string | null;
}

const EMPTY_DEFAULTS: ProductFormValues = {
  name: "",
  description: "",
  price: 0,
  category: "oorbellen",
  image_url: "",
  sku: "",
  stock_quantity: 0,
  is_active: true,
};

export default function ProductForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  serverError,
}: ProductFormProps) {
  // Geen expliciete generic op useForm: zodResolver leidt zelf het juiste
  // input/output-type af uit productFormSchema (o.a. door z.coerce.number()
  // en .default()). Een handmatige <ProductFormValues>-annotatie botst met
  // die afleiding en geeft een typefout.
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  const imageUrl = watch("image_url");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Productnaam
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="text-sm font-medium text-ink">
            Beschrijving
          </label>
          <textarea
            id="description"
            rows={4}
            {...register("description")}
            className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="price" className="text-sm font-medium text-ink">
            Prijs (€)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0.01"
            {...register("price")}
            className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
          />
          {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
        </div>

        <div>
          <label htmlFor="category" className="text-sm font-medium text-ink">
            Categorie
          </label>
          <select
            id="category"
            {...register("category")}
            className="mt-1 w-full rounded border border-border-soft bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="image_url" className="text-sm font-medium text-ink">
            Afbeelding-URL
          </label>
          <input
            id="image_url"
            type="text"
            placeholder="https://... (Supabase Storage) of /products/..."
            {...register("image_url")}
            className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
          />
          {errors.image_url && (
            <p className="mt-1 text-xs text-red-600">{errors.image_url.message}</p>
          )}
          {imageUrl && !errors.image_url && (
            // Plain <img> in plaats van next/image: dit is een door de admin
            // vrij ingevoerde URL (bv. elke Supabase Storage-bucket), waarvan
            // het domein niet vooraf bekend is voor next/image se
            // remotePatterns-configuratie.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Voorbeeld van de productafbeelding"
              className="mt-3 h-24 w-24 rounded-sm border border-border-soft object-cover"
            />
          )}
        </div>

        <div>
          <label htmlFor="sku" className="text-sm font-medium text-ink">
            SKU
          </label>
          <input
            id="sku"
            type="text"
            {...register("sku")}
            className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
          />
          {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
        </div>

        <div>
          <label htmlFor="stock_quantity" className="text-sm font-medium text-ink">
            Voorraad
          </label>
          <input
            id="stock_quantity"
            type="number"
            step="1"
            {...register("stock_quantity")}
            className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
          />
          {errors.stock_quantity && (
            <p className="mt-1 text-xs text-red-600">{errors.stock_quantity.message}</p>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            {...register("is_active")}
            className="h-4 w-4 accent-[#c9a961]"
          />
          <span className="text-sm font-medium text-ink">Product is actief (zichtbaar in de shop)</span>
        </label>
      </div>

      {serverError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-goud py-2.5 text-sm font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Bezig..." : submitLabel}
      </button>
    </form>
  );
}

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db";

/**
 * Product Management: gedeelde types, validatieschema's en databasefuncties.
 *
 * Bevat alle Supabase-toegang voor de `products`-tabel. Route Handlers roepen
 * uitsluitend deze functies aan (thin routes, geen business logic in de
 * routes zelf), net als bij src/lib/orders.ts.
 */

export const PRODUCT_CATEGORIES = [
  "oorbellen",
  "ringen",
  "kettingen",
  "armbandjes",
  "aanbiedingen",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  sku: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class ProductServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ProductServiceError";
  }
}

// Afbeeldings-URL moet https:// zijn (bv. Supabase Storage) of een relatief
// pad binnen deze applicatie (bv. /products/ring.svg). Dit voorkomt onveilige
// schema's zoals javascript: of data: URI's in een admin-formulierveld.
const IMAGE_URL_PATTERN = /^(https:\/\/|\/)/;

/**
 * Validatieschema voor het aanmaken van een product (admin-formulier + POST-route).
 * Lege strings voor optionele velden worden hier bewust toegestaan; ze worden
 * pas in de databasefuncties hieronder omgezet naar `null`.
 */
export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Productnaam is verplicht"),
  description: z.string().trim().max(2000, "Beschrijving is te lang (max. 2000 tekens)").default(""),
  price: z.coerce.number().positive("Prijs moet groter dan € 0 zijn"),
  category: z.enum(PRODUCT_CATEGORIES).default("oorbellen"),
  image_url: z
    .string()
    .trim()
    .refine((value) => value === "" || IMAGE_URL_PATTERN.test(value), {
      message: "Afbeeldings-URL moet beginnen met https:// of een relatief pad (bv. /products/ring.svg)",
    })
    .default(""),
  sku: z.string().trim().default(""),
  // Bewust geen .min(0): voorraad mag 0 of negatief zijn (backorder-tracking).
  stock_quantity: z.coerce.number().int("Voorraad moet een geheel getal zijn").default(0),
  is_active: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

/**
 * Validatieschema voor het gedeeltelijk bijwerken van een product (PATCH-route).
 * Losstaand van productFormSchema.partial() gedefinieerd om onvoorspelbaar
 * gedrag van .default() in combinatie met .partial() te vermijden: hier is
 * elk veld expliciet optioneel, zonder default-invulling.
 */
export const productUpdateSchema = z.object({
  name: z.string().trim().min(1, "Productnaam is verplicht").optional(),
  description: z.string().trim().max(2000, "Beschrijving is te lang (max. 2000 tekens)").optional(),
  price: z.coerce.number().positive("Prijs moet groter dan € 0 zijn").optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  image_url: z
    .string()
    .trim()
    .refine((value) => value === "" || IMAGE_URL_PATTERN.test(value), {
      message: "Afbeeldings-URL moet beginnen met https:// of een relatief pad (bv. /products/ring.svg)",
    })
    .optional(),
  sku: z.string().trim().optional(),
  stock_quantity: z.coerce.number().int("Voorraad moet een geheel getal zijn").optional(),
  is_active: z.boolean().optional(),
});

export type ProductUpdateValues = z.infer<typeof productUpdateSchema>;

/** Zet een lege/whitespace-string om naar `null` voor optionele tekstvelden. */
function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Postgres unique_violation error code, gebruikt om SKU-conflicten (23505) te
// onderscheiden van overige databasefouten.
const UNIQUE_VIOLATION_CODE = "23505";

/**
 * Maak een nieuw product aan in Supabase.
 *
 * Gooit ProductServiceError met een passende HTTP-status bij configuratie-,
 * conflict- (dubbele SKU) of databasefouten.
 */
export async function createProduct(input: ProductFormValues): Promise<ProductRecord> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new ProductServiceError(
      "Producten opslaan is niet beschikbaar: Supabase is niet geconfigureerd.",
      503
    );
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      description: toNullableText(input.description),
      price: input.price,
      category: input.category,
      image_url: toNullableText(input.image_url),
      sku: toNullableText(input.sku),
      stock_quantity: input.stock_quantity,
      is_active: input.is_active,
    })
    .select()
    .single<ProductRecord>();

  if (error || !data) {
    if (error?.code === UNIQUE_VIOLATION_CODE) {
      throw new ProductServiceError("Er bestaat al een product met deze SKU.", 409);
    }
    console.error("[lib/products-db] Kon product niet aanmaken:", error);
    throw new ProductServiceError("Het product kon niet worden opgeslagen.", 500);
  }

  return data;
}

export interface ProductListFilters {
  category?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ProductListResult {
  products: ProductRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Haal een gepagineerde, filterbare lijst van producten op, gesorteerd op
 * aanmaakdatum (nieuwste eerst).
 */
export async function listProducts(filters: ProductListFilters): Promise<ProductListResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new ProductServiceError(
      "Producten ophalen is niet beschikbaar: Supabase is niet geconfigureerd.",
      503
    );
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data, error, count } = await query.returns<ProductRecord[]>();

  if (error) {
    console.error("[lib/products-db] Kon producten niet ophalen:", error);
    throw new ProductServiceError("Producten konden niet worden opgehaald.", 500);
  }

  return { products: data ?? [], total: count ?? 0, page: filters.page, pageSize: filters.pageSize };
}

/**
 * Haal een enkel product op via id. Retourneert `null` als het niet bestaat
 * (geen exception), consistent met getOrderById in src/lib/orders.ts.
 */
export async function getProductById(productId: string): Promise<ProductRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new ProductServiceError(
      "Product ophalen is niet beschikbaar: Supabase is niet geconfigureerd.",
      503
    );
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle<ProductRecord>();

  if (error) {
    console.error("[lib/products-db] Kon product niet ophalen:", error);
    throw new ProductServiceError("Product kon niet worden opgehaald.", 500);
  }

  return data;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Haal een actief product op via zijn publieke "handle": eerst op SKU
 * (de leesbare slug), en als dat niets oplevert en de handle op een UUID
 * lijkt, op id. Gebruikt door de publieke productpagina (/sieraden/[handle]).
 *
 * Er is bewust geen aparte "handle"/slug-kolom toegevoegd aan het schema
 * (niet gevraagd); de al-unieke SKU-kolom vervult die rol voor gemigreerde
 * en nieuwe producten die een SKU hebben. Producten zonder SKU zijn bereikbaar
 * via hun id.
 */
export async function getActiveProductByHandle(handle: string): Promise<ProductRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new ProductServiceError(
      "Product ophalen is niet beschikbaar: Supabase is niet geconfigureerd.",
      503
    );
  }

  const { data: bySku, error: skuError } = await supabase
    .from("products")
    .select("*")
    .eq("sku", handle)
    .eq("is_active", true)
    .maybeSingle<ProductRecord>();

  if (skuError) {
    console.error("[lib/products-db] Kon product niet ophalen via SKU:", skuError);
    throw new ProductServiceError("Product kon niet worden opgehaald.", 500);
  }
  if (bySku) {
    return bySku;
  }

  if (!UUID_REGEX.test(handle)) {
    return null;
  }

  const { data: byId, error: idError } = await supabase
    .from("products")
    .select("*")
    .eq("id", handle)
    .eq("is_active", true)
    .maybeSingle<ProductRecord>();

  if (idError) {
    console.error("[lib/products-db] Kon product niet ophalen via id:", idError);
    throw new ProductServiceError("Product kon niet worden opgehaald.", 500);
  }

  return byId;
}

/**
 * Werk een product gedeeltelijk bij. Retourneert `null` als het niet bestaat.
 *
 * Gooit ProductServiceError (409) bij een SKU-conflict met een ander product.
 */
export async function updateProduct(
  productId: string,
  patch: ProductUpdateValues
): Promise<ProductRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new ProductServiceError(
      "Product bijwerken is niet beschikbaar: Supabase is niet geconfigureerd.",
      503
    );
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = toNullableText(patch.description);
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.image_url !== undefined) payload.image_url = toNullableText(patch.image_url);
  if (patch.sku !== undefined) payload.sku = toNullableText(patch.sku);
  if (patch.stock_quantity !== undefined) payload.stock_quantity = patch.stock_quantity;
  if (patch.is_active !== undefined) payload.is_active = patch.is_active;

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .select()
    .maybeSingle<ProductRecord>();

  if (error) {
    if (error.code === UNIQUE_VIOLATION_CODE) {
      throw new ProductServiceError("Er bestaat al een product met deze SKU.", 409);
    }
    console.error("[lib/products-db] Kon product niet bijwerken:", error);
    throw new ProductServiceError("Product kon niet worden bijgewerkt.", 500);
  }

  return data;
}

/**
 * Verwijder een product zacht (is_active = false) in plaats van hard te
 * verwijderen. Dit houdt de bestelhistorie (order_items.product_id) intact
 * en is omkeerbaar. Retourneert `true` als een rij is bijgewerkt, `false`
 * als het product niet bestaat.
 */
export async function deactivateProduct(productId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new ProductServiceError(
      "Product verwijderen is niet beschikbaar: Supabase is niet geconfigureerd.",
      503
    );
  }

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[lib/products-db] Kon product niet deactiveren:", error);
    throw new ProductServiceError("Product kon niet worden verwijderd.", 500);
  }

  return data !== null;
}

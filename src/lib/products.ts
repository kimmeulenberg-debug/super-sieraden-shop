import { cache } from "react";
import {
  getActiveProductByHandle,
  listProducts,
  ProductServiceError,
  type ProductRecord,
} from "@/lib/products-db";

/**
 * Publieke productcatalogus voor de shop (Home + productdetailpagina).
 *
 * Haalt sinds de invoering van het Product Management-systeem producten op
 * uit Supabase (via src/lib/products-db.ts) in plaats van de vroegere
 * hardcoded dummy-array. De functienamen en de `Product`-vorm blijven gelijk
 * zodat ProductCard, ProductGrid, AddToCartButton en de wishlist/cart-stores
 * ongewijzigd kunnen blijven.
 *
 * Let op — bewuste afwijking van de oorspronkelijke opzet ("fetch van
 * GET /api/products"): Home en de productdetailpagina zijn Server Components
 * en roepen daarom de datalaag (products-db.ts) rechtstreeks aan in plaats
 * van een HTTP-fetch naar hun eigen API-route te doen. Dat is de gangbare
 * Next.js App Router-aanpak (geen onnodige netwerk-round-trip, geen extra
 * NEXT_PUBLIC_SITE_URL-envvariabele nodig) en levert dezelfde data op, omdat
 * de route en deze functies dezelfde onderliggende functies aanroepen.
 * Caching gebeurt via React's `cache()` (dedupe binnen één request) en via
 * `export const revalidate` in de paginabestanden (tijdgebaseerde ISR-cache).
 */

export interface Product {
  id: string;
  handle: string;
  name: string;
  price: number;
  image: string;
  category: string;
  isNew: boolean;
  giftLabel: boolean;
}

const PLACEHOLDER_IMAGE = "/products/placeholder.svg";

// Een product geldt als "nieuw" als het binnen dit aantal dagen is aangemaakt.
// Er is geen aparte "is_new"-kolom in het schema (niet gevraagd); dit is een
// afgeleide, transparante regel in plaats van een verzonnen databasekolom.
const NEW_PRODUCT_WINDOW_DAYS = 30;

function isRecentlyCreated(createdAt: string): boolean {
  const createdTime = new Date(createdAt).getTime();
  const windowMs = NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdTime <= windowMs;
}

/**
 * Zet een databaserecord om naar de `Product`-vorm die de bestaande
 * frontend-componenten verwachten.
 *
 * - `handle` = sku (leesbare slug) indien aanwezig, anders het id. Er is
 *   bewust geen aparte "handle"-kolom toegevoegd aan het schema.
 * - `image` valt terug op een placeholder-SVG als image_url ontbreekt.
 * - `giftLabel` is een vaste `true` (geen kolom hiervoor in het schema);
 *   dit kan later een echte kolom worden zodra dat nodig is.
 */
function toStorefrontProduct(record: ProductRecord): Product {
  return {
    id: record.id,
    handle: record.sku ?? record.id,
    name: record.name,
    price: record.price,
    image: (record.image_url?.trim()) ? record.image_url : PLACEHOLDER_IMAGE,
    category: record.category,
    isNew: isRecentlyCreated(record.created_at),
    giftLabel: true,
  };
}

// Bovengrens voor "alle actieve producten" op de publieke shop-pagina's. Geen
// paginering nodig hier (dat is een admin-behoefte), maar wel een limiet om
// een onbegrensde query te voorkomen.
const STOREFRONT_MAX_PRODUCTS = 100;

/**
 * Haalt de actieve producten op voor de publieke shop-pagina's.
 *
 * Vangt ProductServiceError bewust op en geeft dan een lege lijst terug in
 * plaats van de fout te laten doorbreken: dit voorkomt dat een tijdelijke
 * Supabase-storing, of het (nog) ontbreken van de products-migratie, de hele
 * storefront-build/rendering laat crashen. De admin-API (src/app/api/products)
 * doet dit bewust NIET — daar moet een fout wél zichtbaar zijn voor de beheerder.
 */
const loadActiveProducts = cache(async (): Promise<ProductRecord[]> => {
  try {
    const { products } = await listProducts({
      isActive: true,
      page: 1,
      pageSize: STOREFRONT_MAX_PRODUCTS,
    });
    return products;
  } catch (error) {
    if (error instanceof ProductServiceError) {
      console.error("[lib/products] Producten niet beschikbaar, toon lege catalogus:", error.message);
      return [];
    }
    throw error;
  }
});

/** Haal de nieuwste actieve producten op (voor de "Nieuwste sieraden"-sectie). */
export async function getNewestProducts(count = 5): Promise<Product[]> {
  const products = await loadActiveProducts();
  return products
    .filter((product) => isRecentlyCreated(product.created_at))
    .slice(0, count)
    .map(toStorefrontProduct);
}

/** Haal de bestsellers op. Zolang er geen verkoopdata is, is dit de meest recente lijst. */
export async function getBestsellers(count = 20): Promise<Product[]> {
  const products = await loadActiveProducts();
  return products.slice(0, count).map(toStorefrontProduct);
}

/**
 * Haal een actief product op via zijn publieke handle (SKU of id).
 * Retourneert `undefined` als het niet bestaat, consistent met de vorige
 * dummy-implementatie (gebruikt door notFound() op de detailpagina).
 */
export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  try {
    const record = await getActiveProductByHandle(handle);
    return record ? toStorefrontProduct(record) : undefined;
  } catch (error) {
    if (error instanceof ProductServiceError) {
      console.error("[lib/products] Product niet beschikbaar:", error.message);
      return undefined;
    }
    throw error;
  }
}

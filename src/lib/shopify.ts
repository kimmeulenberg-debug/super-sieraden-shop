import type { Product } from "./products";

/**
 * Shopify Storefront API client.
 *
 * Server-only: dit bestand mag alleen worden geimporteerd in Server Components
 * of Route Handlers, nooit in Client Components. Zo blijft het Storefront
 * API access token buiten de client bundle.
 *
 * Status: NIET actief. De homepage gebruikt momenteel de dummy data uit
 * src/lib/products.ts omdat er nog geen Shopify store domain / Storefront
 * token beschikbaar is. Zodra die er zijn:
 *
 *   1. Zet SHOPIFY_STORE_DOMAIN en SHOPIFY_STOREFRONT_ACCESS_TOKEN in .env.local
 *   2. Vervang de imports van "@/lib/products" door "@/lib/shopify" in
 *      src/app/page.tsx
 *
 * De functies hieronder retourneren dezelfde `Product` shape als de dummy
 * data, zodat componenten ongewijzigd blijven.
 */

const API_VERSION = "2025-01";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          handle
          title
          productType
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
            }
          }
        }
      }
    }
  }
`;

interface ShopifyProductNode {
  id: string;
  handle: string;
  title: string;
  productType: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: { minVariantPrice: { amount: string } };
}

interface ShopifyProductsResponse {
  data?: {
    products: {
      edges: { node: ShopifyProductNode }[];
    };
  };
  errors?: { message: string }[];
}

function mapToProduct(node: ShopifyProductNode): Product {
  return {
    id: node.id,
    handle: node.handle,
    name: node.title,
    price: Number.parseFloat(node.priceRange.minVariantPrice.amount),
    image: node.featuredImage?.url ?? "/products/ring.svg",
    category: node.productType || "Sieraden",
    isNew: false,
    giftLabel: true,
  };
}

/**
 * Haalt producten op bij Shopify. Geeft `null` terug (in plaats van te
 * gooien) wanneer configuratie ontbreekt of de call faalt, zodat de
 * aanroepende pagina altijd kan terugvallen op de dummy data.
 */
export async function fetchShopifyProducts(
  count: number
): Promise<Product[] | null> {
  if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(
      `https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        },
        body: JSON.stringify({
          query: PRODUCTS_QUERY,
          variables: { first: count },
        }),
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const json = (await response.json()) as ShopifyProductsResponse;

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join(", "));
    }

    const edges = json.data?.products.edges ?? [];
    return edges.map((edge) => mapToProduct(edge.node));
  } catch (error) {
    console.error("[shopify] Kon producten niet ophalen:", error);
    return null;
  }
}

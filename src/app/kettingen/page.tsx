import { listProducts } from "@/lib/products-db";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

const NEW_PRODUCT_WINDOW_DAYS = 30;

function isRecentlyCreated(createdAt: string): boolean {
  const createdTime = new Date(createdAt).getTime();
  const windowMs = NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdTime <= windowMs;
}

function toStorefrontProduct(record: any): Product {
  return {
    id: record.id,
    handle: record.sku ?? record.id,
    name: record.name,
    price: record.price,
    image: (record.image_url?.trim()) ? record.image_url : "/products/placeholder.svg",
    category: record.category,
    isNew: isRecentlyCreated(record.created_at),
    giftLabel: true,
  };
}

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "Kettingen - Super Sieraden Shop",
    description: "Ontdek onze verfijnde collectie kettingen in verschillende stijlen.",
  };
}

export default async function KettinenPage() {
  try {
    const { products: dbProducts } = await listProducts({
      category: "kettingen",
      isActive: true,
      page: 1,
      pageSize: 100,
    });

    const products = dbProducts.map(toStorefrontProduct);

    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-medium text-ink">Kettingen</h1>
            <p className="mt-2 text-ink-soft">
              Ontdek onze exclusieve collectie kettingen met verfijnde design.
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-ink-soft">Geen kettingen beschikbaar op dit moment.</p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("[kettingen] Fout bij laden categorie:", error);
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <h1 className="text-4xl font-medium text-ink">Kettingen</h1>
          <p className="mt-4 text-ink-soft">Er trad een fout op bij het laden van deze categorie.</p>
        </div>
      </div>
    );
  }
}

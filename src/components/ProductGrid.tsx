import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  id?: string;
  title: string;
  products: Product[];
}

export default function ProductGrid({ id, title, products }: ProductGridProps) {
  return (
    <section id={id} className="bg-white px-6 py-10">
      <h2 className="mb-6 text-[28px] font-medium leading-9 text-ink">{title}</h2>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}

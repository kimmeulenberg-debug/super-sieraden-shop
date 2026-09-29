import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Carousel from "@/components/Carousel";
import ProductGrid from "@/components/ProductGrid";
import { getBestsellers, getNewestProducts } from "@/lib/products";

// ISR: de productenlijst wordt server-side gecachet en na deze periode
// (in seconden) opnieuw opgehaald bij Supabase in plaats van bij elk verzoek.
export const revalidate = 60;

export default async function Home() {
  const [newestProducts, bestsellers] = await Promise.all([
    getNewestProducts(5),
    getBestsellers(20),
  ]);

  return (
    <>
      <Hero />
      <Breadcrumb />

      <div className="bg-white px-6 py-6">
        <h1 className="text-[32px] font-medium text-ink">Sieraden</h1>
      </div>

      <Carousel />

      <ProductGrid title="Nieuwste Sieraden" products={newestProducts} />
      <ProductGrid id="bestsellers" title="Ondek onze bestsellers" products={bestsellers} />
    </>
  );
}

import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductByHandle } from "@/lib/products";
import AddToCartButton from "@/components/AddToCartButton";

function formatPrice(price: number) {
  return `€ ${price.toFixed(2).replace(".", ",")}`;
}

// ISR: zie src/app/page.tsx voor de toelichting op deze cache-strategie.
export const revalidate = 60;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <Link
        href="/"
        className="text-sm text-ink-soft underline transition-colors duration-150 ease-in-out hover:text-goud"
      >
        &larr; Terug naar Sieraden
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded bg-card">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 500px"
            className="object-cover"
          />
        </div>

        <div>
          <span className="rounded-sm bg-lavendel/90 px-2 py-1 text-xs font-medium text-ink">
            {product.category}
          </span>
          <h1 className="mt-4 text-[28px] font-medium leading-9 text-ink">
            {product.name}
          </h1>
          <p className="mt-2 text-lg font-semibold text-goud">
            {formatPrice(product.price)}
            <span className="ml-2 text-xs font-normal text-ink-soft">incl. btw</span>
          </p>
          <AddToCartButton
            product={product}
            className="mt-6 px-8 py-3.5 text-base"
          />
        </div>
      </div>
    </div>
  );
}

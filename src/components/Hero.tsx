import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="flex h-[400px] flex-col items-center justify-center bg-gradient-to-br from-lavendel via-ijsblauw to-mintgroen px-10 text-center md:h-[300px]"
      aria-label="Hero"
    >
      <h1 className="animate-hero-title text-[48px] font-semibold leading-[56px] text-goud">
        SuperSieradenShop
      </h1>
      <p className="animate-hero-subtitle mt-3 text-base font-normal leading-6 text-ink">
        Elk stuk gemaakt met liefde
      </p>
      <Link
        href="#bestsellers"
        className="animate-hero-cta mt-6 rounded bg-goud px-8 py-3.5 text-base font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark"
      >
        Koop nu
      </Link>
    </section>
  );
}

import Link from "next/link";

export default function Breadcrumb() {
  return (
    <nav
      aria-label="Breadcrumb"
      className="animate-fade-in flex h-[30px] items-center gap-2 bg-white px-6 py-3 text-sm text-ink-soft"
    >
      <Link
        href="/"
        className="flex items-center gap-1 transition-colors duration-150 ease-in-out hover:text-goud hover:underline"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 10v9h13v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Home
      </Link>
      <span aria-hidden="true">&gt;</span>
      <Link
        href="/"
        className="transition-colors duration-150 ease-in-out hover:text-goud hover:underline"
      >
        Sieraden
      </Link>
    </nav>
  );
}

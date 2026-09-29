import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";

/**
 * Layout voor het admin-dashboard. Bevat een eenvoudige navigatiebalk.
 *
 * Beveiliging: dit gedeelte heeft momenteel GEEN authenticatie. Elke
 * bezoeker die de URL kent, kan bij bestellingen, klantgegevens én producten.
 * Voeg vóór productiegebruik minimaal een wachtwoordbeveiliging toe (bv. via
 * Next.js Middleware met Basic Auth), en later een echte inlog met RBAC
 * per endpoint (niet per router/layout).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-cream">
      <nav className="flex h-14 items-center justify-between border-b border-border-soft bg-white px-6">
        <AdminNav />
        <Link href="/" className="text-sm text-ink-soft underline hover:text-goud">
          &larr; Terug naar de shop
        </Link>
      </nav>
      <main className="mx-auto max-w-[1200px] px-6 py-8">{children}</main>
    </div>
  );
}

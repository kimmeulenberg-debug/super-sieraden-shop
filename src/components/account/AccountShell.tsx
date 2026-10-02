"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";

/**
 * Gedeelde kop + inlogcontrole voor de accountsubpagina's. De inhoud wordt pas
 * na het laden in de browser getoond, omdat de opgeslagen gegevens in
 * localStorage staan (voorkomt verschillen tussen server- en browserweergave).
 */
export default function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/account" className="mb-6 inline-block text-sm text-gray-600 transition-colors hover:text-gray-900">
          ← Terug naar mijn account
        </Link>
        <h1 className="mb-2 text-3xl font-semibold text-gray-900">{title}</h1>
        <p className="mb-8 text-gray-600">{description}</p>

        {!mounted ? null : !isLoggedIn ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="mb-4 text-gray-700">Log in om deze pagina te gebruiken.</p>
            <Link
              href="/login"
              className="inline-block rounded bg-[#C9A961] px-6 py-3 font-medium text-white transition-colors hover:bg-[#B39450]"
            >
              Inloggen
            </Link>
          </div>
        ) : (
          children
        )}

        <p className="mt-10 text-xs text-gray-500">
          Je gegevens worden alleen op dit apparaat bewaard en verdwijnen als je uitlogt of je browsergegevens wist.
        </p>
      </div>
    </main>
  );
}

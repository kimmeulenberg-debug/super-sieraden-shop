'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/store';
import { useAuthStore } from '@/store/auth';

export default function AccountPage() {
  const router = useRouter();
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const logout = useAuthStore((state) => state.logout);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 text-sm mb-6 inline-block transition-colors"
          >
            ← Terug naar shop
          </Link>

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Mijn Account
          </h1>
          <p className="text-gray-600">
            Beheer je accountgegevens en bestellingen
          </p>
        </div>

        {/* Logged In / Not Logged In State */}
        {isLoggedIn && user ? (
          <div className="bg-green-50 rounded-lg border border-green-200 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-green-900 mb-1">
                  Welkom, {user.name}! 👋
                </h2>
                <p className="text-green-700">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="px-6 py-2 bg-red-500 text-white font-medium rounded hover:bg-red-600 transition-colors"
              >
                Uitloggen
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 mb-8 text-center">
            <div className="mb-6">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto text-gray-400"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Je bent niet ingelogd
            </h2>
            <p className="text-gray-600 mb-6">
              Log in met je account om je bestellingen te beheren en sneller af te rekenen.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-[#C9A961] text-white font-medium rounded hover:bg-[#B39450] transition-colors"
            >
              Inloggen
            </Link>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-gray-600 text-sm mb-2">
                Nog geen account?
              </p>
              <Link
                href="/signup"
                className="text-[#C9A961] hover:text-[#B39450] font-semibold transition-colors"
              >
                Registreer nu
              </Link>
            </div>
          </div>
        )}

        {/* Account Sections - Only show if logged in */}
        {isLoggedIn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Mijn Bestellingen */}
            <Link
              href="#"
              onClick={(e) => e.preventDefault()}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-blue-600"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Mijn Bestellingen</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Bekijk je bestellingen en trackingsinfo
                  </p>
                </div>
              </div>
            </Link>

            {/* Persoonlijke Gegevens */}
            <Link
              href="#"
              onClick={(e) => e.preventDefault()}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 rounded">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-purple-600"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Profiel</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Update je persoonlijke gegevens en instellingen
                  </p>
                </div>
              </div>
            </Link>

            {/* Adressen */}
            <Link
              href="#"
              onClick={(e) => e.preventDefault()}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 rounded">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-green-600"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Adressen</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Beheer je verzendingsadressen
                  </p>
                </div>
              </div>
            </Link>

            {/* Favorieten */}
            <Link
              href="/wishlist"
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-pink-50 rounded">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-pink-600"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Mijn Favorieten</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Bekijk je favoriete producten
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Additional Info - only for non-logged in users */}
        {!isLoggedIn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              🔐 Login-functionaliteit
            </h3>
            <p className="text-sm text-blue-700">
              Je kunt nu inloggen om je accountgegevens te beheren. Meld je aan met je e-mailadres en wachtwoord.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

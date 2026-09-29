'use client';

import { useEffect, useState } from 'react';
import { useWishlistStore, useCartStore, useToastStore } from '@/store/store';
import Link from 'next/link';
import Image from 'next/image';

export default function WishlistPage() {
  const wishlistIds = useWishlistStore((state) => state.productIds);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const addToCart = useCartStore((state) => state.addToCart);
  const showToast = useToastStore((state) => state.showToast);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/products?isActive=true&pageSize=100');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const wishlistProducts = products.filter((p) =>
    wishlistIds.includes(String(p.id))
  );

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: (product.image_url && product.image_url.trim()) ? product.image_url : '/placeholder.svg',
    });
    showToast(`${product.name} toegevoegd aan winkelmandje`, 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-600">Producten laden...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Terug naar shop</span>
          </Link>
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Mijn favorieten
        </h1>
        <p className="text-gray-600 mb-12">
          {wishlistProducts.length} product{wishlistProducts.length !== 1 ? 'en' : ''}
        </p>

        {/* Empty State */}
        {wishlistProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Je favorieten zijn leeg
            </h2>
            <p className="text-gray-600 mb-8">
              Voeg producten toe door op het hartje te klikken
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#C9A961] text-white font-medium rounded hover:bg-[#B39450] transition-colors"
            >
              Ontdek producten
            </Link>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {wishlistProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image Container */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {product.image_url && product.image_url.trim() ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    {!product.image_url || !product.image_url.trim() ? 'Geen afbeelding' : null}
                  </div>

                  {/* Remove from Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(String(product.id))}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    aria-label="Verwijder uit favorieten"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#F5D9E8" stroke="#F5D9E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>

                  {/* Perfect Gift Label */}
                  <div className="absolute top-3 left-3 bg-purple-200 text-purple-800 px-3 py-1 rounded text-xs font-medium">
                    Perfect gift
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-sm text-gray-600">€</span>
                    <span className="text-lg font-semibold text-[#C9A961]">
                      {product.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full py-2 bg-[#C9A961] text-white text-sm font-medium rounded hover:bg-[#B39450] transition-colors"
                  >
                    In winkelmandje
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

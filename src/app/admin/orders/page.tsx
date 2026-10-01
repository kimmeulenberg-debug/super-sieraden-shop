'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { OrderRecord } from '@/lib/orders';

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'In afwachting', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  shipped: { label: 'Verzonden', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  delivered: { label: 'Bezorgd', color: 'text-green-600', bgColor: 'bg-green-50' },
  cancelled: { label: 'Geannuleerd', color: 'text-red-600', bgColor: 'bg-red-50' },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Wacht op betaling', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  paid: { label: 'Betaald', color: 'text-green-600', bgColor: 'bg-green-50' },
  failed: { label: 'Betaling mislukt', color: 'text-red-600', bgColor: 'bg-red-50' },
  refunded: { label: 'Terugbetaald', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1);
  const [totalPages, setTotalPages] = useState(1);

  const statusFilter = searchParams.get('status') || undefined;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', '20');
        if (statusFilter) params.append('status', statusFilter);

        const response = await fetch(`/api/orders?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch orders');

        const data = await response.json();
        setOrders(data.orders || []);
        setTotalPages(Math.ceil(data.total / 20) || 1);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [page, statusFilter]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 text-sm mb-4 inline-block transition-colors"
          >
            ← Terug naar shop
          </Link>

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Bestellingen</h1>
          <p className="text-gray-600">Beheer alle klantbestellingen</p>
        </div>

        <div className="mb-6 flex gap-2 flex-wrap">
          <Link
            href="/admin/orders"
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !statusFilter
                ? 'bg-[#C9A961] text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Alle ({orders.length})
          </Link>
          {['pending', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <Link
              key={status}
              href={`/admin/orders?status=${status}`}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === status
                  ? 'bg-[#C9A961] text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS].label}
            </Link>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A961]"></div>
            </div>
            <p className="text-gray-600 mt-4">Bestellingen laden...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            Fout bij laden van bestellingen: {error}
          </div>
        )}

        {!loading && orders.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Bestellingnummer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Klant</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Bedrag</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Betaaling</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Datum</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#C9A961]">{order.order_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{order.customer_name}</div>
                        <div className="text-xs text-gray-500">{order.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">€{order.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {PAYMENT_LABELS[order.payment_status] && (
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              PAYMENT_LABELS[order.payment_status as keyof typeof PAYMENT_LABELS].bgColor
                            } ${PAYMENT_LABELS[order.payment_status as keyof typeof PAYMENT_LABELS].color}`}
                          >
                            {PAYMENT_LABELS[order.payment_status as keyof typeof PAYMENT_LABELS].label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {STATUS_LABELS[order.status] && (
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              STATUS_LABELS[order.status as keyof typeof STATUS_LABELS].bgColor
                            } ${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS].color}`}
                          >
                            {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS].label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString('nl-NL')}</td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-[#C9A961] hover:text-[#B39450] font-medium transition-colors"
                        >
                          Bekijk
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/orders?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ← Vorige
                  </Link>
                )}
                <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700">
                  Pagina {page} van {totalPages}
                </div>
                {page < totalPages && (
                  <Link
                    href={`/admin/orders?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Volgende →
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {!loading && orders.length === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 mb-4">Geen bestellingen gevonden</p>
            <Link href="/" className="text-[#C9A961] hover:text-[#B39450] font-medium">
              Terug naar shop
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-600">Bestellingen laden...</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}

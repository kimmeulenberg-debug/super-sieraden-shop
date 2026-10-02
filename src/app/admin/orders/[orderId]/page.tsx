'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { OrderRecord } from '@/lib/orders';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
}

const STATUS_OPTIONS = ['pending', 'shipped', 'delivered', 'cancelled'];
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

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) throw new Error('Order not found');
        
        const data = await response.json();
        setOrder(data.order);
        setItems(data.items || []);
        setNewStatus(data.order.status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async () => {
    if (!order || newStatus === order.status) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Status bijwerken mislukt');

      setOrder(data.updatedOrder);
      setNotice(null);
      setError(null);
      if (data.shippedEmailSent === true) {
        setNotice('Status bijgewerkt. De klant is per e-mail op de hoogte gebracht dat de bestelling is verzonden.');
      } else if (data.shippedEmailSent === false) {
        setError('Status is bijgewerkt, maar de e-mail aan de klant kon niet worden verzonden (is RESEND_API_KEY ingesteld in Vercel?). Je kunt de mail opnieuw sturen met de knop onderaan.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!order) return;
    if (!window.confirm(`Bevestig dat je de betaling van €${order.total.toFixed(2)} hebt ontvangen. De klant krijgt hiervan een e-mail.`)) return;

    try {
      setMarkingPaid(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'paid' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Markeren als betaald mislukt');

      setOrder(data.updatedOrder);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Markeren als betaald mislukt');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleNotify = async (type: 'owner' | 'shipped' = 'owner') => {
    try {
      setNotifying(true);
      setNotice(null);
      const response = await fetch(`/api/orders/${orderId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Melding versturen mislukt');
      setNotice(type === 'shipped' ? 'Verzendmail is opnieuw naar de klant gestuurd.' : 'Melding is verstuurd naar je e-mailadres.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Melding versturen mislukt');
    } finally {
      setNotifying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A961] mx-auto"></div>
          <p className="text-gray-600 mt-4">Order laden...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/admin/orders" className="text-[#C9A961] hover:text-[#B39450] font-medium mb-4 inline-block">
            ← Terug naar bestellingen
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Order niet gevonden'}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/admin/orders" className="text-gray-600 hover:text-gray-900 text-sm mb-4 inline-block transition-colors">
          ← Terug naar bestellingen
        </Link>

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">{order.order_number}</h1>
              <p className="text-gray-600">{new Date(order.created_at).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
            </div>
            {STATUS_LABELS[order.status] && (
              <span className={`px-4 py-2 rounded-lg font-medium ${STATUS_LABELS[order.status].bgColor} ${STATUS_LABELS[order.status].color}`}>
                {STATUS_LABELS[order.status].label}
              </span>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}
          {notice && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">{notice}</div>}

          {/* Klantgegevens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Klantgegevens</h3>
              <p><strong>{order.customer_name}</strong></p>
              <p className="text-gray-600">{order.customer_email}</p>
              {order.customer_phone && <p className="text-gray-600">{order.customer_phone}</p>}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Verzendadres</h3>
              <p>{order.customer_address || 'Niet opgegeven'}</p>
              <p className="text-gray-600">{order.customer_postcode} {order.customer_city}</p>
              <p className="text-gray-600">{order.customer_country}</p>
            </div>
          </div>

          {/* Bestellingsitems */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Bestellingsitems</h3>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Prijs</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Totaal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm">{item.product_name}</td>
                    <td className="px-4 py-3 text-center text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm">€{item.product_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">€{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totalen */}
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <div className="flex justify-between mb-2">
              <span>Subtotaal</span>
              <span>€{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Verzendkosten ({order.shipping_method})</span>
              <span>€{order.shipping_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 pb-4 border-b">
              <span>BTW (21%)</span>
              <span>€{order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Totaal</span>
              <span>€{order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Betaaldgegevens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Betaalstatus</h3>
              {PAYMENT_LABELS[order.payment_status] && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${PAYMENT_LABELS[order.payment_status].bgColor} ${PAYMENT_LABELS[order.payment_status].color}`}>
                  {PAYMENT_LABELS[order.payment_status].label}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Betaalreferentie</h3>
              <p className="text-xs font-mono text-gray-600">
                {order.payment_provider === 'tikkie'
                  ? `Tikkie (handmatig) - omschrijving: Super Sieraden Shop ${order.order_number}`
                  : order.payment_provider === 'mollie'
                    ? order.mollie_payment_id || 'N/A'
                    : order.stripe_payment_id || 'N/A'}
              </p>
            </div>
          </div>

          {order.payment_provider === 'tikkie' && (
            <div className="mb-8 p-4 rounded-lg border border-[#C9A961] bg-[#fff8e6]">
              <h3 className="font-semibold text-gray-900 mb-2">Tikkie-betaling</h3>
              {order.payment_status === 'paid' ? (
                <p className="text-green-700">Betaling ontvangen en gemarkeerd als betaald.</p>
              ) : (
                <>
                  <p className="text-gray-700">
                    Stuur een Tikkie van <strong>€{order.total.toFixed(2)}</strong> naar{' '}
                    <strong>{order.customer_name}</strong>
                    {order.customer_phone ? <> ({order.customer_phone})</> : null}, omschrijving{' '}
                    <strong>Super Sieraden Shop {order.order_number}</strong>.
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {order.tikkie_confirmed_at
                      ? `De klant meldt op ${new Date(order.tikkie_confirmed_at).toLocaleString('nl-NL')} dat de Tikkie is betaald. Controleer eerst in je bank- of Tikkie-app of het bedrag binnen is.`
                      : 'De klant heeft nog niet gemeld dat de Tikkie is betaald.'}
                  </p>
                  <button
                    onClick={handleMarkPaid}
                    disabled={markingPaid}
                    className="mt-4 px-6 py-2 bg-[#C9A961] text-white font-medium rounded-lg hover:bg-[#B39450] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {markingPaid ? 'Bezig...' : 'Markeer als betaald'}
                  </button>
                  <button
                    onClick={() => handleNotify('owner')}
                    disabled={notifying}
                    className="mt-4 ml-3 px-6 py-2 border border-[#C9A961] text-[#8a6f2f] font-medium rounded-lg hover:bg-[#C9A961]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {notifying ? 'Bezig...' : 'Melding opnieuw mailen'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Status Update */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Update bestellingstatus</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nieuwe status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status].label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === order.status}
                className="px-6 py-2 bg-[#C9A961] text-white font-medium rounded-lg hover:bg-[#B39450] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Bezig...' : 'Update'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Zodra je de status op &quot;Verzonden&quot; zet, ontvangt de klant automatisch een e-mail.
            </p>
            {order.status === 'shipped' && (
              <button
                onClick={() => handleNotify('shipped')}
                disabled={notifying}
                className="mt-3 text-sm font-medium text-[#8a6f2f] underline hover:text-[#C9A961] disabled:opacity-50"
              >
                {notifying ? 'Bezig...' : 'Verzendmail opnieuw naar de klant sturen'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

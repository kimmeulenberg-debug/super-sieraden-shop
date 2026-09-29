import { getMolliePayment, isMolliePaymentPaid, isMolliePaymentFailed } from '@/lib/mollie';
import { getSupabaseAdmin } from '@/lib/db';
import { sendOrderConfirmation } from '@/lib/email';
import { OrderRecord } from '@/lib/orders';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error('[mollie-webhook] Database not configured');
    return new Response('Database not configured', { status: 503 });
  }

  try {
    // Get webhook payload
    const body = await request.json();
    const paymentId = body.id;

    if (!paymentId) {
      console.warn('[mollie-webhook] Missing payment ID in webhook');
      return new Response('Missing payment ID', { status: 400 });
    }

    console.log(`[mollie-webhook] Processing payment: ${paymentId}`);

    // Fetch payment details from Mollie API to verify status
    try {
      const payment = await getMolliePayment(paymentId);

      if (isMolliePaymentPaid(payment)) {
        // Find order by mollie_payment_id
        const { data: orders, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('mollie_payment_id', paymentId);

        if (fetchError) {
          console.error('[mollie-webhook] Database error fetching order:', fetchError.message);
          return new Response('Database error', { status: 500 });
        }

        if (!orders || orders.length === 0) {
          console.warn('[mollie-webhook] Order not found for payment:', paymentId);
          return new Response('Order not found', { status: 404 });
        }

        const order = orders[0] as OrderRecord;

        // Check if already processed (idempotency)
        if (order.payment_status === 'paid') {
          console.log('[mollie-webhook] Payment already processed:', paymentId);
          return new Response('Already processed', { status: 200 });
        }

        // Update payment status to "paid"
        const { error: updateError } = await supabase
          .from('orders')
          .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        if (updateError) {
          console.error('[mollie-webhook] Error updating order status:', updateError.message);
          return new Response('Update failed', { status: 500 });
        }

        console.log(`[mollie-webhook] Order ${order.order_number} marked as paid`);

        // Fetch order items for email
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) {
          console.error('[mollie-webhook] Error fetching order items:', itemsError.message);
        }

        // Send order confirmation email
        try {
          const emailItems = (items || []).map((item: any) => ({
            product_name: item.product_name,
            product_price: item.product_price,
            quantity: item.quantity,
            total: item.total,
          }));

          await sendOrderConfirmation(order, emailItems);
          console.log(`[mollie-webhook] Confirmation email sent to ${order.customer_email}`);
        } catch (emailError) {
          console.error('[mollie-webhook] Email send failed (non-blocking):', emailError);
          // Don't return error - webhook should succeed even if email fails
        }

        return new Response('Payment processed', { status: 200 });
      }

      if (isMolliePaymentFailed(payment)) {
        // Find order by mollie_payment_id
        const { data: orders, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('mollie_payment_id', paymentId);

        if (fetchError) {
          console.error('[mollie-webhook] Database error fetching order:', fetchError.message);
          return new Response('Database error', { status: 500 });
        }

        if (orders && orders.length > 0) {
          const order = orders[0] as OrderRecord;

          // Update payment status to "failed"
          const { error: updateError } = await supabase
            .from('orders')
            .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', order.id);

          if (updateError) {
            console.error('[mollie-webhook] Error updating order status:', updateError.message);
            return new Response('Update failed', { status: 500 });
          }

          console.log(`[mollie-webhook] Order ${order.order_number} marked as failed`);
        }

        return new Response('Payment failure processed', { status: 200 });
      }

      // Payment status is pending/open - don't process yet
      console.log(`[mollie-webhook] Payment status not final: ${payment.status}`);
      return new Response('Payment status not final', { status: 200 });
    } catch (mollieError) {
      console.error('[mollie-webhook] Error fetching payment from Mollie:', mollieError);
      return new Response('Mollie API error', { status: 500 });
    }
  } catch (error) {
    console.error('[mollie-webhook] Unexpected error:', error instanceof Error ? error.message : String(error));
    return new Response('Internal server error', { status: 500 });
  }
}

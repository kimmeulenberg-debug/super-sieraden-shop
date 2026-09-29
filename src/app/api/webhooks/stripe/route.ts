import { headers } from 'next/headers';
import { getStripeServer } from '@/lib/stripe-server';
import { getSupabaseAdmin } from '@/lib/db';
import { sendOrderConfirmation } from '@/lib/email';
import { OrderRecord } from '@/lib/orders';

export async function POST(request: Request) {
  const stripe = getStripeServer();
  const supabase = getSupabaseAdmin();

  // Validate webhook infrastructure
  if (!stripe) {
    console.error('[webhook] Stripe not configured');
    return new Response('Stripe not configured', { status: 503 });
  }

  if (!supabase) {
    console.error('[webhook] Database not configured');
    return new Response('Database not configured', { status: 503 });
  }

  try {
    // Get webhook signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[webhook] Missing stripe-signature header');
      return new Response('Missing signature', { status: 401 });
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Read request body
    const body = await request.text();

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('[webhook] Signature verification failed:', error instanceof Error ? error.message : String(error));
      return new Response('Signature verification failed', { status: 401 });
    }

    console.log(`[webhook] Received event: ${event.type}`);

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      const stripePaymentId = paymentIntent.id;
      const customerId = paymentIntent.metadata?.order_id || null;

      console.log(`[webhook] Payment succeeded: ${stripePaymentId}`);

      if (!customerId) {
        console.warn('[webhook] No order_id in payment metadata');
        return new Response('No order_id in metadata', { status: 400 });
      }

      // Find order by stripe_payment_id
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_payment_id', stripePaymentId);

      if (fetchError) {
        console.error('[webhook] Database error fetching order:', fetchError.message);
        return new Response('Database error', { status: 500 });
      }

      if (!orders || orders.length === 0) {
        console.warn('[webhook] Order not found for payment:', stripePaymentId);
        return new Response('Order not found', { status: 404 });
      }

      const order = orders[0] as OrderRecord;

      // Check if already processed (idempotency)
      if (order.payment_status === 'paid') {
        console.log('[webhook] Payment already processed:', stripePaymentId);
        return new Response('Already processed', { status: 200 });
      }

      // Update payment status to "paid"
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (updateError) {
        console.error('[webhook] Error updating order status:', updateError.message);
        return new Response('Update failed', { status: 500 });
      }

      console.log(`[webhook] Order ${order.order_number} marked as paid`);

      // Fetch order items for email
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) {
        console.error('[webhook] Error fetching order items:', itemsError.message);
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
        console.log(`[webhook] Confirmation email sent to ${order.customer_email}`);
      } catch (emailError) {
        console.error('[webhook] Email send failed (non-blocking):', emailError);
        // Don't return error - webhook should succeed even if email fails
      }

      return new Response('Payment processed', { status: 200 });
    }

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as any;
      const stripePaymentId = paymentIntent.id;

      console.log(`[webhook] Payment failed: ${stripePaymentId}`);

      // Find order by stripe_payment_id
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_payment_id', stripePaymentId);

      if (fetchError) {
        console.error('[webhook] Database error fetching order:', fetchError.message);
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
          console.error('[webhook] Error updating order status:', updateError.message);
          return new Response('Update failed', { status: 500 });
        }

        console.log(`[webhook] Order ${order.order_number} marked as failed`);
      }

      return new Response('Payment failure processed', { status: 200 });
    }

    // Acknowledge other event types
    console.log(`[webhook] Ignoring event type: ${event.type}`);
    return new Response('Event type not handled', { status: 200 });
  } catch (error) {
    console.error('[webhook] Unexpected error:', error instanceof Error ? error.message : String(error));
    return new Response('Internal server error', { status: 500 });
  }
}

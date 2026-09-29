-- Add Mollie payment support to orders table
-- Enables tracking of both Stripe and Mollie payments

-- Add Mollie payment ID column
ALTER TABLE orders ADD COLUMN mollie_payment_id text;

-- Add payment provider tracking (which provider processed this payment)
ALTER TABLE orders ADD COLUMN payment_provider text default 'stripe' 
  check (payment_provider in ('stripe', 'mollie'));

-- Create index for Mollie webhook lookups (same performance as stripe_payment_id)
CREATE INDEX idx_orders_mollie_payment_id ON orders(mollie_payment_id);

-- Add comment for documentation
COMMENT ON COLUMN orders.mollie_payment_id IS 'Mollie payment ID (tr_...) for payment tracking and webhook lookups';
COMMENT ON COLUMN orders.payment_provider IS 'Which payment provider processed this order (stripe or mollie)';

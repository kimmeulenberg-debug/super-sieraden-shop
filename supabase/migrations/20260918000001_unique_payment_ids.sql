-- Eén betaling hoort bij hooguit één order (voorkomt dubbele orders bij gelijktijdige
-- verzoeken met hetzelfde betaal-ID).
create unique index if not exists idx_orders_stripe_payment_id_unique
  on orders(stripe_payment_id) where stripe_payment_id is not null;
create unique index if not exists idx_orders_mollie_payment_id_unique
  on orders(mollie_payment_id) where mollie_payment_id is not null;

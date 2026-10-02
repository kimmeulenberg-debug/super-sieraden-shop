-- Alles wat nog in de Supabase SQL-editor moet draaien, in de juiste volgorde.
-- Eenmalig uitvoeren (het eerste deel is niet herhaalbaar). Plak dit hele bestand in de SQL-editor en klik Run.

-- ===== 20260917000000_add_mollie_support =====
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

-- ===== 20260918000000_add_tikkie_support =====
-- Tikkie als handmatige betaalmethode.
-- De klant plaatst een bestelling zonder online betaling; de shopeigenaar
-- stuurt een Tikkie en markeert de order in /admin als betaald.
--
-- tikkie_confirm_token : geheime, eenmalige code in de link in de klantmail
--                        ("Ik heb betaald"). Wordt nooit via de API teruggegeven.
-- tikkie_confirmed_at  : moment waarop de klant meldt te hebben betaald. Dit is
--                        alleen een melding; payment_status blijft 'pending'
--                        tot de eigenaar de betaling heeft gecontroleerd.

alter table orders drop constraint if exists orders_payment_provider_check;
alter table orders add constraint orders_payment_provider_check
  check (payment_provider in ('stripe', 'mollie', 'tikkie'));

alter table orders add column if not exists tikkie_confirm_token text;
alter table orders add column if not exists tikkie_confirmed_at timestamptz;

create unique index if not exists idx_orders_tikkie_confirm_token
  on orders(tikkie_confirm_token)
  where tikkie_confirm_token is not null;

-- ===== 20260918000001_unique_payment_ids =====
-- Eén betaling hoort bij hooguit één order (voorkomt dubbele orders bij gelijktijdige
-- verzoeken met hetzelfde betaal-ID).
create unique index if not exists idx_orders_stripe_payment_id_unique
  on orders(stripe_payment_id) where stripe_payment_id is not null;
create unique index if not exists idx_orders_mollie_payment_id_unique
  on orders(mollie_payment_id) where mollie_payment_id is not null;

-- ===== 20260918000002_product_images_bucket =====
-- Publieke opslagbucket voor productafbeeldingen (upload via /admin/products).
-- Uploaden gebeurt server-side met de service role key; lezen is publiek zodat
-- de webshop de afbeeldingen kan tonen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

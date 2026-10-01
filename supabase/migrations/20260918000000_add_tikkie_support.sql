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

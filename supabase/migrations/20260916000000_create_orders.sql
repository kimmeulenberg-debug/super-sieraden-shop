-- Order Management System: orders + order_items
--
-- Dit project gebruikt geen Alembic (Python-only); het Supabase-equivalent
-- voor versiebeheerde schemawijzigingen is een SQL-migratiebestand zoals dit.
-- Voer dit bestand uit via de Supabase SQL editor, of via de Supabase CLI:
--   supabase db push
-- Wijzig het schema NOOIT handmatig in de dashboard-tabeleditor buiten deze
-- migratiebestanden om, zodat de historie reproduceerbaar blijft.

create extension if not exists pgcrypto;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  customer_city text,
  customer_postcode text,
  customer_country text default 'NL',
  subtotal decimal(10, 2) not null,
  tax decimal(10, 2) not null,
  shipping_cost decimal(10, 2) default 0,
  total decimal(10, 2) not null,
  shipping_method text default 'standard',
  status text default 'pending' check (status in ('pending', 'shipped', 'delivered', 'cancelled')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_id text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  product_price decimal(10, 2) not null,
  quantity int not null,
  total decimal(10, 2) not null,
  created_at timestamp default now()
);

create index if not exists idx_orders_email on orders(customer_email);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created on orders(created_at);
create index if not exists idx_order_items_order_id on order_items(order_id);

-- Row Level Security: standaard alles dichtzetten. De applicatie benadert
-- deze tabellen uitsluitend server-side met de service_role key (die RLS
-- omzeilt), dus er zijn nu geen client-side policies nodig. Zodra er een
-- ingelogde klant- of adminrol bijkomt, hier expliciete policies toevoegen
-- in plaats van RLS uit te schakelen.
alter table orders enable row level security;
alter table order_items enable row level security;

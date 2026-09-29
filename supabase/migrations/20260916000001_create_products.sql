-- Product Management: products table
--
-- Zie de opmerking in 20260916000000_create_orders.sql: dit project heeft geen
-- Alembic (Python-only); dit SQL-migratiebestand is het Supabase-equivalent.
-- Voer dit uit via de Supabase SQL editor, of via de Supabase CLI:
--   supabase db push
-- Wijzig het schema NOOIT handmatig in de dashboard-tabeleditor buiten deze
-- migratiebestanden om, zodat de historie reproduceerbaar blijft.

create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price decimal(10, 2) not null,
  category text default 'sieraden',
  image_url text,
  sku text unique,
  stock_quantity int default 0,
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_products_active on products(is_active);
create index if not exists idx_products_category on products(category);

-- Row Level Security: standaard alles dichtzetten, net als bij orders/order_items.
-- De applicatie benadert deze tabel uitsluitend server-side met de service_role
-- key (die RLS omzeilt). Zodra klanten of admins rechtstreeks (client-side) via
-- Supabase gaan lezen, hier expliciete policies toevoegen in plaats van RLS
-- uit te schakelen.
alter table products enable row level security;

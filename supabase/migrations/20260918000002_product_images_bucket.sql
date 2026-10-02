-- Publieke opslagbucket voor productafbeeldingen (upload via /admin/products).
-- Uploaden gebeurt server-side met de service role key; lezen is publiek zodat
-- de webshop de afbeeldingen kan tonen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

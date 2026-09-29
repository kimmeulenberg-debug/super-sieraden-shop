-- Seed: migreer de dummy productcatalogus uit src/lib/products.ts naar de
-- nieuwe `products`-tabel.
--
-- Herkomst: de dummy data in src/lib/products.ts kende geen beschrijving,
-- voorraad of SKU. Voor deze migratie zijn de volgende, expliciete keuzes
-- gemaakt (zie ook het rapport van deze taak):
--   - `sku` = de bestaande `handle` (slug) uit de dummy data. De publieke
--     productpagina (/sieraden/[handle]) zoekt voortaan op deze SKU, zodat
--     bestaande URL's blijven werken zonder een aparte "handle"-kolom toe te
--     voegen aan het schema (dat niet in de opgegeven CREATE TABLE zit).
--   - `category` is teruggebracht naar de 5 categorieën uit het admin-formulier
--     (sieraden, armbanden, oorbellen, kettingen, horloges). Categorieën die
--     niet in die lijst voorkwamen (Ringen, Kralen, Enkelbandjes, Bedels)
--     zijn gemapt naar de generieke categorie 'sieraden'.
--   - `stock_quantity` is een placeholder (10) omdat de dummy data geen
--     voorraadgegevens bevatte. Pas dit na de migratie handmatig aan via het
--     admin-paneel indien nodig.
--   - `image_url` verwijst naar de bestaande placeholder-SVG's in
--     /public/products/, totdat er echte Supabase Storage-URL's zijn.
--
-- Idempotent: gebruikt ON CONFLICT (sku) DO NOTHING, dus dit bestand kan
-- veilig meerdere keren worden uitgevoerd zonder duplicaten te creëren.

insert into products (name, description, price, category, image_url, sku, stock_quantity, is_active)
values
  ('Gouden ring fijne band', null, 34.99, 'sieraden', '/products/ring.svg', 'gouden-ring-fijne-band', 10, true),
  ('Parel oorbellen klein', null, 24.99, 'oorbellen', '/products/earring.svg', 'parel-oorbellen-klein', 10, true),
  ('Dunne ketting gouden hartje', null, 29.99, 'kettingen', '/products/necklace.svg', 'dunne-ketting-gouden-hartje', 10, true),
  ('Dubbele armband gouden steentjes', null, 27.99, 'armbanden', '/products/bracelet.svg', 'dubbele-armband-gouden-steentjes', 10, true),
  ('Bangle horloge messing', null, 69.99, 'horloges', '/products/watch.svg', 'bangle-horloge-messing', 10, true),
  ('Kralen armband gekleurd', null, 19.99, 'sieraden', '/products/beads.svg', 'kralen-armband-gekleurd', 10, true),
  ('Basic grote oorringen', null, 22.99, 'oorbellen', '/products/earring.svg', 'basic-grote-oorringen', 10, true),
  ('Initial ring goud', null, 32.99, 'sieraden', '/products/ring.svg', 'initial-ring-goud', 10, true),
  ('Gegraveerde ketting initiaal', null, 39.99, 'kettingen', '/products/necklace.svg', 'gegraveerde-ketting-initiaal', 10, true),
  ('Enkelbandje goud dun', null, 21.99, 'sieraden', '/products/bracelet.svg', 'enkelbandje-goud-dun', 10, true),
  ('Bedel armband hartjes', null, 26.99, 'sieraden', '/products/bracelet.svg', 'bedel-armband-hartjes', 10, true),
  ('Vriendschap armband set', null, 18.99, 'armbanden', '/products/beads.svg', 'vriendschap-armband-set', 10, true),
  ('Statement oorbellen goud', null, 28.99, 'oorbellen', '/products/earring.svg', 'statement-oorbellen-goud', 10, true),
  ('Stapelring set drie', null, 36.99, 'sieraden', '/products/ring.svg', 'stapelring-set-drie', 10, true),
  ('Lange ketting muntje', null, 33.99, 'kettingen', '/products/necklace.svg', 'lange-ketting-muntje', 10, true),
  ('Horloge mesh band zilver', null, 74.99, 'horloges', '/products/watch.svg', 'horloge-mesh-band-zilver', 10, true),
  ('Kralen ketting natuursteen', null, 23.99, 'sieraden', '/products/beads.svg', 'kralen-ketting-natuursteen', 10, true),
  ('Sierlijke ring blad motief', null, 31.99, 'sieraden', '/products/ring.svg', 'sierlijke-ring-blad-motief', 10, true),
  ('Creolen oorbellen fijn', null, 25.99, 'oorbellen', '/products/earring.svg', 'creolen-oorbellen-fijn', 10, true),
  ('Bedel ketting verguld', null, 37.99, 'sieraden', '/products/necklace.svg', 'bedel-ketting-verguld', 10, true),
  ('Enkelbandje kralen zomers', null, 17.99, 'sieraden', '/products/beads.svg', 'enkelbandje-kralen-zomers', 10, true),
  ('Armband gouden schakels', null, 29.99, 'armbanden', '/products/bracelet.svg', 'armband-gouden-schakels', 10, true),
  ('Horloge klassiek goud', null, 79.99, 'horloges', '/products/watch.svg', 'horloge-klassiek-goud', 10, true),
  ('Druppel oorbellen goud', null, 26.99, 'oorbellen', '/products/earring.svg', 'druppel-oorbellen-goud', 10, true)
on conflict (sku) do nothing;

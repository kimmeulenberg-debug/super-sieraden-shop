-- Update producten naar nieuwe categorieen en voeg aanbiedingen toe

-- Update oude categorieen naar nieuwe
UPDATE products SET category = 'ringen' WHERE category = 'sieraden' AND (name LIKE '%ring%' OR sku LIKE '%ring%');
UPDATE products SET category = 'armbandjes' WHERE category = 'armbanden';
UPDATE products SET category = 'aanbiedingen' WHERE category = 'horloges';

-- Voeg nieuwe producten toe voor de lege categorieen
INSERT INTO products (name, description, price, category, image_url, sku, stock_quantity, is_active)
VALUES
  -- Ringen (extra)
  ('Zilveren ring minimalist', null, 28.99, 'ringen', '/products/ring.svg', 'zilveren-ring-minimalist', 10, true),
  ('Ring met steen zilver', null, 42.99, 'ringen', '/products/ring.svg', 'ring-met-steen-zilver', 10, true),
  ('Bubble tea oorbellen', null, 4.00, 'oorbellen', '/products/earring.svg', 'bubble-tea-oorbellen', 10, true),

  -- Aanbiedingen (sale items)
  ('Sale: Gouden armband dun', null, 15.99, 'aanbiedingen', '/products/bracelet.svg', 'sale-gouden-armband-dun', 15, true),
  ('Sale: Parel ketting kort', null, 19.99, 'aanbiedingen', '/products/necklace.svg', 'sale-parel-ketting-kort', 12, true),
  ('Sale: Statement ring goud', null, 24.99, 'aanbiedingen', '/products/ring.svg', 'sale-statement-ring-goud', 8, true),
  ('Sale: Creolen zilver', null, 16.99, 'aanbiedingen', '/products/earring.svg', 'sale-creolen-zilver', 20, true),
  ('Sale: Armband set (3 stuks)', null, 29.99, 'aanbiedingen', '/products/bracelet.svg', 'sale-armband-set-3stuks', 5, true)
ON CONFLICT (sku) DO NOTHING;

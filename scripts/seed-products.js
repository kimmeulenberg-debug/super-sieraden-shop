const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && !key.startsWith("#") && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join("=").trim();
  }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn vereist in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedProducts() {
  console.log("🌱 Starting product seeding...\n");

  try {
    // Step 1: Update categories
    console.log("1️⃣  Updating product categories...\n");

    // Update armbanden -> armbandjes
    const { error: armbandenError } = await supabase
      .from("products")
      .update({ category: "armbandjes" })
      .eq("category", "armbanden");

    if (armbandenError) {
      console.error("   ❌ Error updating armbanden->armbandjes:", armbandenError.message);
    } else {
      console.log("   ✅ Updated armbanden → armbandjes");
    }

    // Update horloges -> aanbiedingen
    const { error: urenError } = await supabase
      .from("products")
      .update({ category: "aanbiedingen" })
      .eq("category", "horloges");

    if (urenError) {
      console.error("   ❌ Error updating horloges->aanbiedingen:", urenError.message);
    } else {
      console.log("   ✅ Updated horloges → aanbiedingen");
    }

    // Update sieraden -> ringen (voor items met 'ring' in de naam)
    const { data: ringsToUpdate, error: ringsSelectError } = await supabase
      .from("products")
      .select("id")
      .eq("category", "sieraden")
      .ilike("name", "%ring%");

    if (ringsSelectError) {
      console.error("   ❌ Error selecting rings:", ringsSelectError.message);
    } else if (ringsToUpdate && ringsToUpdate.length > 0) {
      const { error: ringsUpdateError } = await supabase
        .from("products")
        .update({ category: "ringen" })
        .in(
          "id",
          ringsToUpdate.map((r) => r.id)
        );

      if (ringsUpdateError) {
        console.error("   ❌ Error updating sieraden->ringen:", ringsUpdateError.message);
      } else {
        console.log(`   ✅ Updated ${ringsToUpdate.length} sieraden → ringen`);
      }
    }

    console.log("");

    // Step 2: Insert new products
    console.log("2️⃣  Adding new products...\n");

    const newProducts = [
      {
        name: "Zilveren ring minimalist",
        price: 28.99,
        category: "ringen",
        sku: "zilveren-ring-minimalist",
        image_url: "/products/ring.svg",
      },
      {
        name: "Ring met steen zilver",
        price: 42.99,
        category: "ringen",
        sku: "ring-met-steen-zilver",
        image_url: "/products/ring.svg",
      },
      {
        name: "Bubble tea oorbellen",
        price: 4.0,
        category: "oorbellen",
        sku: "bubble-tea-oorbellen",
        image_url: "/products/earring.svg",
      },
      {
        name: "Sale: Gouden armband dun",
        price: 15.99,
        category: "aanbiedingen",
        sku: "sale-gouden-armband-dun",
        image_url: "/products/bracelet.svg",
      },
      {
        name: "Sale: Parel ketting kort",
        price: 19.99,
        category: "aanbiedingen",
        sku: "sale-parel-ketting-kort",
        image_url: "/products/necklace.svg",
      },
      {
        name: "Sale: Statement ring goud",
        price: 24.99,
        category: "aanbiedingen",
        sku: "sale-statement-ring-goud",
        image_url: "/products/ring.svg",
      },
      {
        name: "Sale: Creolen zilver",
        price: 16.99,
        category: "aanbiedingen",
        sku: "sale-creolen-zilver",
        image_url: "/products/earring.svg",
      },
      {
        name: "Sale: Armband set (3 stuks)",
        price: 29.99,
        category: "aanbiedingen",
        sku: "sale-armband-set-3stuks",
        image_url: "/products/bracelet.svg",
      },
    ];

    const productsToInsert = newProducts.map((p) => ({
      ...p,
      description: null,
      stock_quantity: 10,
      is_active: true,
    }));

    const { data, error: insertError } = await supabase
      .from("products")
      .insert(productsToInsert)
      .select();

    if (insertError) {
      if (insertError.message.includes("duplicate key")) {
        console.log("   ⚠️  Some products already exist (skipped duplicates)");
      } else {
        console.error("   ❌ Error inserting products:", insertError.message);
      }
    } else {
      const count = data?.length || 0;
      console.log(`   ✅ Added ${count} new product${count !== 1 ? "s" : ""}\n`);
      if (data) {
        data.forEach((p) => {
          console.log(`      • ${p.name} (${p.category}) — €${p.price.toFixed(2)}`);
        });
      }
    }

    console.log("\n✨ Seeding completed successfully!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

seedProducts();

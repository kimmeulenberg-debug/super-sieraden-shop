import { NextResponse } from "next/server";
import {
  deactivateProduct,
  getProductById,
  productUpdateSchema,
  updateProduct,
  ProductServiceError,
} from "@/lib/products-db";

/**
 * GET/PATCH/DELETE voor een enkel product. Routes zijn thin: valideren,
 * delegeren naar src/lib/products-db.ts, resultaat teruggeven.
 *
 * Let op: momenteel geen authenticatie/autorisatie. Voeg vóór productiegebruik
 * RBAC toe op deze specifieke route (bv. alleen voor de rol "admin").
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/products/:id] Onverwachte fout bij ophalen product:", error);
    return NextResponse.json({ error: "Product kon niet worden opgehaald." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ongeldige productgegevens.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const product = await updateProduct(id, parsed.data);

    if (!product) {
      return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/products/:id] Onverwachte fout bij bijwerken product:", error);
    return NextResponse.json({ error: "Product kon niet worden bijgewerkt." }, { status: 500 });
  }
}

/**
 * Verwijdert een product zacht (is_active = false) in plaats van de rij hard
 * te verwijderen, zodat bestellingshistorie die naar dit product verwijst
 * intact blijft. Zie src/lib/products-db.ts::deactivateProduct.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const deactivated = await deactivateProduct(id);

    if (!deactivated) {
      return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/products/:id] Onverwachte fout bij verwijderen product:", error);
    return NextResponse.json({ error: "Product kon niet worden verwijderd." }, { status: 500 });
  }
}

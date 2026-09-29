import { NextResponse } from "next/server";
import {
  createProduct,
  listProducts,
  productFormSchema,
  ProductServiceError,
} from "@/lib/products-db";

/**
 * Route is thin: valideert de aanvraag, delegeert naar src/lib/products-db.ts
 * en geeft het resultaat terug. Geen business logic hier.
 */

const DEFAULT_PAGE_SIZE = 20;

/**
 * Let op: deze route heeft momenteel geen authenticatie/autorisatie (RBAC).
 * Zolang /admin niet met een wachtwoord of login is beveiligd, is deze lijst
 * (incl. inactieve producten) publiek bereikbaar. Voeg vóór productiegebruik
 * RBAC toe op deze specifieke route (niet op routerniveau).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category") ?? undefined;

  const activeParam = searchParams.get("active");
  const isActive =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const search = searchParams.get("search") ?? undefined;

  const page = Math.max(Number.parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE, 1),
    100
  );

  try {
    const result = await listProducts({ category, isActive, search, page, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/products] Onverwachte fout bij ophalen producten:", error);
    return NextResponse.json({ error: "Producten konden niet worden opgehaald." }, { status: 500 });
  }
}

/**
 * Let op: deze route heeft momenteel geen authenticatie/autorisatie (RBAC).
 * Voeg vóór productiegebruik RBAC toe op deze specifieke route (bv. alleen
 * voor de rol "admin"), zodat niet iedereen die de URL kent producten kan
 * aanmaken.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const parsed = productFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ongeldige productgegevens.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const product = await createProduct(parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/products] Onverwachte fout bij aanmaken product:", error);
    return NextResponse.json({ error: "Het product kon niet worden opgeslagen." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Beveiligt het beheerdeel met HTTP Basic Auth (wachtwoord uit ADMIN_PASSWORD;
 * de gebruikersnaam maakt niet uit). Beschermd:
 *  - alle pagina's onder /admin
 *  - de orderlijst (GET /api/orders) met klantgegevens
 *  - het wijzigen van orders (PATCH /api/orders/:id), o.a. "markeer als betaald"
 *  - het wijzigen van producten (alles behalve GET onder /api/products)
 * Zonder ADMIN_PASSWORD blijven deze routes dicht (fail closed).
 */

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function isProtected(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const isRead = method === "GET" || method === "HEAD";

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/api/orders") return isRead;
  if (pathname.startsWith("/api/orders/")) return method === "PATCH" || method === "PUT" || method === "DELETE";
  if (pathname === "/api/products" || pathname.startsWith("/api/products/")) return !isRead;
  return false;
}

export function proxy(request: NextRequest) {
  if (!isProtected(request)) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Beheer is niet beschikbaar: ADMIN_PASSWORD is niet ingesteld.", { status: 503 });
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (safeEqual(supplied, password)) return NextResponse.next();
    } catch {
      // ongeldige base64: behandelen als niet ingelogd
    }
  }

  return new NextResponse("Inloggen vereist.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Super Sieraden Shop beheer", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/orders/:path*", "/api/orders", "/api/products/:path*", "/api/products"],
};

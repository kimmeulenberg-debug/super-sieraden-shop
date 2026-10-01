import { NextResponse } from "next/server";
import { confirmTikkieByToken, OrderServiceError } from "@/lib/orders";
import { sendTikkieClaimedPaidEmail } from "@/lib/tikkie-email";
import { getSiteUrl } from "@/lib/site-url";

/** De klant meldt via de link in de mail dat de Tikkie is betaald (zet géén betaalstatus). */
export async function POST(request: Request) {
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (typeof token !== "string" || !/^[0-9a-f]{48}$/.test(token)) {
    return NextResponse.json({ error: "Ongeldige link." }, { status: 400 });
  }

  try {
    const result = await confirmTikkieByToken(token);
    if (!result) {
      return NextResponse.json({ error: "Deze link is ongeldig of verlopen." }, { status: 404 });
    }

    if (!result.alreadyConfirmed) {
      await sendTikkieClaimedPaidEmail({ order: result.order, siteUrl: getSiteUrl(request) }).catch((emailError) =>
        console.error("[api/tikkie/confirm] Mail naar eigenaar mislukt:", emailError)
      );
    }

    return NextResponse.json({
      success: true,
      orderNumber: result.order.order_number,
      alreadyPaid: result.order.payment_status === "paid",
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/tikkie/confirm] Onverwachte fout:", error);
    return NextResponse.json({ error: "Bevestigen is mislukt." }, { status: 500 });
  }
}

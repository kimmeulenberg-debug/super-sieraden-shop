import { escapeHtml, sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/checkout";
import type { OrderItemRecord, OrderRecord } from "@/lib/orders";

/**
 * Mails voor het Tikkie-betaalproces:
 *  1. klant: bestelling ontvangen + knop "Ik heb de Tikkie betaald"
 *  2. eigenaar: nieuwe Tikkie-bestelling (met alles wat je voor de Tikkie nodig hebt)
 *  3. eigenaar: klant meldt dat de Tikkie is betaald
 *  4. klant: betaling ontvangen (na "Markeer als betaald" in /admin)
 */

const DEFAULT_ADMIN_EMAIL = "supersieradenshop@gmail.com";
const SHOP_NAME = "supersieradenshop";

function adminEmail(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_EMAIL;
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#f5f5f0;padding:24px;text-align:center;border-radius:8px;margin-bottom:24px;">
<div style="font-size:22px;font-weight:600;color:#C9A961;">Super Sieraden Shop</div>
<div style="font-size:20px;font-weight:600;margin-top:8px;">${escapeHtml(title)}</div>
</div>${body}
<p style="border-top:1px solid #eee;margin-top:32px;padding-top:16px;font-size:12px;color:#888;text-align:center;">Super Sieraden Shop</p>
</body></html>`;
}

function itemsTable(items: OrderItemRecord[]): string {
  const rows = items
    .map(
      (item) => `<tr>
<td style="padding:8px;border-bottom:1px solid #f0f0f0;">${escapeHtml(item.product_name)}</td>
<td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
<td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(item.total)}</td></tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;">
<thead><tr><th style="text-align:left;padding:8px;background:#f5f5f0;">Product</th>
<th style="padding:8px;background:#f5f5f0;">Aantal</th>
<th style="text-align:right;padding:8px;background:#f5f5f0;">Totaal</th></tr></thead>
<tbody>${rows}</tbody></table>`;
}

function totalsBlock(order: OrderRecord): string {
  const shipping = order.shipping_cost === 0 ? "Gratis" : formatPrice(order.shipping_cost);
  return `<p style="text-align:right;margin:4px 0;color:#666;">Verzending: ${shipping}</p>
<p style="text-align:right;margin:4px 0;color:#666;">Waarvan btw (21%): ${formatPrice(order.tax)}</p>
<p style="text-align:right;margin:8px 0;font-size:18px;font-weight:700;">Totaal: ${formatPrice(order.total)}</p>`;
}

function button(href: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#C9A961;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">${escapeHtml(label)}</a></p>`;
}

function buildOwnerOrderEmail(order: OrderRecord, items: OrderItemRecord[], siteUrl: string) {
  const adminUrl = `${siteUrl}/admin/orders/${order.id}`;
  return {
    to: adminEmail(),
    subject: `Nieuwe Tikkie-bestelling ${order.order_number} - ${formatPrice(order.total)}`,
    replyTo: order.customer_email,
    html: layout(
      "Nieuwe Tikkie-bestelling",
      `<p>Er is een nieuwe bestelling die je met een Tikkie moet laten betalen.</p>
<div style="background:#f9f9f9;padding:14px;border-radius:6px;margin:16px 0;">
<strong>Voor je Tikkie</strong><br>
Bedrag: <strong>${formatPrice(order.total)}</strong><br>
Omschrijving: <strong>Super Sieraden Shop ${escapeHtml(order.order_number)}</strong><br>
Naam: ${escapeHtml(order.customer_name)}<br>
Telefoon: <strong>${order.customer_phone ? escapeHtml(order.customer_phone) : "-"}</strong><br>
E-mail: ${escapeHtml(order.customer_email)}
</div>
<p><strong>Verzendadres</strong><br>${escapeHtml(order.customer_address ?? "")}<br>${escapeHtml(order.customer_postcode ?? "")} ${escapeHtml(order.customer_city ?? "")}<br>${escapeHtml(order.customer_country)}</p>
${itemsTable(items)}${totalsBlock(order)}
<p>Als je de betaling hebt ontvangen: open de bestelling en klik op "Markeer als betaald".</p>
${button(adminUrl, "Bestelling openen")}`
    ),
  };
}

/** Stuurt alleen de melding naar de eigenaar (bv. opnieuw vanuit /admin). Geeft terug of de mail is verzonden. */
export async function sendTikkieOwnerNotification(params: {
  order: OrderRecord;
  items: OrderItemRecord[];
  siteUrl: string;
}): Promise<boolean> {
  return sendEmail(buildOwnerOrderEmail(params.order, params.items, params.siteUrl));
}

export async function sendTikkieOrderEmails(params: {
  order: OrderRecord;
  items: OrderItemRecord[];
  siteUrl: string;
}): Promise<void> {
  const { order, items, siteUrl } = params;
  const confirmUrl = `${siteUrl}/tikkie/bevestigen/${order.tikkie_confirm_token}`;

  const customerHtml = layout(
    `Bestelling ${order.order_number} ontvangen`,
    `<p>Hoi ${escapeHtml(order.customer_name)},</p>
<p>Bedankt voor je bestelling! Je hebt gekozen om te betalen met een <strong>Tikkie</strong>.</p>
<div style="background:#fff8e6;border-left:4px solid #C9A961;padding:14px;border-radius:6px;margin:16px 0;">
<strong>Wat gebeurt er nu?</strong><br>
We sturen je zo snel mogelijk een Tikkie van <strong>${formatPrice(order.total)}</strong> van ${SHOP_NAME}
(naar ${order.customer_phone ? `je telefoonnummer ${escapeHtml(order.customer_phone)}` : "je e-mailadres"}).
Zodra we je betaling hebben ontvangen, verzenden we je bestelling.
</div>
${itemsTable(items)}${totalsBlock(order)}
<p>Heb je de Tikkie al betaald? Laat het ons weten, dan controleren we je betaling sneller:</p>
${button(confirmUrl, "Ik heb de Tikkie betaald")}
<p style="font-size:13px;color:#777;">Let op: deze knop is een melding aan ons. Je bestelling wordt pas verzonden nadat we de betaling zelf hebben gecontroleerd.</p>`
  );

  await Promise.all([
    sendEmail({
      to: order.customer_email,
      subject: `Bestelling ${order.order_number} ontvangen - betaling via Tikkie`,
      html: customerHtml,
      replyTo: adminEmail(),
    }),
    sendTikkieOwnerNotification({ order, items, siteUrl }),
  ]);
}

export async function sendTikkieClaimedPaidEmail(params: {
  order: OrderRecord;
  siteUrl: string;
}): Promise<void> {
  const { order, siteUrl } = params;
  const html = layout(
    "Klant meldt: Tikkie betaald",
    `<p>${escapeHtml(order.customer_name)} meldt dat de Tikkie voor bestelling <strong>${escapeHtml(order.order_number)}</strong> (${formatPrice(order.total)}) is betaald.</p>
<p>Controleer of het bedrag is binnengekomen in je bank- of Tikkie-app en markeer de bestelling daarna als betaald.</p>
${button(`${siteUrl}/admin/orders/${order.id}`, "Bestelling openen")}`
  );
  await sendEmail({
    to: adminEmail(),
    subject: `Tikkie betaald gemeld: ${order.order_number}`,
    html,
    replyTo: order.customer_email,
  });
}

export async function sendTikkiePaidEmail(params: { order: OrderRecord }): Promise<void> {
  const { order } = params;
  const html = layout(
    "Betaling ontvangen",
    `<p>Hoi ${escapeHtml(order.customer_name)},</p>
<p>We hebben je betaling van <strong>${formatPrice(order.total)}</strong> voor bestelling <strong>${escapeHtml(order.order_number)}</strong> ontvangen. Bedankt!</p>
<p>We maken je bestelling nu klaar voor verzending.</p>`
  );
  await sendEmail({
    to: order.customer_email,
    subject: `Betaling ontvangen voor bestelling ${order.order_number}`,
    html,
    replyTo: adminEmail(),
  });
}

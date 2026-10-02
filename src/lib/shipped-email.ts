import { sendEmail, escapeHtml } from "@/lib/email";
import { estimatedDeliveryDate } from "@/lib/checkout";
import { adminEmail, itemsTable, layout } from "@/lib/tikkie-email";
import type { OrderItemRecord, OrderRecord } from "@/lib/orders";

/** Mail aan de klant zodra de bestelling de status "verzonden" krijgt. Geeft terug of de mail is verzonden. */
export async function sendOrderShippedEmail(params: {
  order: OrderRecord;
  items: OrderItemRecord[];
}): Promise<boolean> {
  const { order, items } = params;

  const html = layout(
    "Je bestelling is onderweg",
    `<p>Hoi ${escapeHtml(order.customer_name)},</p>
<p>Goed nieuws: je bestelling <strong>${escapeHtml(order.order_number)}</strong> is verzonden!</p>
<div style="background:#e8f4f8;border-left:4px solid #0ea5e9;padding:14px;border-radius:6px;margin:16px 0;">
<strong>Verwachte levering:</strong> ${escapeHtml(estimatedDeliveryDate(order.shipping_method))}<br>
<strong>Bezorgadres:</strong> ${escapeHtml(order.customer_address ?? "")}, ${escapeHtml(order.customer_postcode ?? "")} ${escapeHtml(order.customer_city ?? "")}, ${escapeHtml(order.customer_country)}
</div>
${itemsTable(items)}
<p>Vragen over je bestelling? Reageer gewoon op deze e-mail, dan helpen we je graag.</p>`
  );

  return sendEmail({
    to: order.customer_email,
    subject: `Je bestelling ${order.order_number} is verzonden`,
    html,
    replyTo: adminEmail(),
  });
}

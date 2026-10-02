import { OrderRecord } from './orders';

export interface OrderItemForEmail {
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
}

export async function sendOrderConfirmation(
  order: OrderRecord,
  items: OrderItemForEmail[]
): Promise<void> {
  try {
    const html = generateOrderConfirmationHTML(order, items);

    // Log for development (can replace with Resend/SendGrid later)
    console.log(`[EMAIL] Order confirmation sent to ${order.customer_email}`);
    console.log(`[EMAIL] Order ${order.order_number} - Total: €${order.total.toFixed(2)}`);

    // TODO: Implement actual email sending
    // Option 1: Resend (recommended for startups)
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     from: 'orders@supersieraden.shop',
    //     to: order.customer_email,
    //     subject: `Bestellingbevestiging - ${order.order_number}`,
    //     html: html,
    //   }),
    // });
    // if (!response.ok) throw new Error('Email send failed');

    // Option 2: SendGrid
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({...});
  } catch (error) {
    console.error('[EMAIL] Failed to send order confirmation:', error);
    // Don't throw - webhook should not fail if email fails
  }
}

function generateOrderConfirmationHTML(
  order: OrderRecord,
  items: OrderItemForEmail[]
): string {
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 5); // 5 business days estimate

  const itemsHTML = items
    .map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
          ${item.product_name}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">
          €${item.product_price.toFixed(2)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">
          €${item.total.toFixed(2)}
        </td>
      </tr>
    `)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #f5f5f0 0%, #fff 100%);
            padding: 30px;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 600;
            color: #C9A961;
            margin-bottom: 10px;
          }
          .order-number {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
          }
          .order-date {
            color: #666;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #C9A961;
          }
          .customer-info {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            font-size: 14px;
            line-height: 1.8;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th {
            text-align: left;
            padding: 12px;
            background: #f5f5f0;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
          }
          .totals {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .total-row.final {
            border-bottom: none;
            border-top: 2px solid #C9A961;
            padding-top: 12px;
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
          .shipping-info {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #0ea5e9;
          }
          .cta-button {
            display: inline-block;
            background: #C9A961;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 15px;
            font-weight: 600;
          }
          .footer {
            border-top: 1px solid #eee;
            margin-top: 30px;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .footer a {
            color: #C9A961;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">✨ Super Sieraden Shop</div>
          <div class="order-number">${order.order_number}</div>
          <div class="order-date">Bedankt voor je aankoop!</div>
        </div>

        <div class="section">
          <div class="section-title">Klantgegevens</div>
          <div class="customer-info">
            <strong>${order.customer_name}</strong><br>
            ${order.customer_email}<br>
            ${order.customer_phone ? `${order.customer_phone}<br>` : ''}
            <br>
            <strong>Verzendadres:</strong><br>
            ${order.customer_address || 'Niet opgegeven'}<br>
            ${order.customer_postcode || ''} ${order.customer_city || ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Bestellingsgegevens</div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Hoeveelheid</th>
                <th style="text-align: right;">Prijs</th>
                <th style="text-align: right;">Totaal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotaal</span>
              <span>€${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Verzendkosten (${order.shipping_method})</span>
              <span>€${order.shipping_cost.toFixed(2)}</span>
            </div>
            <div class="total-row final">
              <span>Totale bedrag (incl. btw)</span>
              <span>€${order.total.toFixed(2)}</span>
            </div>
            <div class="total-row" style="border-bottom:none;color:#666;font-size:13px;">
              <span>Waarvan btw (21%)</span>
              <span>€${order.tax.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="shipping-info">
            <strong>📦 Verzending</strong><br>
            Je bestelling wordt binnenkort verzonden. Verwachte bezorgdatum: <strong>${deliveryDate.toLocaleDateString('nl-NL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</strong><br>
            Je ontvangt een trackingcode per e-mail zodra je bestelling onderweg is.
          </div>
        </div>

        <div class="section">
          <div class="section-title">Vragen?</div>
          <p>
            Heb je vragen over je bestelling? Stuur ons een mailtje naar
            <a href="mailto:support@supersieraden.shop">support@supersieraden.shop</a><br>
            We helpen je graag!
          </p>
          <p style="font-size: 12px; color: #999;">
            <strong>Retourbeleid:</strong> Je kunt je sieraden binnen 30 dagen retourneren
            voor een volledige terugbetaling, als ze ongedragen zijn.
          </p>
        </div>

        <div class="footer">
          <p>
            Super Sieraden Shop |
            <a href="#">Retourbeleid</a> |
            <a href="#">Privacy</a> |
            <a href="#">Contactgegevens</a>
          </p>
          <p>© 2026 Super Sieraden Shop. Alle rechten voorbehouden.</p>
        </div>
      </body>
    </html>
  `;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Verstuurt een e-mail via Resend (RESEND_API_KEY). Zonder API-key wordt de
 * mail alleen gelogd, zodat lokaal ontwikkelen zonder mailaccount blijft werken.
 * Gooit nooit: mailfouten mogen een bestelling niet laten mislukken.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Super Sieraden Shop <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[EMAIL] (RESEND_API_KEY ontbreekt, niet verzonden) aan ${params.to}: ${params.subject}`);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      console.error(`[EMAIL] Resend gaf ${response.status} voor "${params.subject}":`, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[EMAIL] Versturen mislukt:', error);
    return false;
  }
}

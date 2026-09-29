// Mollie Payment Integration
// Handles iDEAL + WERO payment processing via Mollie API
// Requires MOLLIE_API_KEY env variable (live or test)

let mollieClient: any = null;

export function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY;

  if (!apiKey) {
    return null;
  }

  // Lazy initialization - only create client once
  if (!mollieClient) {
    // Mollie API uses simple fetch-based client
    // We'll create a minimal wrapper that handles the API calls
    mollieClient = {
      apiKey,
      baseUrl: 'https://api.mollie.com/v2',

      async request(method: string, path: string, data?: any) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Mollie API error: ${error.detail || error.message}`);
        }

        return response.json();
      },

      async createPayment(data: any) {
        return this.request('POST', '/payments', data);
      },

      async getPayment(paymentId: string) {
        return this.request('GET', `/payments/${paymentId}`);
      },
    };
  }

  return mollieClient;
}

export interface MolliePaymentOptions {
  amount: number; // in cents
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  method?: 'ideal' | 'wero';
}

export async function createMolliePayment(options: MolliePaymentOptions) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie API key not configured');
  }

  const amountValue = (options.amount / 100).toFixed(2);

  const payment = await client.createPayment({
    amount: {
      value: amountValue,
      currency: 'EUR',
    },
    description: options.description,
    redirectUrl: options.redirectUrl,
    webhookUrl: options.webhookUrl,
    metadata: {
      order_id: options.orderId,
    },
    locale: 'nl_NL',
    method: options.method || 'ideal',
    billingEmail: options.customerEmail,
  });

  return payment;
}

export async function getMolliePayment(paymentId: string) {
  const client = getMollieClient();
  if (!client) {
    throw new Error('Mollie API key not configured');
  }

  return client.getPayment(paymentId);
}

export function isMolliePaymentPaid(payment: any): boolean {
  return payment?.status === 'paid';
}

export function isMolliePaymentFailed(payment: any): boolean {
  return payment?.status === 'failed' || payment?.status === 'cancelled' || payment?.status === 'expired';
}

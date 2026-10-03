import { z } from "zod";
import { vatIncludedIn } from "@/store/store";

/**
 * Gedeelde checkout-logica tussen client (checkout-formulier) en server
 * (API routes). Bedragen worden hier als bron van waarheid berekend zodat
 * de server nooit een door de client aangeleverd totaalbedrag hoeft te
 * vertrouwen (voorkomt manipulatie van de prijs vóór het aanmaken van de
 * Stripe PaymentIntent).
 */

export interface ShippingOption {
  id: "standard" | "express";
  label: string;
  description: string;
  price: number;
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "standard",
    label: "Standaard verzending",
    description: "3-5 werkdagen",
    price: 1,
  },
  {
    id: "express",
    label: "Express verzending",
    description: "1-2 werkdagen",
    price: 4.99,
  },
];

export function getShippingOption(id: string): ShippingOption {
  return SHIPPING_OPTIONS.find((option) => option.id === id) ?? SHIPPING_OPTIONS[0];
}

export interface CartItemInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const roundToCents = (amount: number) => Math.round(amount * 100) / 100;

// Alle prijzen zijn inclusief btw: de btw wordt niet bovenop de prijs gerekend,
// maar als aandeel van het totaal getoond (`tax` = btw die in het totaal zit).
// Elk bedrag wordt op hele centen afgerond, zodat scherm, betaalbedrag en
// database altijd exact hetzelfde totaal tonen.
export function computeOrderTotals(
  items: Pick<CartItemInput, "price" | "quantity">[],
  shippingOptionId: string
) {
  const subtotal = roundToCents(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const shipping = getShippingOption(shippingOptionId).price;
  const total = roundToCents(subtotal + shipping);
  const tax = vatIncludedIn(total);
  return { subtotal, tax, shipping, total };
}

// Bestellingen van vóór de overstap naar prijzen inclusief btw hadden de btw
// bovenop het subtotaal; daar klopt subtotaal + verzending niet met het totaal.
export function isLegacyVatOnTop(order: { subtotal: number; shipping_cost: number; total: number }): boolean {
  return Math.abs(order.subtotal + order.shipping_cost - order.total) > 0.01;
}

// Welke betaalmethoden de webshop aanbiedt. Standaard alleen Tikkie. Aanzetten
// van creditcard (stripe) en Mollie: zet NEXT_PUBLIC_PAYMENT_PROVIDERS in Vercel
// op bv. "tikkie,mollie,stripe" en deploy opnieuw.
export const PAYMENT_PROVIDER_IDS = ["tikkie", "stripe", "mollie"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

const configuredProviders = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS ?? "tikkie")
  .split(",")
  .map((value) => value.trim())
  .filter((value): value is PaymentProviderId => (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value));

export const ENABLED_PAYMENT_PROVIDERS: PaymentProviderId[] = PAYMENT_PROVIDER_IDS.filter((id) =>
  configuredProviders.includes(id)
);
if (ENABLED_PAYMENT_PROVIDERS.length === 0) ENABLED_PAYMENT_PROVIDERS.push("tikkie");

export function isPaymentProviderEnabled(id: PaymentProviderId): boolean {
  return ENABLED_PAYMENT_PROVIDERS.includes(id);
}

// Tikkie is alleen beschikbaar tot dit totaalbedrag (incl. btw en verzending).
export const TIKKIE_MAX_TOTAL = 300;

export function formatPrice(price: number) {
  return `€ ${price.toFixed(2).replace(".", ",")}`;
}

// NL postcode: 4 cijfers (niet beginnend met 0) + 2 letters, optioneel spatie.
const NL_POSTAL_CODE_REGEX = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;
// NL telefoonnummer: +31 of 0, gevolgd door 9 cijfers (spaties/streepjes toegestaan).
const NL_PHONE_REGEX = /^(?:\+31|0)[\s-]?[1-9](?:[\s-]?[0-9]){8}$/;

export const COUNTRIES = ["Nederland", "België", "Duitsland"] as const;

export const billingSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht"),
  lastName: z.string().trim().min(1, "Achternaam is verplicht"),
  email: z.string().trim().min(1, "E-mailadres is verplicht").email("Ongeldig e-mailadres"),
  phone: z
    .string()
    .trim()
    .min(1, "Telefoonnummer is verplicht")
    .regex(NL_PHONE_REGEX, "Ongeldig Nederlands telefoonnummer"),
  address: z.string().trim().min(1, "Adres is verplicht"),
  city: z.string().trim().min(1, "Plaats is verplicht"),
  postalCode: z
    .string()
    .trim()
    .min(1, "Postcode is verplicht")
    .regex(NL_POSTAL_CODE_REGEX, "Ongeldige postcode (bijv. 1234 AB)"),
  country: z.string().trim().min(1, "Land is verplicht"),
  shippingOption: z.enum(["standard", "express"]),
  paymentProvider: z.enum(["tikkie", "stripe", "mollie"]),
  molliePaymentMethod: z.enum(["ideal", "wero"]).optional(),
});

export type BillingFormValues = z.infer<typeof billingSchema>;

// Velden van een opgeslagen adres: dezelfde regels als bij het afrekenen.
export const savedAddressSchema = billingSchema
  .pick({ firstName: true, lastName: true, phone: true, address: true, city: true, postalCode: true, country: true })
  .extend({ label: z.string().trim().min(1, "Geef het adres een naam, bv. Thuis").max(40, "Maximaal 40 tekens") });

export type SavedAddressFormValues = z.infer<typeof savedAddressSchema>;

export interface StoredOrder {
  orderId: string;
  createdAt: string;
  items: CartItemInput[];
  billing: BillingFormValues;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  estimatedDeliveryDate: string;
}

export function estimatedDeliveryDate(shippingOptionId: string): string {
  const days = shippingOptionId === "express" ? 2 : 5;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

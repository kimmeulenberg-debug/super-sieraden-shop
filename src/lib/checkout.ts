import { z } from "zod";
import { NL_VAT_RATE } from "@/store/store";

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
    price: 0,
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

export function computeOrderTotals(items: CartItemInput[], shippingOptionId: string) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * NL_VAT_RATE;
  const shipping = getShippingOption(shippingOptionId).price;
  const total = subtotal + tax + shipping;
  return { subtotal, tax, shipping, total };
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

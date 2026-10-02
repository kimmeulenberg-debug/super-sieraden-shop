"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe";
import {
  billingSchema,
  computeOrderTotals,
  formatPrice,
  SHIPPING_OPTIONS,
  TIKKIE_MAX_TOTAL,
  ENABLED_PAYMENT_PROVIDERS,
  isPaymentProviderEnabled,
  type BillingFormValues,
} from "@/lib/checkout";
import { useCartStore, type CartItem } from "@/store/store";
import { useAccountStore } from "@/store/account";
import { useAuthStore } from "@/store/auth";

const PENDING_ORDER_KEY = "supSieradenShop_pendingOrder";
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

interface Totals {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

function OrderSummary({ items, totals }: { items: CartItem[]; totals: Totals }) {
  return (
    <aside className="flex h-fit flex-col gap-4 rounded border border-border-soft bg-card p-6">
      <h2 className="text-lg font-medium text-ink">Besteloverzicht</h2>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-white">
              <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col text-sm">
              <span className="line-clamp-2 font-medium text-ink">{item.name}</span>
              <span className="text-ink-soft">Aantal: {item.quantity}</span>
            </div>
            <span className="shrink-0 text-sm font-semibold text-goud">
              {formatPrice(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 border-t border-border-soft pt-4 text-sm text-ink-soft">
        <div className="flex justify-between">
          <span>Subtotaal</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Verzending</span>
          <span>{totals.shipping === 0 ? "Gratis" : formatPrice(totals.shipping)}</span>
        </div>
        <div className="mt-2 flex justify-between text-base font-semibold text-ink">
          <span>Totaal (incl. btw)</span>
          <span>{formatPrice(totals.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Waarvan btw (21%)</span>
          <span>{formatPrice(totals.tax)}</span>
        </div>
      </div>
    </aside>
  );
}

function AmountSync({ amountInCents }: { amountInCents: number }) {
  const elements = useElements();

  useEffect(() => {
    if (elements && amountInCents > 0) {
      elements.update({ amount: amountInCents });
    }
  }, [elements, amountInCents]);

  return null;
}

interface CheckoutFormProps {
  form: UseFormReturn<BillingFormValues>;
  items: CartItem[];
  totals: Totals;
  finalizeOrder: (paymentIntentId: string, paymentProvider: string) => Promise<void>;
  finalizeMollieOrder: (molliePaymentId: string) => Promise<void>;
  finalizeTikkieOrder: (billing: BillingFormValues) => Promise<void>;
  stripe: Stripe | null;
  elements: StripeElements | null;
}

// Haalt de Stripe-hooks op binnen <Elements>; alleen gebruikt als creditcard is ingeschakeld.
function StripeCheckoutForm(props: Omit<CheckoutFormProps, "stripe" | "elements">) {
  const stripe = useStripe();
  const elements = useElements();
  return <CheckoutForm {...props} stripe={stripe} elements={elements} />;
}

function CheckoutForm({
  form,
  items,
  totals,
  finalizeOrder,
  finalizeMollieOrder,
  finalizeTikkieOrder,
  stripe,
  elements,
}: CheckoutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = form;

  const paymentProvider = watch("paymentProvider");
  const savedAddresses = useAccountStore((state) => state.addresses);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => setClientReady(true), []);

  function applySavedAddress(addressId: string) {
    const saved = savedAddresses.find((a) => a.id === addressId);
    if (!saved) return;
    const options = { shouldValidate: true, shouldDirty: true } as const;
    form.setValue("firstName", saved.firstName, options);
    form.setValue("lastName", saved.lastName, options);
    form.setValue("phone", saved.phone, options);
    form.setValue("address", saved.address, options);
    form.setValue("city", saved.city, options);
    form.setValue("postalCode", saved.postalCode, options);
    form.setValue("country", saved.country, options);
  }
  const tikkieAvailable = totals.total <= TIKKIE_MAX_TOTAL;
  const noPaymentMethodAvailable =
    paymentProvider === "tikkie" &&
    !tikkieAvailable &&
    ENABLED_PAYMENT_PROVIDERS.every((id) => id === "tikkie");
  const stripeNotReady = paymentProvider === "stripe" && (!stripe || !elements);

  async function onSubmit(data: BillingFormValues) {
    setFormError(null);
    setIsSubmitting(true);

    // TIKKIE FLOW: bestelling plaatsen zonder online betaling
    if (data.paymentProvider === "tikkie") {
      if (!tikkieAvailable) {
        setFormError(`Betalen met Tikkie is mogelijk tot ${formatPrice(TIKKIE_MAX_TOTAL)}. Kies een andere betaalmethode.`);
        setIsSubmitting(false);
        return;
      }
      try {
        await finalizeTikkieOrder(data);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Er ging iets mis. Probeer het opnieuw.");
        setIsSubmitting(false);
      }
      return;
    }

    // STRIPE PAYMENT FLOW
    if (data.paymentProvider === "stripe") {
      if (!stripe || !elements) {
        setFormError("Het betaalformulier wordt nog geladen. Probeer het zo opnieuw.");
        setIsSubmitting(false);
        return;
      }

      const { error: elementsError } = await elements.submit();
      if (elementsError) {
        setFormError(elementsError.message ?? "Controleer de betaalgegevens.");
        setIsSubmitting(false);
        return;
      }

      try {
        const checkoutResponse = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
            shippingOption: data.shippingOption,
            paymentProvider: "stripe",
          }),
        });
        const checkoutData = await checkoutResponse.json();

        if (!checkoutResponse.ok || !checkoutData.clientSecret) {
          throw new Error(checkoutData.error ?? "Kon de betaling niet voorbereiden.");
        }

        window.localStorage.setItem(
          PENDING_ORDER_KEY,
          JSON.stringify({ items, billing: data })
        );

        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret: checkoutData.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/checkout`,
          },
          redirect: "if_required",
        });

        if (confirmError) {
          window.localStorage.removeItem(PENDING_ORDER_KEY);
          setFormError(confirmError.message ?? "De betaling is mislukt. Probeer het opnieuw.");
          setIsSubmitting(false);
          return;
        }

        if (paymentIntent?.status === "succeeded") {
          await finalizeOrder(paymentIntent.id, "stripe");
          return;
        }

        setIsSubmitting(false);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Er ging iets mis. Probeer het opnieuw.");
        setIsSubmitting(false);
      }
      return;
    }

    // MOLLIE PAYMENT FLOW
    if (data.paymentProvider === "mollie") {
      try {
        const checkoutResponse = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
            shippingOption: data.shippingOption,
            paymentProvider: "mollie",
            molliePaymentMethod: data.molliePaymentMethod || "ideal",
          }),
        });
        const checkoutData = await checkoutResponse.json();

        if (!checkoutResponse.ok || !checkoutData.mollieCheckoutUrl) {
          throw new Error(checkoutData.error ?? "Kon Mollie betaling niet voorbereiden.");
        }

        // Store order data before redirecting to Mollie
        window.localStorage.setItem(
          PENDING_ORDER_KEY,
          JSON.stringify({ items, billing: data, molliePaymentId: checkoutData.molliePaymentId })
        );

        // Redirect to Mollie checkout
        window.location.href = checkoutData.mollieCheckoutUrl;
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Er ging iets mis. Probeer het opnieuw.");
        setIsSubmitting(false);
      }
      return;
    }

    setFormError("Selecteer een betaalmethode.");
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="billing-heading" className="flex flex-col gap-4">
            <h2 id="billing-heading" className="text-lg font-medium text-ink">
              Factuurgegevens
            </h2>
            {clientReady && isLoggedIn && savedAddresses.length > 0 && (
              <div>
                <label htmlFor="savedAddress" className="text-sm font-medium text-ink">
                  Kies een opgeslagen adres
                </label>
                <select
                  id="savedAddress"
                  defaultValue=""
                  onChange={(event) => applySavedAddress(event.target.value)}
                  className="mt-1 w-full rounded border border-border-soft bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                >
                  <option value="" disabled>
                    Selecteer een adres...
                  </option>
                  {savedAddresses.map((saved) => (
                    <option key={saved.id} value={saved.id}>
                      {saved.label} - {saved.address}, {saved.city}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="text-sm font-medium text-ink">
                  Voornaam
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  {...register("firstName")}
                  className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="text-sm font-medium text-ink">
                  Achternaam
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  {...register("lastName")}
                  className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  E-mailadres
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="text-sm font-medium text-ink">
                  Telefoonnummer
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="06 12345678"
                  {...register("phone")}
                  className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address" className="text-sm font-medium text-ink">
                  Adres
                </label>
                <input
                  id="address"
                  type="text"
                  autoComplete="street-address"
                  {...register("address")}
                  className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="city" className="text-sm font-medium text-ink">
                  Plaats
                </label>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  {...register("city")}
                  className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                />
                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
              </div>
              <div>
                <label htmlFor="postalCode" className="text-sm font-medium text-ink">
                  Postcode
                </label>
                <input
                  id="postalCode"
                  type="text"
                  autoComplete="postal-code"
                  placeholder="1234 AB"
                  {...register("postalCode")}
                  className="mt-1 w-full rounded border border-border-soft px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-xs text-red-600">{errors.postalCode.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="country" className="text-sm font-medium text-ink">
                  Land
                </label>
                <select
                  id="country"
                  autoComplete="country-name"
                  {...register("country")}
                  className="mt-1 w-full rounded border border-border-soft bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 ease-in-out focus:border-goud"
                >
                  <option value="Nederland">Nederland</option>
                  <option value="België">België</option>
                  <option value="Duitsland">Duitsland</option>
                </select>
                {errors.country && (
                  <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="shipping-heading" className="flex flex-col gap-3">
            <h2 id="shipping-heading" className="text-lg font-medium text-ink">
              Verzending
            </h2>
            {SHIPPING_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center justify-between gap-4 rounded border border-border-soft px-4 py-3 transition-colors duration-150 ease-in-out has-[:checked]:border-goud"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    value={option.id}
                    {...register("shippingOption")}
                    className="h-4 w-4 accent-[#c9a961]"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-ink">{option.label}</span>
                    <span className="text-xs text-ink-soft">{option.description}</span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-goud">
                  {option.price === 0 ? "Gratis" : formatPrice(option.price)}
                </span>
              </label>
            ))}
          </section>

          <section aria-labelledby="payment-heading" className="flex flex-col gap-3">
            <h2 id="payment-heading" className="text-lg font-medium text-ink">
              Betaalmethode
            </h2>

            {/* Payment Provider Selector */}
            <div className="flex flex-col gap-2">
              {isPaymentProviderEnabled("tikkie") && (
              <label
                className={clsx(
                  "flex items-center gap-3 rounded border border-border-soft px-4 py-3 transition-colors duration-150 ease-in-out has-[:checked]:border-goud",
                  tikkieAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                )}
              >
                <input
                  type="radio"
                  value="tikkie"
                  disabled={!tikkieAvailable}
                  {...register("paymentProvider")}
                  className="h-4 w-4 accent-[#c9a961]"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-ink">Tikkie</span>
                  <span className="text-xs text-ink-soft">
                    {tikkieAvailable
                      ? "Je ontvangt na je bestelling een Tikkie van ons"
                      : `Alleen beschikbaar tot ${formatPrice(TIKKIE_MAX_TOTAL)}`}
                  </span>
                </span>
              </label>
              )}

              {isPaymentProviderEnabled("stripe") && (

              <label className="flex cursor-pointer items-center gap-3 rounded border border-border-soft px-4 py-3 transition-colors duration-150 ease-in-out has-[:checked]:border-goud">
                <input
                  type="radio"
                  value="stripe"
                  {...register("paymentProvider")}
                  className="h-4 w-4 accent-[#c9a961]"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-ink">Stripe (Kaart / iDEAL)</span>
                  <span className="text-xs text-ink-soft">Betaal veilig met creditcard of iDEAL</span>
                </span>
              </label>
              )}

              {isPaymentProviderEnabled("mollie") && (

              <label className="flex cursor-pointer items-center gap-3 rounded border border-border-soft px-4 py-3 transition-colors duration-150 ease-in-out has-[:checked]:border-goud">
                <input
                  type="radio"
                  value="mollie"
                  {...register("paymentProvider")}
                  className="h-4 w-4 accent-[#c9a961]"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-ink">Mollie (iDEAL / WERO)</span>
                  <span className="text-xs text-ink-soft">Betaal via Mollie (iDEAL of WERO)</span>
                </span>
              </label>
              )}
            </div>

            {/* Tikkie uitleg */}
            {paymentProvider === "tikkie" && (
              <div className="rounded border border-border-soft bg-card p-4 text-sm text-ink-soft">
                <p className="font-medium text-ink">Zo werkt betalen met Tikkie</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Plaats je bestelling; je ontvangt direct een bevestiging per e-mail.</li>
                  <li>
                    We sturen je een Tikkie van {formatPrice(totals.total)} naar het telefoonnummer
                    of e-mailadres dat je hebt opgegeven.
                  </li>
                  <li>Zodra je hebt betaald, verzenden we je bestelling.</li>
                </ol>
              </div>
            )}

            {/* Stripe Payment Element */}
            {paymentProvider === "stripe" && (
              <div className="rounded border border-border-soft p-4">
                <PaymentElement options={{ layout: "tabs" }} />
              </div>
            )}

            {/* Mollie Payment Method Selector */}
            {paymentProvider === "mollie" && (
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-3 rounded border border-border-soft px-4 py-3 transition-colors duration-150 ease-in-out has-[:checked]:border-goud">
                  <input
                    type="radio"
                    value="ideal"
                    {...register("molliePaymentMethod")}
                    className="h-4 w-4 accent-[#c9a961]"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-ink">iDEAL</span>
                    <span className="text-xs text-ink-soft">Betaal direct van je bankrekening</span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded border border-border-soft px-4 py-3 transition-colors duration-150 ease-in-out has-[:checked]:border-goud">
                  <input
                    type="radio"
                    value="wero"
                    {...register("molliePaymentMethod")}
                    className="h-4 w-4 accent-[#c9a961]"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-ink">WERO</span>
                    <span className="text-xs text-ink-soft">Europese instant payment (snel & veilig)</span>
                  </span>
                </label>
              </div>
            )}
          </section>
        </div>

        <OrderSummary items={items} totals={totals} />
      </div>

      {formError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      )}

      {noPaymentMethodAvailable && (
        <p role="alert" className="text-sm font-medium text-red-600">
          Bestellingen boven {formatPrice(TIKKIE_MAX_TOTAL)} zijn momenteel niet mogelijk via de webshop.
          Verwijder een artikel uit je winkelmandje of neem contact met ons op.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || stripeNotReady || noPaymentMethodAvailable}
        className={clsx(
          "flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-goud py-3.5 text-base font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark",
          (isSubmitting || stripeNotReady || noPaymentMethodAvailable) && "cursor-not-allowed opacity-60"
        )}
      >
        {isSubmitting && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {isSubmitting
          ? "Bestelling wordt geplaatst..."
          : paymentProvider === "tikkie"
            ? "Bestelling plaatsen (betalen met Tikkie)"
            : "Bestelling plaatsen"}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1100px] px-6 py-10">
          <p className="text-sm text-ink-soft">Afrekenen wordt geladen...</p>
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const stripeEnabled = isPaymentProviderEnabled("stripe");
  const stripePromise = useMemo(() => (stripeEnabled ? getStripe() : null), [stripeEnabled]);

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Nederland",
      shippingOption: "standard",
      paymentProvider: ENABLED_PAYMENT_PROVIDERS[0],
      molliePaymentMethod: "ideal",
    },
  });

  // Vul standaardadres en e-mailadres van de ingelogde klant vooraf in.
  useEffect(() => {
    const { isLoggedIn, user } = useAuthStore.getState();
    if (!isLoggedIn) return;
    const { addresses } = useAccountStore.getState();
    const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
    form.reset({
      ...form.getValues(),
      ...(user ? { email: user.email } : {}),
      ...(preferred
        ? {
            firstName: preferred.firstName,
            lastName: preferred.lastName,
            phone: preferred.phone,
            address: preferred.address,
            city: preferred.city,
            postalCode: preferred.postalCode,
            country: preferred.country,
          }
        : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shippingOption = form.watch("shippingOption");
  const totals = computeOrderTotals(items, shippingOption);
  const amountInCents = Math.max(Math.round(totals.total * 100), 0);

  // Valt de winkelmand boven het Tikkie-maximum uit, schakel dan over naar een andere ingeschakelde methode.
  const selectedProvider = form.watch("paymentProvider");
  useEffect(() => {
    if (selectedProvider === "tikkie" && totals.total > TIKKIE_MAX_TOTAL) {
      const alternative = ENABLED_PAYMENT_PROVIDERS.find((id) => id !== "tikkie");
      if (alternative) form.setValue("paymentProvider", alternative);
    }
  }, [selectedProvider, totals.total, form]);

  async function finalizeTikkieOrder(billing: BillingFormValues) {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
        billing,
        paymentProvider: "tikkie",
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.orderId) {
      throw new Error(data.error ?? "De bestelling kon niet worden opgeslagen.");
    }

    useAccountStore.getState().addOrder(data.orderId);
    clearCart();
    router.push(`/order-confirmation/${data.orderId}`);
  }

  async function finalizeOrder(paymentIntentId: string, paymentProvider: string) {
    try {
      const pendingRaw = window.localStorage.getItem(PENDING_ORDER_KEY);
      if (!pendingRaw) {
        throw new Error("Bestelgegevens zijn niet meer beschikbaar. Neem contact met ons op.");
      }
      const pending = JSON.parse(pendingRaw) as {
        items: CartItem[];
        billing: BillingFormValues;
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pending.items,
          billing: pending.billing,
          paymentIntentId,
          paymentProvider,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.orderId) {
        throw new Error(data.error ?? "De bestelling kon niet worden opgeslagen.");
      }

      window.localStorage.removeItem(PENDING_ORDER_KEY);
      useAccountStore.getState().addOrder(data.orderId);
      clearCart();
      router.push(`/order-confirmation/${data.orderId}`);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Er ging iets mis.");
      setIsFinalizing(false);
    }
  }

  async function finalizeMollieOrder(molliePaymentId: string) {
    try {
      const pendingRaw = window.localStorage.getItem(PENDING_ORDER_KEY);
      if (!pendingRaw) {
        throw new Error("Bestelgegevens zijn niet meer beschikbaar. Neem contact met ons op.");
      }
      const pending = JSON.parse(pendingRaw) as {
        items: CartItem[];
        billing: BillingFormValues;
        molliePaymentId: string;
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pending.items,
          billing: pending.billing,
          molliePaymentId: pending.molliePaymentId,
          paymentProvider: "mollie",
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.orderId) {
        throw new Error(data.error ?? "De bestelling kon niet worden opgeslagen.");
      }

      window.localStorage.removeItem(PENDING_ORDER_KEY);
      useAccountStore.getState().addOrder(data.orderId);
      clearCart();
      router.push(`/order-confirmation/${data.orderId}`);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Er ging iets mis.");
      setIsFinalizing(false);
    }
  }

  // Handle redirect from Stripe (redirect_status) or Mollie (tr_ payment ID)
  useEffect(() => {
    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntentId = searchParams.get("payment_intent");

    // Check for Stripe redirect
    if (redirectStatus) {
      if (redirectStatus === "succeeded" && paymentIntentId) {
        setIsFinalizing(true);
        void finalizeOrder(paymentIntentId, "stripe");
      } else {
        setGlobalError("De betaling is niet gelukt. Probeer het opnieuw.");
        window.localStorage.removeItem(PENDING_ORDER_KEY);
        router.replace("/checkout");
      }
      return;
    }

    // Check for Mollie redirect (when Mollie redirects back after payment)
    // Mollie returns ?tr_<paymentId> in the URL
    const urlParams = new URLSearchParams(window.location.search);
    let molliePaymentId: string | null = null;

    // Try to find Mollie payment ID (Mollie uses tr_ prefix)
    for (const [key] of urlParams.entries()) {
      if (key.startsWith("tr_")) {
        molliePaymentId = key;
        break;
      }
    }

    if (molliePaymentId) {
      setIsFinalizing(true);
      void finalizeMollieOrder(molliePaymentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stripeEnabled && !STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
        <h1 className="text-2xl font-medium text-ink">Afrekenen</h1>
        <p className="mt-4 text-sm text-red-600">
          Betalen is nog niet geconfigureerd: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ontbreekt.
          Vul een Stripe test-publishable key in <code>.env.local</code> in om deze pagina te
          gebruiken.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-ink-soft underline hover:text-goud">
          &larr; Terug naar de shop
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !isFinalizing) {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
        <h1 className="text-2xl font-medium text-ink">Je winkelmandje is leeg</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Voeg eerst sieraden toe aan je winkelmandje voordat je kunt afrekenen.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded bg-goud px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark"
        >
          Verder winkelen
        </Link>
      </div>
    );
  }

  if (isFinalizing) {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
        <h1 className="text-2xl font-medium text-ink">Bestelling wordt afgerond...</h1>
        {globalError && <p className="mt-4 text-sm text-red-600">{globalError}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <h1 className="text-[28px] font-medium leading-9 text-ink">Afrekenen</h1>
      {globalError && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {globalError}
        </p>
      )}
      <div className="mt-8">
        {stripeEnabled ? (
          <Elements
            stripe={stripePromise}
            options={{ mode: "payment", amount: amountInCents || 100, currency: "eur" }}
          >
            <AmountSync amountInCents={amountInCents} />
            <StripeCheckoutForm form={form} items={items} totals={totals} finalizeOrder={finalizeOrder} finalizeMollieOrder={finalizeMollieOrder} finalizeTikkieOrder={finalizeTikkieOrder} />
          </Elements>
        ) : (
          <CheckoutForm form={form} items={items} totals={totals} finalizeOrder={finalizeOrder} finalizeMollieOrder={finalizeMollieOrder} finalizeTikkieOrder={finalizeTikkieOrder} stripe={null} elements={null} />
        )}
      </div>
    </div>
  );
}

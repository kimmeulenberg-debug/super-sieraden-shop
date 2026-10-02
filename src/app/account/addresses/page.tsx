"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AccountShell from "@/components/account/AccountShell";
import { COUNTRIES, savedAddressSchema, type SavedAddressFormValues } from "@/lib/checkout";
import { useAccountStore, type SavedAddress } from "@/store/account";
import { useToastStore } from "@/store/store";

const EMPTY: SavedAddressFormValues = {
  label: "",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  country: "Nederland",
};

const inputClass = "w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C9A961]";

function AddressForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: SavedAddressFormValues;
  submitLabel: string;
  onSubmit: (values: SavedAddressFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SavedAddressFormValues>({ resolver: zodResolver(savedAddressSchema), defaultValues: initial });

  const field = (name: keyof SavedAddressFormValues, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={`addr-${name}`} className="mb-1 block text-sm font-medium text-gray-900">{label}</label>
      <input id={`addr-${name}`} {...extra} {...register(name)} className={inputClass} />
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-lg border border-[#C9A961] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{field("label", "Naam van dit adres", { placeholder: "Thuis, Werk, ..." })}</div>
        {field("firstName", "Voornaam", { autoComplete: "given-name" })}
        {field("lastName", "Achternaam", { autoComplete: "family-name" })}
        <div className="sm:col-span-2">{field("phone", "Telefoonnummer", { type: "tel", placeholder: "06 12345678" })}</div>
        <div className="sm:col-span-2">{field("address", "Straat en huisnummer", { autoComplete: "street-address" })}</div>
        {field("postalCode", "Postcode", { placeholder: "1234 AB" })}
        {field("city", "Plaats")}
        <div className="sm:col-span-2">
          <label htmlFor="addr-country" className="mb-1 block text-sm font-medium text-gray-900">Land</label>
          <select id="addr-country" {...register("country")} className={`${inputClass} bg-white`}>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="submit" className="rounded bg-[#C9A961] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#B39450]">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50">
          Annuleren
        </button>
      </div>
    </form>
  );
}

function AddressList() {
  const { addresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useAccountStore();
  const showToast = useToastStore((state) => state.showToast);
  const [mode, setMode] = useState<{ kind: "idle" } | { kind: "add" } | { kind: "edit"; address: SavedAddress }>({ kind: "idle" });

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 && mode.kind !== "add" && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-700">
          Je hebt nog geen adressen opgeslagen.
        </p>
      )}

      {addresses.map((address) =>
        mode.kind === "edit" && mode.address.id === address.id ? (
          <AddressForm
            key={address.id}
            initial={address}
            submitLabel="Wijzigingen opslaan"
            onCancel={() => setMode({ kind: "idle" })}
            onSubmit={(values) => {
              updateAddress(address.id, values);
              setMode({ kind: "idle" });
              showToast("Adres bijgewerkt", "success");
            }}
          />
        ) : (
          <div key={address.id} className="rounded-lg border border-gray-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-gray-900">
                {address.label}
                {address.isDefault && (
                  <span className="ml-2 rounded-full bg-[#C9A961]/15 px-2 py-0.5 text-xs font-medium text-[#8a6f2f]">
                    Standaard
                  </span>
                )}
              </p>
            </div>
            <p className="mt-2 text-sm text-gray-700">
              {address.firstName} {address.lastName}
              <br />
              {address.address}
              <br />
              {address.postalCode} {address.city}, {address.country}
              <br />
              {address.phone}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
              <button type="button" onClick={() => setMode({ kind: "edit", address })} className="text-[#C9A961] hover:text-[#B39450]">
                Bewerken
              </button>
              {!address.isDefault && (
                <button type="button" onClick={() => setDefaultAddress(address.id)} className="text-gray-700 hover:text-gray-900">
                  Maak standaard
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Adres "${address.label}" verwijderen?`)) {
                    removeAddress(address.id);
                    showToast("Adres verwijderd", "info");
                  }
                }}
                className="text-red-600 hover:text-red-700"
              >
                Verwijderen
              </button>
            </div>
          </div>
        )
      )}

      {mode.kind === "add" ? (
        <AddressForm
          initial={EMPTY}
          submitLabel="Adres opslaan"
          onCancel={() => setMode({ kind: "idle" })}
          onSubmit={(values) => {
            addAddress(values);
            setMode({ kind: "idle" });
            showToast("Adres opgeslagen", "success");
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMode({ kind: "add" })}
          className="self-start rounded bg-[#C9A961] px-6 py-3 font-medium text-white transition-colors hover:bg-[#B39450]"
        >
          + Adres toevoegen
        </button>
      )}
    </div>
  );
}

export default function AccountAddressesPage() {
  return (
    <AccountShell title="Adressen" description="Sla je verzendadressen op, dan vullen we ze bij het afrekenen automatisch in.">
      <AddressList />
    </AccountShell>
  );
}

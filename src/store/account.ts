import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedAddressFormValues } from "@/lib/checkout";

/**
 * Persoonlijke accountgegevens die alleen in de browser van de klant worden
 * bewaard (localStorage): opgeslagen adressen en de bestellingen die op dit
 * apparaat zijn geplaatst. Er gaat niets naar de server, dus dit kan nooit
 * gegevens van andere klanten lekken. Bij uitloggen wordt alles gewist.
 */
export interface SavedAddress extends SavedAddressFormValues {
  id: string;
  isDefault: boolean;
}

const MAX_REMEMBERED_ORDERS = 20;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

interface AccountState {
  addresses: SavedAddress[];
  orderIds: string[];
  addAddress: (values: SavedAddressFormValues, makeDefault?: boolean) => void;
  updateAddress: (id: string, values: SavedAddressFormValues) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  addOrder: (orderId: string) => void;
  clear: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      addresses: [],
      orderIds: [],
      addAddress: (values, makeDefault = false) =>
        set((state) => {
          const isDefault = makeDefault || state.addresses.length === 0;
          const others = isDefault
            ? state.addresses.map((a) => ({ ...a, isDefault: false }))
            : state.addresses;
          return { addresses: [...others, { ...values, id: newId(), isDefault }] };
        }),
      updateAddress: (id, values) =>
        set((state) => ({
          addresses: state.addresses.map((a) => (a.id === id ? { ...a, ...values } : a)),
        })),
      removeAddress: (id) =>
        set((state) => {
          const remaining = state.addresses.filter((a) => a.id !== id);
          if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return { addresses: remaining };
        }),
      setDefaultAddress: (id) =>
        set((state) => ({
          addresses: state.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
        })),
      addOrder: (orderId) =>
        set((state) => ({
          orderIds: [orderId, ...state.orderIds.filter((id) => id !== orderId)].slice(0, MAX_REMEMBERED_ORDERS),
        })),
      clear: () => set({ addresses: [], orderIds: [] }),
    }),
    { name: "supSieradenShop_account" }
  )
);

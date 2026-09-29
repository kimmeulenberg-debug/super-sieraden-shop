"use client";

import clsx from "clsx";
import { useToastStore } from "@/store/store";

export default function Toast() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-1/2 z-[3000] flex w-full max-w-[320px] -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className={clsx(
            "animate-fade-in cursor-pointer rounded px-4 py-3 text-left text-sm font-medium text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-opacity duration-150 ease-in-out",
            toast.type === "success" && "bg-goud-dark",
            toast.type === "error" && "bg-red-500",
            toast.type === "info" && "bg-ink"
          )}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

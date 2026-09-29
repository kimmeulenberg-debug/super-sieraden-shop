"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

const COOKIE_NAME = "supSieradenShop_acceptCookies";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 jaar

function hasAcceptedCookies(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${COOKIE_NAME}=true`);
}

function acceptCookies() {
  document.cookie = `${COOKIE_NAME}=true; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    setVisible(!hasAcceptedCookies());
  }, []);

  function dismiss(persist: boolean) {
    if (persist) acceptCookies();
    setDismissing(true);
    window.setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookiemelding"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-[1000] flex flex-col gap-4 border-t border-border-soft bg-white px-6 py-4 shadow-[0_-1px_3px_rgba(0,0,0,0.08)] transition-opacity duration-300 ease-out md:flex-row md:items-center md:justify-between",
        dismissing ? "opacity-0" : "animate-slide-up opacity-100"
      )}
    >
      <p className="max-w-3xl text-sm font-normal text-ink">
        Bij Super Sieraden Shop gebruiken we cookies om de gebruikerservaring
        van onze website te analyseren en verbeteren. Om jou de ultieme
        persoonlijkste Super Sieraden Shop ervaring aan te bieden wordt jouw
        websitebezoek verwerkt en geanalyseerd, je kunt je keuzes uitzetten
        via de browser of settings. Lees hier meer over ons{" "}
        <a
          href="/cookiebeleid"
          className="text-ink-soft underline transition-colors duration-150 ease-in-out hover:text-goud"
        >
          cookiebeleid
        </a>
        .
      </p>

      <div className="flex shrink-0 gap-3">
        <button
          type="button"
          onClick={() => dismiss(false)}
          className="cursor-pointer rounded border border-border-soft bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 ease-in-out hover:border-goud"
        >
          Keuzes aanpassen
        </button>
        <button
          type="button"
          onClick={() => dismiss(true)}
          className="cursor-pointer rounded bg-goud px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark"
        >
          Doorgaan
        </button>
      </div>
    </div>
  );
}

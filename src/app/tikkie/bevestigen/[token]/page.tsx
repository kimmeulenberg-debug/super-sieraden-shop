"use client";

import { use, useState } from "react";
import Link from "next/link";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; orderNumber: string; alreadyPaid: boolean }
  | { kind: "error"; message: string };

// De bevestiging gebeurt pas na een klik (POST), zodat mailscanners die de link
// vooraf openen de melding niet per ongeluk activeren.
export default function TikkieConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function confirm() {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/tikkie/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setState({ kind: "error", message: data.error ?? "Bevestigen is mislukt." });
        return;
      }
      setState({ kind: "done", orderNumber: data.orderNumber, alreadyPaid: Boolean(data.alreadyPaid) });
    } catch {
      setState({ kind: "error", message: "Er ging iets mis. Probeer het later opnieuw." });
    }
  }

  return (
    <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
      {state.kind === "done" ? (
        <>
          <h1 className="text-2xl font-medium text-ink">Bedankt!</h1>
          <p className="mt-3 text-sm text-ink-soft">
            {state.alreadyPaid
              ? `We hebben je betaling voor bestelling ${state.orderNumber} al ontvangen.`
              : `We hebben je melding voor bestelling ${state.orderNumber} ontvangen. Zodra we je betaling hebben gecontroleerd, verzenden we je bestelling.`}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded bg-goud px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark"
          >
            Verder winkelen
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-medium text-ink">Heb je de Tikkie betaald?</h1>
          <p className="mt-3 text-sm text-ink-soft">
            Met deze knop laat je ons weten dat je hebt betaald. We controleren de betaling en
            verzenden daarna je bestelling.
          </p>
          {state.kind === "error" && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-600">
              {state.message}
            </p>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={state.kind === "loading"}
            className="mt-6 cursor-pointer rounded bg-goud px-8 py-3.5 text-base font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-goud-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.kind === "loading" ? "Even geduld..." : "Ja, ik heb betaald"}
          </button>
        </>
      )}
    </div>
  );
}

"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="premium-shell grid min-h-[70vh] place-items-center px-4 py-16 text-center">
      <div className="max-w-md rounded-md border border-line bg-paper p-8 shadow-soft">
        <AlertCircle className="mx-auto text-amber" size={38} />
        <h1 className="font-display mt-5 text-4xl text-ink">
          Algo no cargó bien
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Reintentá la carga. Si el problema persiste, volvé a intentarlo en
          unos minutos.
        </p>
        <Button className="mt-6" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}

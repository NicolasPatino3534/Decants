"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="premium-shell grid min-h-[70vh] place-items-center px-4 py-16 text-center">
      <div className="max-w-md rounded-md border border-[#e7dfd2] bg-[#fffdfa] p-8">
        <AlertCircle className="mx-auto text-[#b9965b]" size={38} />
        <h1 className="font-display mt-5 text-4xl text-[#111111]">Algo no cargó bien</h1>
        <p className="mt-3 text-sm leading-6 text-[#6f6658]">
          Reintentá la carga. Si el problema persiste, revisá la conexión con Supabase.
        </p>
        <Button className="mt-6" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}

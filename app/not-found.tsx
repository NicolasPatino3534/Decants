import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="premium-shell grid min-h-[70vh] place-items-center px-4 py-16 text-center">
      <div className="max-w-md rounded-md border border-line bg-paper p-8 shadow-soft">
        <SearchX className="mx-auto text-amber" size={42} />
        <h1 className="font-display mt-5 text-4xl text-ink">
          No encontramos esta página
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Puede que el enlace haya cambiado o que el contenido ya no esté
          disponible.
        </p>
        <ButtonLink href="/catalogo" className="mt-6">
          Ir al catálogo
        </ButtonLink>
      </div>
    </main>
  );
}

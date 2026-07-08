import { Search, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/brand";

export default function NotFoundPage() {
  return (
    <main className="premium-shell mx-auto grid min-h-[70vh] place-items-center px-4 py-16 text-center">
      <div className="max-w-xl rounded-md border border-line bg-white p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[#f6edda] text-[#8a611c]">
          <Search size={22} />
        </div>
        <h1 className="font-display mt-5 text-4xl text-ink">No encontramos esta pagina</h1>
        <p className="mt-3 text-sm leading-6 text-[#6f6658]">
          Podes buscar tu perfume en el catalogo o escribirnos si estabas siguiendo un producto puntual.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/catalogo">
            Buscar en catalogo
          </ButtonLink>
          <ButtonLink href={whatsappUrl("Hola DecantsCBA, no encontre una pagina y quiero consultar.")} variant="secondary">
            <MessageCircle size={17} /> Consultar
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

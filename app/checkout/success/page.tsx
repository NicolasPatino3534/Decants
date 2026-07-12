import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; order?: string; pending?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="premium-shell grid min-h-[65vh] place-items-center px-4 py-16 text-center">
      <div className="max-w-3xl rounded-md border border-line bg-paper p-8 shadow-soft">
        <CheckCircle2 className="mx-auto text-moss" size={54} />
        <h1 className="font-display mt-5 text-4xl text-ink">Pedido confirmado</h1>
        <p className="mt-3 text-muted">
          {params.demo
            ? "Modo demo: el flujo completo quedó validado sin cobrar."
            : params.pending
              ? "Recibimos el pedido. Te vamos a contactar por WhatsApp para coordinar la confirmación."
              : "Recibimos el pedido y te vamos a enviar las novedades del envío."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/cuenta">Ver pedidos</ButtonLink>
          <ButtonLink href="/catalogo" variant="secondary">
            Seguir comprando
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; order?: string; pending?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div>
        <CheckCircle2 className="mx-auto text-moss" size={54} />
        <h1 className="mt-5 text-4xl font-black">Pedido confirmado</h1>
        <p className="mt-3 text-neutral-600">
          {params.demo
            ? "Modo demo: el flujo completo quedó validado sin cobrar."
            : params.pending
              ? "Recibimos el pedido. Te vamos a contactar por WhatsApp para coordinar la confirmación."
              : "Recibimos el pedido y te vamos a enviar las novedades del envío."}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <ButtonLink href="/cuenta">Ver pedidos</ButtonLink>
          <ButtonLink href="/catalogo" variant="secondary">
            Seguir comprando
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

import { AuthForm } from "@/components/auth/auth-form";
import { brand } from "@/lib/brand";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/cuenta";

  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-black">Cuenta {brand.displayName}</h1>
        <p className="mt-3 text-neutral-600">Accedé a pedidos, tracking y datos guardados para comprar más rápido.</p>
      </div>
      <div className="mt-8">
        <AuthForm nextPath={nextPath} />
      </div>
    </main>
  );
}

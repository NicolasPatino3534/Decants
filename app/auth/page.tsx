import { AuthForm } from "@/components/auth/auth-form";
import { brand } from "@/lib/brand";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/cuenta";
  const initialMode = params.mode === "signup" ? "signup" : "login";

  return (
    <main className="premium-shell min-h-[70vh] px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl text-ink">Cuenta {brand.displayName}</h1>
        <p className="mt-3 text-muted">Accedé a pedidos, tracking y datos guardados para comprar más rápido.</p>
      </div>
      <div className="mt-8">
        <AuthForm initialMode={initialMode} nextPath={nextPath} />
      </div>
    </main>
  );
}

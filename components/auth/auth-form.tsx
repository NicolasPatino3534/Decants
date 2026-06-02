"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    if (!supabase) {
      setMessage("Configura Supabase en .env para usar auth real. La preview local entra en modo demo.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const fullName = String(formData.get("fullName") ?? "");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md rounded-md border border-line bg-white p-5">
      <div className="grid grid-cols-2 gap-2 rounded-md bg-mist p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`h-10 rounded-md text-sm font-bold ${mode === "login" ? "bg-white shadow-sm" : "text-neutral-600"}`}
        >
          Ingresar
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`h-10 rounded-md text-sm font-bold ${mode === "signup" ? "bg-white shadow-sm" : "text-neutral-600"}`}
        >
          Crear cuenta
        </button>
      </div>
      <form action={submit} className="mt-5 space-y-4">
        {mode === "signup" ? <AuthField name="fullName" label="Nombre completo" required /> : null}
        <AuthField name="email" label="Email" type="email" required />
        <AuthField name="password" label="Password" type="password" required />
        {message ? <p className="rounded-md bg-mist p-3 text-sm font-semibold text-neutral-700">{message}</p> : null}
        <Button disabled={loading} className="w-full">
          <LogIn size={17} />
          {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
        </Button>
      </form>
    </div>
  );
}

function AuthField({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

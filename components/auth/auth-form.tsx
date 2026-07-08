"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "update">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const recoveryHash = window.location.hash.includes("type=recovery");
    const recoveryQuery = new URLSearchParams(window.location.search).get("type") === "recovery";
    if (recoveryHash || recoveryQuery) {
      window.queueMicrotask(() => {
        setMode("update");
        setMessage("Ingresá una contraseña nueva para terminar la recuperación.");
      });
    }
  }, [supabase]);

  async function submit(formData: FormData) {
    if (!supabase) {
      setMessage("Configurá Supabase en .env para usar autenticación real. La vista local entra en modo demo.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (mode === "update") {
      if (!isStrongPassword(password)) {
        setLoading(false);
        setMessage("La contraseña debe tener al menos 8 caracteres, una letra y un número.");
        return;
      }
      if (password !== passwordConfirm) {
        setLoading(false);
        setMessage("Las contraseñas no coinciden.");
        return;
      }

      const result = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (result.error) {
        setMessage(toSpanishAuthMessage(result.error.message));
        return;
      }
      router.push(nextPath);
      router.refresh();
      return;
    }

    if (mode === "reset") {
      if (!email) {
        setLoading(false);
        setMessage("Ingresá tu email para recibir el enlace de recuperación.");
        return;
      }

      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`,
      });

      setLoading(false);
      setMessage(result.error ? toSpanishAuthMessage(result.error.message) : "Te enviamos un email para recuperar la contraseña.");
      return;
    }

    if (mode === "signup") {
      if (!fullName || !phone) {
        setLoading(false);
        setMessage("Completá nombre y teléfono para crear la cuenta.");
        return;
      }
      if (!isStrongPassword(password)) {
        setLoading(false);
        setMessage("La contraseña debe tener al menos 8 caracteres, una letra y un número.");
        return;
      }
      if (password !== passwordConfirm) {
        setLoading(false);
        setMessage("Las contraseñas no coinciden.");
        return;
      }
    }

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`,
              data: { full_name: fullName, phone },
            },
          });

    setLoading(false);
    if (result.error) {
      setMessage(toSpanishAuthMessage(result.error.message));
      return;
    }

    if (mode === "signup" && result.data.user?.identities?.length === 0) {
      setMessage("Ese email ya tiene una cuenta. Iniciá sesión o recuperá la contraseña.");
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Cuenta creada. Revisá tu email para confirmarla antes de iniciar sesión.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md rounded-md border border-line bg-white p-5">
      <div className="grid grid-cols-3 gap-2 rounded-md bg-mist p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setMessage(null);
          }}
          className={`h-10 rounded-md text-sm font-bold ${mode === "login" ? "bg-white shadow-sm" : "text-neutral-600"}`}
        >
          Ingresar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage(null);
          }}
          className={`h-10 rounded-md text-sm font-bold ${mode === "signup" ? "bg-white shadow-sm" : "text-neutral-600"}`}
        >
          Crear cuenta
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("reset");
            setMessage(null);
          }}
          className={`h-10 rounded-md text-sm font-bold ${mode === "reset" ? "bg-white shadow-sm" : "text-neutral-600"}`}
        >
          Recuperar
        </button>
      </div>
      <form action={submit} className="mt-5 space-y-4">
        {mode === "signup" ? <AuthField name="fullName" label="Nombre completo" autoComplete="name" required /> : null}
        {mode === "signup" ? <AuthField name="phone" label="Teléfono" type="tel" autoComplete="tel" required /> : null}
        {mode !== "update" ? <AuthField name="email" label="Email" type="email" autoComplete="email" required /> : null}
        {mode !== "reset" ? (
          <AuthField
            name="password"
            label={mode === "update" ? "Nueva contraseña" : "Contraseña"}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            pattern={mode === "login" ? undefined : "^(?=.*[A-Za-z])(?=.*\\d).{8,}$"}
            title="Minimo 8 caracteres, una letra y un numero."
            required
          />
        ) : null}
        {mode === "signup" || mode === "update" ? (
          <AuthField name="passwordConfirm" label="Repetir contraseña" type="password" autoComplete="new-password" minLength={8} required />
        ) : null}
        {message ? <p className="rounded-md bg-mist p-3 text-sm font-semibold text-neutral-700">{message}</p> : null}
        <Button disabled={loading} className="w-full">
          {mode === "reset" ? <Mail size={17} /> : mode === "signup" ? <KeyRound size={17} /> : <LogIn size={17} />}
          {loading ? "Procesando..." : mode === "login" ? "Ingresar" : mode === "signup" ? "Crear cuenta" : mode === "update" ? "Actualizar contraseña" : "Enviar recuperación"}
        </Button>
        {mode === "login" ? (
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setMessage(null);
            }}
            className="w-full text-sm font-bold text-[#6f5a2e] underline-offset-4 hover:underline"
          >
            Olvidé mi contraseña
          </button>
        ) : null}
      </form>
    </div>
  );
}

function AuthField({
  name,
  label,
  type = "text",
  required = false,
  autoComplete,
  minLength,
  pattern,
  title,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  pattern?: string;
  title?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        pattern={pattern}
        title={title}
        className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

function toSpanishAuthMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (lower.includes("user already registered") || lower.includes("already")) return "Ese email ya tiene una cuenta.";
  if (lower.includes("password")) return "Revisá la contraseña ingresada.";
  if (lower.includes("email")) return "Revisá el email ingresado.";
  return message;
}

function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

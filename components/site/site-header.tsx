"use client";

import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { getAccountDisplayName } from "@/lib/auth/display-name";
import { brand } from "@/lib/brand";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HeaderProfile = {
  email: string | null;
  full_name: string | null;
};

const accountActionClass =
  "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors duration-[var(--motion-fast)] hover:bg-mist";

const navItems = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/#discovery-sets", label: "Sets de descubrimiento" },
  { href: "/#confianza", label: "Confianza" },
  { href: "/#faq", label: "Preguntas frecuentes" },
];

export function SiteHeader() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [loginGreeting, setLoginGreeting] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const accountEmail = profile?.email ?? user?.email ?? "";
  const displayName = getAccountDisplayName({
    fullName: profile?.full_name ?? getUserMetadataFullName(user),
    username: getUserMetadataUsername(user),
    email: accountEmail,
  });

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;

    async function loadProfile(userId: string) {
      const { data } = await client
        .from("profiles")
        .select("email,full_name")
        .eq("id", userId)
        .maybeSingle();
      if (active) setProfile((data as HeaderProfile | null) ?? null);
    }

    async function loadSession() {
      const {
        data: { user: currentUser },
      } = await client.auth.getUser();
      if (!active) return;

      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void loadProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!accountOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !accountRef.current?.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [accountOpen]);

  useEffect(() => {
    if (!accountOpen && !open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (accountOpen) {
        setAccountOpen(false);
        accountRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
      if (open) {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [accountOpen, open]);

  useEffect(() => {
    if (!user) return;

    const pendingGreeting = window.sessionStorage.getItem(
      "decantscba-login-greeting",
    );
    if (!pendingGreeting) return;

    window.sessionStorage.removeItem("decantscba-login-greeting");
    const greeting =
      displayName === "tu cuenta" ? "Hola" : `Hola, ${displayName}`;
    const showTimeout = window.setTimeout(() => setLoginGreeting(greeting), 0);
    const hideTimeout = window.setTimeout(() => setLoginGreeting(null), 5200);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [displayName, user]);

  async function handleSignOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAccountOpen(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-[var(--motion-base)] ease-[var(--ease-premium)]">
      <div className="hidden border-b border-line bg-warm lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs font-semibold text-[var(--accent-muted)]">
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} /> Decants originales y stock visible
          </span>
          <span className="flex items-center gap-2">
            <Truck size={14} /> Envíos a todo el país y retiro en Córdoba
          </span>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-[76px] lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 text-ink"
          onClick={() => setOpen(false)}
        >
          <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-paper">
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              fill
              sizes="40px"
              className="object-contain p-1"
            />
          </span>
          <span className="min-w-0">
            <span className="font-display block truncate text-xl font-semibold leading-none tracking-normal">
              {brand.displayName}
            </span>
            <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-[0.18em] text-soft sm:block">
              Perfumes originales
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-bold text-muted lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-amber">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <span className="hidden lg:inline-flex">
            <ButtonLink
              href="/catalogo"
              variant="subtle"
              className="h-10 px-3"
              aria-label="Buscar perfumes"
            >
              <Search size={18} />
            </ButtonLink>
          </span>
          <div ref={accountRef} className="relative hidden lg:inline-flex">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-bold text-ink transition-[transform,background-color,border-color,box-shadow] duration-[var(--motion-base)] ease-[var(--ease-premium)] hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-warm hover:shadow-soft active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-bg"
              aria-label={user ? `Cuenta de ${displayName}` : "Cuenta"}
              aria-expanded={accountOpen}
              aria-controls="account-menu"
              onClick={() => setAccountOpen((current) => !current)}
            >
              <UserRound size={18} />
            </button>
            {accountOpen ? (
              <div
                id="account-menu"
                className="motion-dropdown absolute right-0 top-12 w-72 rounded-md border border-line bg-paper p-2 shadow-[var(--shadow-lifted)]"
              >
                {user ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm font-black text-ink">
                        {displayName}
                      </p>
                      {accountEmail ? (
                        <p className="mt-1 truncate text-xs font-semibold text-soft">
                          {accountEmail}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href="/cuenta"
                      className={accountActionClass}
                      onClick={() => setAccountOpen(false)}
                    >
                      <UserRound size={16} /> Mi cuenta
                    </Link>
                    <Link
                      href="/cuenta#pedidos"
                      className={accountActionClass}
                      onClick={() => setAccountOpen(false)}
                    >
                      <Package size={16} /> Mis pedidos
                    </Link>
                    <button
                      type="button"
                      className={accountActionClass}
                      onClick={handleSignOut}
                    >
                      <LogOut size={16} /> Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-soft">
                      Cuenta
                    </p>
                    <Link
                      href="/auth"
                      className={accountActionClass}
                      onClick={() => setAccountOpen(false)}
                    >
                      <LogIn size={16} /> Ingresar
                    </Link>
                    <Link
                      href="/auth?mode=signup"
                      className={accountActionClass}
                      onClick={() => setAccountOpen(false)}
                    >
                      <UserPlus size={16} /> Crear cuenta
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <ButtonLink
            href="/carrito"
            variant="secondary"
            className="relative h-10 px-3"
            aria-label="Carrito"
          >
            <ShoppingCart size={18} />
            {count > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-amber px-1 text-[11px] font-bold text-[var(--on-accent)]">
                {count}
              </span>
            ) : null}
          </ButtonLink>
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-grid h-10 w-10 place-items-center rounded-md border border-line bg-paper text-ink lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {loginGreeting ? (
        <div className="border-t border-line bg-warm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[var(--accent-muted)] sm:px-6 lg:px-8">
            <p role="status" aria-live="polite">
              {loginGreeting}
            </p>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-paper"
              aria-label="Cerrar saludo"
              onClick={() => setLoginGreeting(null)}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : null}
      {open ? (
        <div
          id="mobile-navigation"
          className="motion-dropdown border-t border-line bg-paper px-4 pb-4 shadow-[var(--shadow-lifted)] lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-line py-3 sm:hidden">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-soft">
              Tema
            </span>
            <ThemeToggle />
          </div>
          <nav className="grid gap-1 py-3 text-sm font-bold text-ink">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-3 hover:bg-mist"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line py-3">
            {user ? (
              <div className="grid gap-1 text-sm font-bold text-ink">
                <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-soft">
                  Hola, {displayName}
                </p>
                <Link
                  href="/cuenta"
                  className="flex items-center gap-2 rounded-md px-3 py-3 hover:bg-mist"
                  onClick={() => setOpen(false)}
                >
                  <UserRound size={16} /> Mi cuenta
                </Link>
                <Link
                  href="/cuenta#pedidos"
                  className="flex items-center gap-2 rounded-md px-3 py-3 hover:bg-mist"
                  onClick={() => setOpen(false)}
                >
                  <Package size={16} /> Mis pedidos
                </Link>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-3 py-3 text-left hover:bg-mist"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth"
                  className="flex items-center justify-center gap-2 rounded-md border border-line px-3 py-3 text-sm font-bold text-ink hover:bg-mist"
                  onClick={() => setOpen(false)}
                >
                  <LogIn size={16} /> Ingresar
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="flex items-center justify-center gap-2 rounded-md border border-line px-3 py-3 text-sm font-bold text-ink hover:bg-mist"
                  onClick={() => setOpen(false)}
                >
                  <UserPlus size={16} /> Crear cuenta
                </Link>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[var(--accent-muted)]">
            <span className="rounded-md bg-warm p-3">Compra segura</span>
            <span className="rounded-md bg-warm p-3">
              Seguimiento de envíos
            </span>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function getUserMetadataFullName(user: User | null) {
  const fullName = user?.user_metadata?.full_name;
  return typeof fullName === "string" ? fullName : "";
}

function getUserMetadataUsername(user: User | null) {
  const username =
    user?.user_metadata?.username ??
    user?.user_metadata?.user_name ??
    user?.user_metadata?.name;
  return typeof username === "string" ? username : "";
}

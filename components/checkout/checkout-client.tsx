"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, CheckCircle2, CreditCard, Lock, MapPin, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { calculateCartTotals, fallbackShippingMethods } from "@/lib/cart/pricing";
import { formatMoney } from "@/lib/format";
import type { ShippingMethod } from "@/lib/types";

type CheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
};

export function CheckoutClient({ initialCustomer }: { initialCustomer: CheckoutCustomer }) {
  const { lines, clearCart, syncCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(fallbackShippingMethods);
  const [shippingMethodId, setShippingMethodId] = useState(fallbackShippingMethods[0].id);
  const [couponCode, setCouponCode] = useState("");
  const [idempotencyKey] = useState(createIdempotencyKey);

  const selectedShipping = useMemo(
    () => shippingMethods.find((method) => method.id === shippingMethodId) ?? shippingMethods[0] ?? fallbackShippingMethods[0],
    [shippingMethodId, shippingMethods],
  );
  const totals = calculateCartTotals({ lines, shippingCents: lines.length > 0 ? selectedShipping.basePriceCents : 0 });

  useEffect(() => {
    let active = true;
    fetch("/api/checkout/options")
      .then((response) => response.json())
      .then((payload: { shippingMethods?: ShippingMethod[] }) => {
        if (!active || !payload.shippingMethods?.length) return;
        setShippingMethods(payload.shippingMethods);
        setShippingMethodId(payload.shippingMethods[0].id);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function startCheckout(formData: FormData) {
    setLoading(true);
    setError(null);

    const refreshedLines = await syncCart();
    if (refreshedLines.length === 0) {
      setError("El carrito tenia productos que ya no estan disponibles. Volve al catalogo y agregalos nuevamente.");
      setLoading(false);
      return;
    }

    const payload = {
      idempotencyKey,
      customer: {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      },
      shippingAddress: {
        street: String(formData.get("street") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        postalCode: String(formData.get("postalCode") ?? ""),
        country: "AR",
        reference: String(formData.get("reference") ?? ""),
      },
      shippingMethodId,
      couponCode,
      items: refreshedLines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    };

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "No se pudo iniciar el checkout.");
      }

      clearCart();
      window.location.href = result.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar el checkout.");
      setLoading(false);
    }
  }

  if (lines.length === 0) {
    return (
      <main className="premium-shell mx-auto grid min-h-[70vh] place-items-center px-4 py-16 text-center">
        <div className="max-w-md rounded-md border border-line bg-white p-8 shadow-[0_18px_50px_rgba(11,13,15,0.08)]">
          <ShoppingBag className="mx-auto text-[#b88939]" size={34} />
          <h1 className="font-display mt-5 text-4xl text-ink">No hay ítems para confirmar</h1>
          <p className="mt-3 text-sm text-[#6f6658]">Agregá un decant al carrito para continuar.</p>
          <ButtonLink href="/catalogo" className="mt-6">
            Volver al catálogo
          </ButtonLink>
        </div>
      </main>
    );
  }

  return (
    <main className="premium-shell">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8 lg:py-12">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8c682b]">Pedido seguro</p>
          <h1 className="font-display mt-2 text-5xl text-ink">Finalizar compra</h1>
          <ol className="mt-5 grid gap-2 text-sm font-bold text-[#5f574c] sm:grid-cols-3">
            <Step icon={<ShoppingBag size={16} />} label="Carrito revisado" active />
            <Step icon={<MapPin size={16} />} label="Datos de envío" active />
            <Step icon={<CreditCard size={16} />} label="Confirmación" />
          </ol>
          <form id="checkout-form" action={startCheckout} className="mt-6 grid gap-5 rounded-md border border-line bg-white p-5 shadow-[0_18px_50px_rgba(11,13,15,0.06)]">
            <section>
              <h2 className="flex items-center gap-2 text-lg font-black text-ink">
                <BadgeCheck size={18} className="text-[#8a611c]" /> Tus datos
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field name="name" label="Nombre completo" autoComplete="name" defaultValue={initialCustomer.name} required />
              <Field name="email" label="Email" type="email" autoComplete="email" defaultValue={initialCustomer.email} required readOnly />
              <Field name="phone" label="Teléfono" type="tel" autoComplete="tel" defaultValue={initialCustomer.phone} required />
              </div>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-lg font-black text-ink">
                <Truck size={18} className="text-[#8a611c]" /> Entrega
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field name="postalCode" label="Código postal" autoComplete="postal-code" required />
              <Field name="street" label="Dirección" autoComplete="street-address" className="md:col-span-2" required />
              <Field name="city" label="Ciudad" autoComplete="address-level2" required />
              <Field name="state" label="Provincia" autoComplete="address-level1" required />
              <Field name="reference" label="Referencia" autoComplete="off" className="md:col-span-2" />
              </div>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-lg font-black text-ink">
                <PackageCheck size={18} className="text-[#8a611c]" /> Método y cupón
              </h2>
              <div className="mt-4 grid gap-4">
                <label>
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#7b7164]">Método de envío</span>
                  <select
                    value={shippingMethodId}
                    onChange={(event) => setShippingMethodId(event.target.value)}
                    className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-[#b88939]"
                  >
                    {shippingMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name} - {formatMoney(method.basePriceCents)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-[#7d7467]">
                    {selectedShipping.description ?? "Envío con seguimiento."}
                  </span>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#7b7164]">Cupón de descuento</span>
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Opcional"
                    className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-[#b88939]"
                  />
                </label>
              </div>
            </section>

            <div className="flex items-center gap-2 rounded-md bg-[#fbf7ed] p-3 text-sm font-semibold text-[#7a5a20]">
              <Truck size={17} />
              El envío se coordina por WhatsApp cuando el pedido pasa a preparación.
            </div>
            {error ? (
              <p className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">
                <AlertCircle size={17} /> {error}
              </p>
            ) : null}
            <Button disabled={loading} className="h-12 w-full sm:w-fit">
              <Lock size={17} />
              {loading ? "Confirmando..." : "Confirmar pedido"}
            </Button>
          </form>
        </section>
        <aside className="h-fit rounded-md border border-line bg-white p-5 shadow-[0_18px_50px_rgba(11,13,15,0.08)] lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl text-ink">Resumen</h2>
            <Lock className="text-[#8a611c]" size={20} />
          </div>
          <div className="mt-4 divide-y divide-line">
            {lines.map((line) => (
              <div key={line.variantId} className="flex justify-between gap-4 py-3 text-sm">
                <span className="text-[#5f5648]">
                  {line.productName} <span className="text-[#8b806f]">{line.sizeMl}ml x {line.quantity}</span>
                </span>
                <span className="font-bold text-[#111111]">{formatMoney(line.priceCents * line.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
            <SummaryRow label="Subtotal" value={formatMoney(totals.subtotalCents)} />
            <SummaryRow label="Descuento" value={`-${formatMoney(totals.discountCents)}`} />
            <SummaryRow label="Envío" value={formatMoney(totals.shippingCents)} />
            <div className="flex justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-black">{formatMoney(totals.totalCents)}</span>
            </div>
          </div>
          <div className="mt-5 grid gap-2 text-xs font-semibold text-[#5f665d]">
            <span className="flex items-center gap-2 rounded-md bg-mist p-3"><CheckCircle2 size={15} /> Costos visibles antes de confirmar</span>
            <span className="flex items-center gap-2 rounded-md bg-mist p-3"><Lock size={15} /> Confirmación protegida</span>
          </div>
          <Button form="checkout-form" type="submit" disabled={loading} className="mt-5 h-12 w-full">
            <Lock size={17} />
            {loading ? "Confirmando..." : "Confirmar pedido"}
          </Button>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  className = "",
  required = false,
  autoComplete,
  defaultValue,
  readOnly = false,
}: {
  label: string;
  name: string;
  type?: string;
  className?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#7b7164]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-[#b88939]"
      />
    </label>
  );
}

function Step({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <li className={`flex items-center gap-2 rounded-md border p-3 ${active ? "border-[#e6dcc6] bg-[#fbf7ed] text-[#7a5a20]" : "border-line bg-white"}`}>
      {icon}
      {label}
    </li>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#6f6658]">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

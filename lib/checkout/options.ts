import type { SupabaseClient } from "@supabase/supabase-js";
import { fallbackShippingMethods } from "@/lib/cart/pricing";
import type { ShippingMethod } from "@/lib/types";

type ShippingMethodRow = {
  id: string;
  name: string;
  description: string | null;
  carrier: string | null;
  base_price_cents: number;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
};

type CouponRow = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  min_order_cents: number;
  max_discount_cents: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
};

export class CheckoutShippingMethodError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CheckoutShippingMethodError";
  }
}

export async function getAvailableShippingMethods(
  supabase: SupabaseClient | null,
) {
  if (!supabase) return fallbackShippingMethods;

  const { data, error } = await supabase
    .from("shipping_methods")
    .select(
      "id,name,description,carrier,base_price_cents,estimated_days_min,estimated_days_max",
    )
    .eq("active", true)
    .order("base_price_cents");

  if (error || !data || data.length === 0) return fallbackShippingMethods;
  return (data as ShippingMethodRow[]).map(mapShippingMethod);
}

export async function resolveShippingMethod(
  supabase: SupabaseClient | null,
  id: string,
) {
  if (!supabase) {
    throw new CheckoutShippingMethodError(
      "No se pudo validar el método de envío.",
      503,
    );
  }

  const { data, error } = await supabase
    .from("shipping_methods")
    .select(
      "id,name,description,carrier,base_price_cents,estimated_days_min,estimated_days_max",
    )
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new CheckoutShippingMethodError(
      "No se pudo validar el método de envío.",
      503,
    );
  }
  if (!data) {
    throw new CheckoutShippingMethodError(
      "El método de envío no existe o no está disponible.",
      400,
    );
  }

  return mapShippingMethod(data as ShippingMethodRow);
}

export async function resolveCouponDiscount({
  supabase,
  couponCode,
  subtotalCents,
}: {
  supabase: SupabaseClient | null;
  couponCode?: string;
  subtotalCents: number;
}) {
  const code = couponCode?.trim().toUpperCase();
  if (!supabase || !code)
    return { discountCents: 0, couponId: null, error: null };

  const now = new Date();
  const { data, error } = await supabase
    .from("coupons")
    .select(
      "id,code,discount_type,discount_value,min_order_cents,max_discount_cents,usage_limit,used_count,starts_at,ends_at,active",
    )
    .ilike("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error)
    return {
      discountCents: 0,
      couponId: null,
      error: "No se pudo validar el cupón.",
    };
  if (!data)
    return {
      discountCents: 0,
      couponId: null,
      error: "El cupón no existe o no está activo.",
    };

  const coupon = data as CouponRow;
  if (coupon.starts_at && new Date(coupon.starts_at) > now)
    return {
      discountCents: 0,
      couponId: null,
      error: "El cupón todavía no está vigente.",
    };
  if (coupon.ends_at && new Date(coupon.ends_at) < now)
    return {
      discountCents: 0,
      couponId: null,
      error: "El cupón está vencido.",
    };
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
    return {
      discountCents: 0,
      couponId: null,
      error: "El cupón ya alcanzó su límite de uso.",
    };
  if (subtotalCents < coupon.min_order_cents)
    return {
      discountCents: 0,
      couponId: null,
      error: "El pedido no alcanza el mínimo del cupón.",
    };

  const rawDiscount =
    coupon.discount_type === "percentage"
      ? Math.floor((subtotalCents * coupon.discount_value) / 100)
      : coupon.discount_value;
  const cappedDiscount =
    coupon.max_discount_cents == null
      ? rawDiscount
      : Math.min(rawDiscount, coupon.max_discount_cents);

  return {
    discountCents: Math.min(cappedDiscount, subtotalCents),
    couponId: coupon.id,
    error: null,
  };
}

function mapShippingMethod(row: ShippingMethodRow): ShippingMethod {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    carrier: row.carrier,
    basePriceCents: row.base_price_cents,
    estimatedDaysMin: row.estimated_days_min,
    estimatedDaysMax: row.estimated_days_max,
  };
}

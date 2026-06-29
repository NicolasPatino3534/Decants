"use client";

import type { CartLine, DecantVariant, Product } from "@/lib/types";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

type PurchasePayload = {
  transactionId: string;
  valueCents: number;
  shippingCents: number;
  discountCents: number;
  items: AnalyticsItem[];
  enhancedConversionData?: {
    sha256_email_address?: string;
    sha256_phone_number?: string;
  };
};

export function trackAddToCart(product: Product, variant: DecantVariant, quantity: number) {
  pushEcommerceEvent("add_to_cart", {
    currency: "ARS",
    value: centsToAmount(variant.priceCents * quantity),
    items: [
      {
        item_id: variant.id,
        item_name: product.name,
        item_brand: product.brand.name,
        item_category: product.category.name,
        item_variant: `${variant.sizeMl}ml`,
        price: centsToAmount(variant.priceCents),
        quantity,
      },
    ],
  });
}

export function trackBeginCheckout(lines: CartLine[], valueCents: number, coupon?: string) {
  pushEcommerceEvent("begin_checkout", {
    currency: "ARS",
    value: centsToAmount(valueCents),
    coupon: coupon || undefined,
    items: lines.map(lineToAnalyticsItem),
  });
}

export function trackPurchase({
  transactionId,
  valueCents,
  shippingCents,
  discountCents,
  items,
  enhancedConversionData,
}: PurchasePayload) {
  pushEcommerceEvent("purchase", {
    transaction_id: transactionId,
    currency: "ARS",
    value: centsToAmount(valueCents),
    shipping: centsToAmount(shippingCents),
    discount: centsToAmount(discountCents),
    items,
    enhanced_conversion_data: enhancedConversionData,
  });
}

function pushEcommerceEvent(event: string, ecommerce: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce });
}

function lineToAnalyticsItem(line: CartLine): AnalyticsItem {
  return {
    item_id: line.variantId,
    item_name: line.productName,
    item_variant: `${line.sizeMl}ml`,
    price: centsToAmount(line.priceCents),
    quantity: line.quantity,
  };
}

function centsToAmount(cents: number) {
  return Number((Math.max(0, cents) / 100).toFixed(2));
}

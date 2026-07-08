import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";
import { env } from "@/lib/env";
import type { CheckoutInput } from "@/lib/checkout/schema";
import type { ShippingMethod } from "@/lib/types";

type CheckoutLine = {
  variant: {
    id: string;
    productName: string;
    sizeMl: number;
    priceCents: number;
  };
  quantity: number;
  totalCents: number;
};

type CheckoutTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

let mercadoPagoClient: MercadoPagoConfig | null = null;

export function getMercadoPagoClient() {
  if (!env.mercadoPagoAccessToken) return null;
  if (!mercadoPagoClient) {
    mercadoPagoClient = new MercadoPagoConfig({
      accessToken: env.mercadoPagoAccessToken,
      options: { timeout: 8000 },
    });
  }

  return mercadoPagoClient;
}

export function getMercadoPagoPreference() {
  const client = getMercadoPagoClient();
  return client ? new Preference(client) : null;
}

export function getMercadoPagoPayment() {
  const client = getMercadoPagoClient();
  return client ? new Payment(client) : null;
}

export async function createMercadoPagoPreference({
  orderId,
  input,
  lines,
  totals,
  shippingMethod,
}: {
  orderId: string;
  input: CheckoutInput;
  lines: CheckoutLine[];
  totals: CheckoutTotals;
  shippingMethod: ShippingMethod;
}) {
  const preference = getMercadoPagoPreference();
  if (!preference) return null;

  const orderSummary = lines
    .map((line) => `${line.variant.productName} ${line.variant.sizeMl}ml x ${line.quantity}`)
    .join(" | ")
    .slice(0, 600);

  const response = await preference.create({
    body: {
      auto_return: "approved",
      back_urls: {
        success: `${env.siteUrl}/checkout/success?order=${orderId}&provider=mercadopago`,
        pending: `${env.siteUrl}/checkout/success?order=${orderId}&pending=1&provider=mercadopago`,
        failure: `${env.siteUrl}/checkout/success?order=${orderId}&failed=1&provider=mercadopago`,
      },
      external_reference: orderId,
      items: [
        {
          id: orderId,
          title: "Pedido DecantsCBA",
          description: orderSummary || "Decants de perfumes",
          quantity: 1,
          currency_id: "ARS",
          unit_price: centsToPesos(totals.totalCents),
        },
      ],
      metadata: {
        order_id: orderId,
        idempotency_key: input.idempotencyKey,
        subtotal_cents: totals.subtotalCents,
        discount_cents: totals.discountCents,
        shipping_cents: totals.shippingCents,
        shipping_method: shippingMethod.name,
      },
      notification_url: buildNotificationUrl(),
      payer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: splitArgentinaPhone(input.customer.phone),
        address: {
          zip_code: input.shippingAddress.postalCode,
          street_name: input.shippingAddress.street,
        },
      },
      statement_descriptor: "DECANTSCBA",
    },
    requestOptions: {
      idempotencyKey: `mercadopago-preference-${orderId}`,
    },
  });

  return {
    id: response.id,
    initPoint: response.init_point ?? response.sandbox_init_point,
    raw: response,
  };
}

export function validateMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  if (!env.mercadoPagoWebhookSecret) {
    return env.nodeEnv !== "production";
  }

  if (!xSignature || !xRequestId || !dataId) return false;

  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret: env.mercadoPagoWebhookSecret,
    });
    return true;
  } catch (caught) {
    if (caught instanceof InvalidWebhookSignatureError) return false;
    throw caught;
  }
}

function buildNotificationUrl() {
  if (!env.siteUrl.startsWith("https://")) return undefined;
  return `${env.siteUrl}/api/webhooks/mercadopago`;
}

function centsToPesos(cents: number) {
  return Math.max(0, Math.round(cents) / 100);
}

function splitArgentinaPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return undefined;

  const withoutCountry = digits.startsWith("549") ? digits.slice(3) : digits.startsWith("54") ? digits.slice(2) : digits;
  const areaCode = withoutCountry.length > 8 ? withoutCountry.slice(0, withoutCountry.length - 8) : "";
  const number = areaCode ? withoutCountry.slice(areaCode.length) : withoutCountry;

  return { area_code: areaCode, number };
}

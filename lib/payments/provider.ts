import { env } from "@/lib/env";

export type PaymentProvider = "mercadopago" | "stripe" | "manual";

export function resolvePaymentProvider(): PaymentProvider {
  if (env.paymentProvider === "mercadopago") return "mercadopago";
  if (env.paymentProvider === "stripe") return "stripe";
  if (env.paymentProvider === "manual") return "manual";

  if (env.mercadoPagoAccessToken) return "mercadopago";
  if (env.stripeSecretKey) return "stripe";
  return "manual";
}

export function validatePaymentProviderConfig(provider: PaymentProvider) {
  if (provider === "mercadopago" && !env.mercadoPagoAccessToken) {
    return "Mercado Pago no esta configurado. Falta MERCADO_PAGO_ACCESS_TOKEN.";
  }

  if (provider === "stripe" && !env.stripeSecretKey) {
    return "Stripe no esta configurado. Falta STRIPE_SECRET_KEY.";
  }

  return null;
}

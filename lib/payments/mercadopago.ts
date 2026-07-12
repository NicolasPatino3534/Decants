import MercadoPagoConfig, { Payment, Preference } from "mercadopago";
import { env } from "@/lib/env";

export function getMercadoPagoClient() {
  if (!env.mercadoPagoAccessToken) return null;

  return new MercadoPagoConfig({
    accessToken: env.mercadoPagoAccessToken,
    options: { timeout: 5000 },
  });
}

export function getMercadoPagoPreference() {
  const client = getMercadoPagoClient();
  return client ? new Preference(client) : null;
}

export function getMercadoPagoPayment() {
  const client = getMercadoPagoClient();
  return client ? new Payment(client) : null;
}

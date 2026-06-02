import Stripe from "stripe";
import { env } from "@/lib/env";

export function getStripe() {
  if (!env.stripeSecretKey) return null;

  return new Stripe(env.stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });
}

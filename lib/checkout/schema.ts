import { z } from "zod";
import { sanitizePlainText } from "@/lib/security/sanitize";

const cleanText = (min: number, max: number, message: string) =>
  z.string().transform(sanitizePlainText).pipe(z.string().min(min, message).max(max));

export const checkoutItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  customer: z.object({
    name: cleanText(2, 120, "Ingresa tu nombre completo."),
    email: z.string().transform((value) => sanitizePlainText(value).toLowerCase()).pipe(z.string().email("Ingresa un email valido.").max(160)),
    phone: cleanText(6, 40, "Ingresa un telefono valido."),
  }),
  shippingAddress: z.object({
    street: cleanText(5, 180, "Ingresa una direccion valida."),
    city: cleanText(2, 100, "Ingresa la ciudad."),
    state: cleanText(2, 100, "Ingresa la provincia."),
    postalCode: cleanText(3, 20, "Ingresa el codigo postal."),
    country: z.string().transform((value) => sanitizePlainText(value).toUpperCase()).pipe(z.string().length(2)).default("AR"),
  }),
  shippingMethodId: z.string().min(1),
  couponCode: z.string().transform((value) => sanitizePlainText(value).toUpperCase()).pipe(z.string().max(60)).optional().or(z.literal("")),
  items: z.array(checkoutItemSchema).min(1, "El carrito esta vacio.").max(100),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

import { z } from "zod";
import { sanitizePlainText } from "@/lib/security/sanitize";

const cleanText = (min: number, max: number, message: string) =>
  z
    .string()
    .transform(sanitizePlainText)
    .pipe(z.string().min(min, message).max(max));
const optionalText = (max: number) =>
  z
    .string()
    .transform(sanitizePlainText)
    .pipe(z.string().max(max))
    .optional()
    .or(z.literal(""));

export const checkoutItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  customer: z.object({
    name: cleanText(2, 120, "Ingresá tu nombre completo."),
    email: z
      .string()
      .transform((value) => sanitizePlainText(value).toLowerCase())
      .pipe(z.string().email("Ingresá un email válido.").max(160)),
    phone: cleanText(6, 40, "Ingresá un teléfono válido."),
  }),
  shippingAddress: z.object({
    street: cleanText(5, 180, "Ingresá una dirección válida."),
    city: cleanText(2, 100, "Ingresá la ciudad."),
    state: cleanText(2, 100, "Ingresá la provincia."),
    postalCode: cleanText(3, 20, "Ingresá el código postal."),
    country: z
      .string()
      .transform((value) => sanitizePlainText(value).toUpperCase())
      .pipe(z.string().length(2))
      .default("AR"),
    reference: optionalText(180),
  }),
  shippingMethodId: z.string().min(1),
  couponCode: z
    .string()
    .transform((value) => sanitizePlainText(value).toUpperCase())
    .pipe(z.string().max(60))
    .optional()
    .or(z.literal("")),
  items: z.array(checkoutItemSchema).min(1, "El carrito está vacío.").max(100),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

# Aurum Decants

Tienda online full-stack para venta de decants de perfumes con Next.js, Tailwind CSS, Supabase, Supabase Auth, PostgreSQL/RLS, Supabase Storage y Stripe Checkout.

## Pasos de produccion

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/migrations/0001_init.sql`.
3. Ejecutar `supabase/seed.sql` si queres datos demo.
4. Crear un bucket publico `product-images` si no lo creo la migracion.
5. Configurar las variables de `.env.example`.
6. En Stripe, configurar webhook a `/api/webhooks/stripe` con eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed` y `payment_intent.payment_failed`.
7. Deploy en Vercel con las mismas variables.

## Desarrollo local

```bash
npm install
npm run dev
```

Sin variables de Supabase/Stripe, la app corre en modo demo solo para previsualizacion. En produccion, las rutas leen y escriben contra Supabase y Stripe.

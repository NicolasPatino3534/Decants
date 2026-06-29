# DecantsCBA

Tienda online full-stack para venta de decants de perfumes con Next.js, Tailwind CSS, Supabase, Supabase Auth, PostgreSQL/RLS y Supabase Storage.

## Pasos de produccion

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/migrations/0001_init.sql`.
3. Ejecutar el resto de migraciones en orden.
4. Ejecutar `supabase/seed.sql` si queres datos demo.
5. Crear un bucket publico `product-images` si no lo creo la migracion.
6. Configurar las variables de `.env.example`.
7. Deploy en Vercel con las mismas variables.
8. Configurar Mercado Pago Checkout Pro y el webhook `/api/webhooks/mercadopago`.
9. Configurar Google Tag Manager con los eventos ecommerce enviados por la tienda.

La integracion de pagos queda lista para Mercado Pago como proveedor recomendado para Argentina. Stripe queda disponible como fallback opcional si el negocio opera con una cuenta soportada por Stripe.

## Desarrollo local

```bash
npm install
npm run dev
```

Sin variables de Supabase, la app corre en modo demo solo para previsualizacion. En produccion, las rutas leen y escriben contra Supabase.

## Produccion, admin y tracking

Ver `docs/production-readiness.md` para checklist de Vercel, riesgos del admin temporal sin login, seguridad pendiente y preparacion de Google Ads / Meta Ads.

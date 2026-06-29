# Production Readiness Notes

## Current Stack

- Next.js App Router with React and Tailwind CSS.
- Supabase for database, auth, RLS, storage, and service-role admin access.
- Mercado Pago Checkout Pro and webhook code prepared as the default Argentina-ready payment provider.
- Stripe checkout/webhook code remains available as an optional fallback.
- Google Tag Manager ecommerce events prepared.
- Resend email provider prepared.
- Vercel-compatible build through `npm run build`.

## GitHub And Local Setup

- Repository cloned from `NicolasPatino3534/Decants`.
- Default branch: `master`.
- Remote: `https://github.com/NicolasPatino3534/Decants.git`.
- The local project builds and runs in this folder.

## Admin Scope

The admin panel is available at `/admin` and intentionally contains only:

- Balance
- Pedidos
- Catalogo

Older admin routes for stock, shipments, customers, brands, categories, and products redirect into the simplified sections instead of exposing separate panel areas.

Admin access is checked in both `proxy.ts` and the server-rendered admin layout. Admin server actions also call `requireAdmin()` before using the Supabase service-role client. Production still requires real Supabase Auth users with `owner`, `admin`, or `staff` roles, or a temporary bootstrap email in `ADMIN_BOOTSTRAP_EMAILS`.

## Security Notes

- `.env.example` contains placeholders only. No real keys should be committed.
- `SUPABASE_SERVICE_ROLE_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `NOTIFICATION_WEBHOOK_SECRET` must stay server-only in Vercel environment variables.
- `PAYMENT_PROVIDER=mercadopago` is the recommended production setting for Argentina.
- `/api/webhooks/mercadopago` validates Mercado Pago signatures with `MERCADO_PAGO_WEBHOOK_SECRET`, verifies the payment amount against the order total, and only marks orders paid after an approved matching payment.
- `/api/webhooks/stripe` validates Stripe signatures with `STRIPE_WEBHOOK_SECRET`.
- `/api/notifications/order` requires `x-internal-secret` matching `NOTIFICATION_WEBHOOK_SECRET`.
- Supabase local auth config requires 8+ character passwords with letters and digits, and secure password change is enabled.

## Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

Local URL:

```txt
http://localhost:3000
```

Without Supabase environment variables, the app uses demo data for preview.

## Vercel Deploy

1. Import the GitHub repository into Vercel.
2. Set the framework preset to Next.js.
3. Build command: `npm run build`.
4. Install command: `npm install`.
5. Add production environment variables from `.env.example`.
6. Configure Supabase migrations and the `product-images` storage bucket before accepting real orders.
7. Configure Mercado Pago Checkout Pro credentials:
   `PAYMENT_PROVIDER=mercadopago`
   `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
   `MERCADO_PAGO_ACCESS_TOKEN`
   `MERCADO_PAGO_WEBHOOK_SECRET`
8. Configure the Mercado Pago webhook URL:
   `/api/webhooks/mercadopago`
9. Configure Google Tag Manager:
   `NEXT_PUBLIC_GTM_ID`
10. Create real Supabase Auth users and assign `owner`, `admin`, or `staff` before operating `/admin`.

## Google Ads And Meta Ads

The project uses Google Tag Manager through `NEXT_PUBLIC_GTM_ID` and sends ecommerce events from client flows and the paid-order success page.

Owner needs to prepare:

- Google Ads account.
- Google Tag Manager container.
- Google Analytics 4 property.
- Meta Business Manager access, if Meta Ads will be used.
- Meta Pixel or Dataset in Events Manager, if Meta Ads will be used.
- Domain access for verification.
- Conversion IDs, labels, pixel ID, and business access for the implementer.

Prepared events:

- `page_view` through GTM/GA4.
- `add_to_cart`.
- `begin_checkout`.
- `purchase` only when the order is paid.
- Optional future events: `view_item`, search, contact/WhatsApp click, coupon applied.

Simple owner-facing explanation:

> Si, se puede conectar Google Ads y Meta Ads. Para hacerlo necesitamos que el dueño tenga acceso a Google Ads, Google Tag Manager o Google Analytics, y Meta Business Manager. Despues se instalan los codigos de seguimiento en la web para medir visitas, conversiones, compras, formularios y eventos importantes. Esto permite saber que campanas generan resultados y optimizar la inversion publicitaria.

Official references:

- Google Analytics ecommerce events: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
- Google Ads enhanced conversions with Google Tag Manager: https://support.google.com/google-ads/answer/13262500
- Mercado Pago Checkout Pro: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/overview
- Meta Pixel setup: https://www.facebook.com/business/help/952192354843755

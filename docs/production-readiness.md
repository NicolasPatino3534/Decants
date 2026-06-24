# Production Readiness Notes

## Current Stack

- Next.js App Router with React and Tailwind CSS.
- Supabase for database, auth, RLS, storage, and service-role admin access.
- Stripe checkout/webhook code prepared.
- Resend email provider prepared.
- Vercel-compatible build through `npm run build`.

## GitHub And Local Setup

- Repository cloned from `NicolasPatino3534/Decants`.
- Default branch: `master`.
- Remote: `https://github.com/NicolasPatino3534/Decants.git`.
- The local project builds and runs in this folder.

## Admin Scope

The temporary admin panel is available at `/admin` and intentionally contains only:

- Balance
- Pedidos
- Catalogo

Older admin routes for stock, shipments, customers, brands, categories, and products now redirect into the simplified sections instead of exposing separate panel areas.

Important: the admin panel is temporarily open without login, accounts, or roles. This is not safe for production. Before deploying publicly, restore authentication, role checks, and server-action authorization.

## Security Notes

- `.env.example` contains placeholders only. No real keys should be committed.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `NOTIFICATION_WEBHOOK_SECRET` must stay server-only in Vercel environment variables.
- `/api/webhooks/stripe` validates Stripe signatures with `STRIPE_WEBHOOK_SECRET`.
- `/api/notifications/order` now requires `x-internal-secret` matching `NOTIFICATION_WEBHOOK_SECRET`.
- `npm audit` still reports 2 moderate findings from `postcss` vendored under `next`. `next` was updated to `16.2.9`; do not run `npm audit fix --force` without reviewing the proposed major/breaking change.

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
6. Configure Supabase migrations and storage bucket before accepting real orders.
7. Configure Stripe webhook URL in Stripe once payment is enabled:
   `/api/webhooks/stripe`
8. Re-enable admin authentication before publishing `/admin` to real users.

## Google Ads And Meta Ads

Yes, the project can technically integrate Google Ads and Meta Ads.

Recommended approach: use Google Tag Manager to centralize pixels and conversion events, then send ecommerce events from the storefront and checkout success flow.

Owner needs to prepare:

- Google Ads account.
- Google Tag Manager container.
- Google Analytics 4 property.
- Meta Business Manager access.
- Meta Pixel or Dataset in Events Manager.
- Domain access for verification.
- Conversion IDs, labels, pixel ID, and business access for the implementer.

Recommended events:

- `page_view`
- `view_item`
- `add_to_cart`
- `begin_checkout`
- `purchase`
- Optional: search, contact/WhatsApp click, coupon applied.

Simple owner-facing explanation:

> Si, se puede conectar Google Ads y Meta Ads. Para hacerlo necesitamos que el dueño tenga acceso a Google Ads, Google Tag Manager o Google Analytics, y Meta Business Manager. Despues se instalan los codigos de seguimiento en la web para medir visitas, conversiones, compras, formularios y eventos importantes. Esto permite saber que campanas generan resultados y optimizar la inversion publicitaria.

Official references:

- Google Analytics ecommerce events: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
- Google Ads enhanced conversions with Google Tag Manager: https://support.google.com/google-ads/answer/13262500
- Meta Pixel setup: https://www.facebook.com/business/help/952192354843755

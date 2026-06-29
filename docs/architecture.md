# Arquitectura inicial - DecantsCBA

Esta guía describe la base técnica de la tienda online de decants de perfumes con Next.js, TypeScript, Tailwind CSS y Supabase. La arquitectura separa catálogo, carrito, pedidos, stock, autenticación y administración para que el negocio pueda operar y crecer sin mezclar responsabilidades.

## 1. Estructura de carpetas

```txt
app/
  page.tsx                         # Home / tienda principal
  catalogo/page.tsx                 # Catálogo público con filtros
  producto/[slug]/page.tsx          # Ficha pública de producto
  carrito/page.tsx                  # Carrito cliente
  checkout/page.tsx                 # Checkout
  checkout/success/page.tsx         # Confirmación
  auth/page.tsx                     # Login, registro y recuperación
  cuenta/page.tsx                   # Panel privado de usuario
  cuenta/pedidos/[id]/page.tsx      # Detalle y tracking del pedido
  admin/layout.tsx                  # Shell privado admin
  admin/page.tsx                    # Dashboard admin
  admin/productos/page.tsx          # Gestión de catálogo
  admin/pedidos/page.tsx            # Gestión de pedidos
  admin/stock/page.tsx              # Gestión de stock
  admin/envios/page.tsx             # Gestión de envíos
  admin/clientes/page.tsx           # Gestión de clientes
  api/checkout/session/route.ts     # Crear pedido y sesión de checkout
  api/webhooks/mercadopago/route.ts # Webhook de Mercado Pago
  api/webhooks/stripe/route.ts      # Webhook opcional de Stripe

components/
  admin/                            # UI del panel admin
  auth/                             # Formularios de autenticación
  cart/                             # Provider y vista de carrito
  catalog/                          # Catálogo, filtros y cards
  checkout/                         # UI checkout
  product/                          # UI producto
  site/                             # Header/footer
  ui/                               # Componentes reutilizables

lib/
  auth/                             # Roles y guards
  cart/                             # Pricing y persistencia de carrito
  checkout/                         # Validaciones y stock
  data/                             # Repositorios de lectura/escritura
  notifications/                    # Proveedor de email
  supabase/                         # Clientes Supabase browser/server/admin
  env.ts                            # Variables de entorno centralizadas
```

## 2. Rutas principales

Públicas:
- `/`: home e-commerce con entrada al catálogo.
- `/catalogo`: listado de perfumes con filtros simples.
- `/producto/[slug]`: detalle de perfume y variantes de decant.
- `/carrito`: resumen editable del carrito.
- `/auth`: registro, inicio de sesión y recuperación de contraseña.

Privadas de usuario:
- `/checkout`: datos de contacto y dirección.
- `/checkout/success`: confirmación del pedido.
- `/cuenta`: pedidos del cliente autenticado.
- `/cuenta/pedidos/[id]`: detalle, ítems y estado de tracking.

Privadas de administrador:
- `/admin`: KPIs, pedidos recientes y stock bajo.
- `/admin/productos`: alta y gestión de productos.
- `/admin/pedidos`: cambio de estados y contacto por WhatsApp.
- `/admin/stock`: ajustes e historial de stock.
- `/admin/envios`: preparación, seguimiento y entrega.
- `/admin/clientes`: clientes y compras acumuladas.

## 3. Modelo general de datos

Usuarios y seguridad:
- `profiles`: perfil vinculado a `auth.users`.
- `user_roles`: roles `customer`, `staff`, `admin`, `owner`.
- RLS permite que clientes lean solo sus datos y que staff/admin accedan al panel operativo.

Catálogo:
- `brands`: marcas o casas.
- `fragrance_families`: familias olfativas.
- `products`: perfumes publicados o borrador.
- `product_images`: imágenes en Supabase Storage.
- `decant_variants`: variantes por ml, precio, SKU y stock.

Stock y pedidos:
- `inventory_movements`: ajustes, ventas, devoluciones y daños.
- `addresses`: direcciones guardadas del usuario.
- `orders`: cabecera del pedido, totales y dirección congelada.
- `order_items`: snapshot de producto, variante y precio.
- `payments`: proveedor, sesión, estado y payload auditado.
- `shipments`: carrier, tracking y estado logístico.

## 4. Flujo operativo

1. El cliente entra a `/catalogo`, filtra por familia, marca o búsqueda.
2. Abre `/producto/[slug]`, elige presentación de 2ml, 5ml o 10ml y agrega al carrito.
3. En `/carrito`, revisa cantidades, subtotal y envío.
4. En `/checkout`, carga datos de contacto, teléfono y dirección.
5. `POST /api/checkout/session` valida variantes contra Supabase, reserva stock, crea pedido e ítems.
6. El proveedor de pago se resuelve con `PAYMENT_PROVIDER`: Mercado Pago, Stripe o manual.
7. El admin ve el pedido en `/admin/pedidos`, revisa datos del cliente y puede contactarlo por WhatsApp.
8. En `/admin/stock`, revisa umbrales bajos y registra ajustes.
9. En `/admin/envios`, cambia estados de preparación, despacho y entrega.
10. El cliente ve el avance en `/cuenta/pedidos/[id]`.

## 5. Variables de entorno

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYMENT_PROVIDER=mercadopago
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_GTM_ID=
GOOGLE_ADS_CONVERSION_ID=
GOOGLE_ADS_CONVERSION_LABEL=

EMAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=pedidos@decantscba.com
NOTIFICATION_WEBHOOK_SECRET=
ADMIN_BOOTSTRAP_EMAILS=
```

Notas:
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` se usa en cliente y server SSR.
- `SUPABASE_SERVICE_ROLE_KEY` solo debe existir en servidor, nunca en componentes cliente.
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` y `NOTIFICATION_WEBHOOK_SECRET` son solo servidor.
- Para produccion en Vercel, replicar estas variables en Project Settings.
- Mercado Pago Checkout Pro queda como proveedor recomendado para Argentina. Stripe se mantiene como fallback opcional.

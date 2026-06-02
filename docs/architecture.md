# Arquitectura inicial - Aurum Decants

Esta guia describe la base tecnica de una tienda online de decants de perfumes con Next.js, TypeScript, Tailwind CSS y Supabase. La arquitectura esta pensada para crecer hacia pagos, envios, emails, panel de cliente y panel de administracion sin mezclar responsabilidades.

## 1. Estructura de carpetas

```txt
app/
  page.tsx                         # Home / tienda principal
  catalogo/page.tsx                 # Catalogo publico con filtros
  producto/[slug]/page.tsx          # Ficha publica de producto
  carrito/page.tsx                  # Carrito cliente
  checkout/page.tsx                 # Checkout
  checkout/success/page.tsx         # Confirmacion
  auth/page.tsx                     # Login / registro
  cuenta/page.tsx                   # Panel privado usuario
  cuenta/pedidos/[id]/page.tsx      # Detalle y tracking del pedido
  admin/layout.tsx                  # Shell privado admin
  admin/page.tsx                    # Dashboard admin
  admin/productos/page.tsx          # Gestion catalogo
  admin/pedidos/page.tsx            # Gestion pedidos
  admin/stock/page.tsx              # Gestion stock
  admin/envios/page.tsx             # Gestion envios
  admin/clientes/page.tsx           # Gestion clientes
  api/checkout/session/route.ts     # Crear sesion de pago
  api/webhooks/stripe/route.ts      # Webhook de pagos
  api/notifications/order/route.ts  # Notificaciones transaccionales

components/
  admin/                            # UI del panel admin
  auth/                             # Formularios de autenticacion
  cart/                             # Provider y vista de carrito
  catalog/                          # Catalogo, filtros y cards
  checkout/                         # UI checkout
  product/                          # UI producto
  site/                             # Header/footer
  ui/                               # Componentes atomicos reutilizables

services/
  catalog.service.ts                # Casos de uso de catalogo/productos
  order.service.ts                  # Casos de uso de pedidos
  payment.service.ts                # Integracion de pagos
  email.service.ts                  # Emails/notificaciones

hooks/
  use-cart.ts                       # Estado cliente de carrito

types/
  index.ts                          # Contratos compartidos de dominio

utils/
  money.ts                          # Helpers puros de presentacion

lib/
  supabase/                         # Clientes Supabase browser/server/admin
  auth/                             # Roles y guards
  data/                             # Repositorios de lectura/escritura
  payments/                         # SDK Stripe
  notifications/                    # Proveedor de email
  env.ts                            # Variables de entorno centralizadas
  demo-data.ts                      # Seed local de preview

supabase/
  migrations/0001_init.sql          # Esquema, indices, RLS, storage y funciones
  seed.sql                          # Datos demo
```

## 2. Rutas principales

Publicas:
- `/`: home e-commerce con entrada al catalogo.
- `/catalogo`: listado de perfumes con filtros.
- `/producto/[slug]`: detalle de perfume y variantes de decant.
- `/carrito`: resumen editable del carrito.
- `/checkout`: datos de envio y pago.
- `/checkout/success`: confirmacion post-pago.
- `/auth`: registro e inicio de sesion.

Privadas de usuario:
- `/cuenta`: pedidos del cliente autenticado.
- `/cuenta/pedidos/[id]`: detalle, items y estado de tracking.

Privadas de administrador:
- `/admin`: KPIs, pedidos recientes y stock bajo.
- `/admin/productos`: alta y gestion de productos.
- `/admin/pedidos`: cambio de estados.
- `/admin/stock`: ajustes e historial de stock.
- `/admin/envios`: preparacion, tracking y entregas.
- `/admin/clientes`: clientes y compras acumuladas.

API:
- `POST /api/checkout/session`: valida carrito, crea pedido y sesion de pago.
- `POST /api/webhooks/stripe`: valida firma, confirma pagos, libera reservas fallidas y dispara emails.
- `POST /api/notifications/order`: canal interno para emails transaccionales.

## 3. Componentes principales

- `SiteHeader` y `SiteFooter`: navegacion global y acceso a carrito/cuenta.
- `CatalogClient`: filtros client-side, busqueda y ordenamiento inicial.
- `ProductCard`: tarjeta reusable para grillas de catalogo.
- `AddToCartPanel`: selector de presentacion y cantidad.
- `CartProvider`: estado local persistido del carrito.
- `CartPageClient`: edicion de cantidades, remocion y resumen.
- `CheckoutClient`: formulario de comprador/envio y llamada a pago.
- `AuthForm`: login/registro con Supabase Auth.
- `AdminSidebar`: navegacion privada del panel.
- `StatusBadge`, `Button`, `ButtonLink`: primitivas UI.

## 4. Modelo general de datos

Usuarios y seguridad:
- `profiles`: perfil vinculado a `auth.users`.
- `user_roles`: roles `customer`, `staff`, `admin`, `owner`.

Catalogo:
- `brands`: marcas o casas.
- `fragrance_families`: familias olfativas.
- `products`: perfumes publicados o borrador.
- `product_images`: imagenes en Supabase Storage.
- `decant_variants`: variantes por ml, precio, SKU y stock.

Stock:
- `inventory_movements`: ajustes, ventas, devoluciones y danos.

Checkout y pedidos:
- `addresses`: direcciones guardadas del usuario.
- `orders`: cabecera del pedido, totales y direccion congelada.
- `order_items`: snapshot de producto/variante/precio.
- `payments`: proveedor, sesion, estado y payload auditado.
- `shipments`: carrier, tracking y estado logistico.

Notificaciones:
- `notifications`: bandeja interna o eventos de sistema.
- `email_events`: auditoria de emails enviados/fallidos.

RLS:
- Clientes leen solo sus perfiles, direcciones, pedidos y notificaciones.
- Staff/admin/owner acceden al panel operativo.
- Catalogo activo es publico.
- Escrituras sensibles quedan protegidas por rol o service role.

## 5. Variables de entorno

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

EMAIL_PROVIDER=resend
RESEND_API_KEY=
ADMIN_BOOTSTRAP_EMAILS=
```

Notas:
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` se usa en cliente y server SSR.
- `SUPABASE_SERVICE_ROLE_KEY` solo debe existir en servidor, nunca en componentes cliente.
- Para produccion en Vercel, replicar estas variables en Project Settings.

## 6. Flujo completo de compra a despacho

1. El cliente entra a `/catalogo`, filtra por familia, marca o concentracion.
2. Abre `/producto/[slug]`, elige presentacion de 2ml, 5ml o 10ml y agrega al carrito.
3. En `/carrito`, revisa cantidades, subtotal y envio.
4. En `/checkout`, carga datos de contacto y direccion.
5. `POST /api/checkout/session` valida variantes contra Supabase, reserva stock con update condicional, crea `orders`, `order_items`, `payments` y redirige a Stripe Checkout.
6. Stripe cobra y llama a `POST /api/webhooks/stripe`.
7. El webhook valida firma, marca el pedido como pagado, crea/actualiza `shipments` y dispara email de confirmacion. Si Stripe expira o falla, libera el stock reservado y cancela el pedido.
8. El dueno entra a `/admin/pedidos`, ve pedidos pagados y los pasa a preparacion.
9. En `/admin/stock`, revisa umbrales bajos y registra ajustes si prepara nuevos decants.
10. En `/admin/envios`, carga carrier/tracking y cambia estado a `in_transit`.
11. El cliente ve el avance en `/cuenta/pedidos/[id]`.
12. Al entregar, el dueno marca `delivered`; queda auditoria en pedidos, pagos, envios, stock y emails.

## Archivos base generados

El proyecto ya incluye la base ejecutable de Next.js, Tailwind, Supabase, auth, carrito, checkout y admin. Los archivos de arquitectura agregados en esta pasada son:

- `docs/architecture.md`
- `services/catalog.service.ts`
- `services/order.service.ts`
- `services/payment.service.ts`
- `services/email.service.ts`
- `hooks/use-cart.ts`
- `types/index.ts`
- `utils/money.ts`

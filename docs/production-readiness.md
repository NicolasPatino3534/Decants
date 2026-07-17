# Runbook de producción y go-live

## Estado actual

**NO LISTO PARA PRODUCCIÓN** mientras no exista evidencia del entorno real para los puntos marcados como bloqueantes en este documento. Una compilación o un test local exitoso no valida credenciales, firmas de webhook, políticas RLS, backups ni entrega de correo.

Estado verificado el 17 de julio de 2026:

- Supabase staging tiene 15/15 migraciones aplicadas y `db lint` sin errores.
- La auditoría SQL final, RLS y los flujos transaccionales de stock/pagos pasaron sobre PostgreSQL de staging.
- Auth de staging pasó registro público, confirmación controlada, login, logout, recuperación, aislamiento entre usuarios y permisos administrativos. El bloqueo `429 over_email_send_rate_limit` desapareció al vencer la ventana, sin relajar límites.
- Vercel preview tiene cero variables configuradas. Las nueve variables existentes en el proyecto están limitadas a producción y no deben copiarse automáticamente.
- No existe preview deploy ni pago externo sandbox validado.
- El repositorio fija Node.js `22.x` en `package.json`; Vercel muestra `24.x` como valor general, pero `engines.node` tiene precedencia para los despliegues.
- La validación local final terminó con Vitest 92/92, integración 47/47, migration chain 23/23, Playwright 220/220, build aprobado, cero vulnerabilidades y cero secretos.

Stack operativo:

- Next.js App Router sobre Vercel.
- Supabase para PostgreSQL, Auth, RLS y Storage.
- Mercado Pago Checkout Pro como configuración esperada; Stripe queda como alternativa, no como segundo proveedor simultáneo.
- Resend para correo transaccional.
- Vercel Cron para liberar reservas de stock vencidas.
- Playwright y Vitest para QA automatizado.

Flujo crítico:

```text
Usuario -> Catálogo -> Producto/variante -> Carrito -> Checkout
        -> reserva atómica de stock -> proveedor de pago -> webhook firmado
        -> conciliación del pedido -> confirmación o liberación de reserva
```

## 1. Responsables y evidencia

Antes de la salida, asignar una persona responsable y adjuntar evidencia fechada para cada área:

| Área            | Evidencia mínima                                                  |
| --------------- | ----------------------------------------------------------------- |
| Infraestructura | URL del despliegue, dominio, fecha y commit desplegado            |
| Base de datos   | salida de migraciones, revisión de RLS y prueba de restauración   |
| Pagos           | IDs sandbox de aprobado, rechazado, cancelado y webhook duplicado |
| Stock           | capturas o registros de reserva, vencimiento y liberación         |
| Seguridad       | revisión de roles, secretos y dependencia auditada                |
| QA              | enlace a ejecución de CI y reporte Playwright                     |
| Operación       | alertas, contactos de guardia y procedimiento de rollback         |

No guardar secretos, payloads completos de pago, cookies ni datos personales en esa evidencia.

## 2. Variables de entorno

Usar `.env.example` como inventario, generar valores distintos por ambiente y cargarlos directamente en el proveedor de despliegue. Nunca enviarlos por chat ni versionarlos.

### Inventario exacto para preview

| Variable                               | Clasificación              | Requisito                                                                                                                            |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                 | pública                    | Opcional en preview: si falta, el servidor usa el `VERCEL_URL` HTTPS inyectado. Obligatoria como URL canónica estable en producción. |
| `NEXT_PUBLIC_SUPABASE_URL`             | pública                    | Obligatoria; debe apuntar exclusivamente a Supabase staging.                                                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública                    | Obligatoria y preferida.                                                                                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | pública, legacy            | Alternativa de compatibilidad; no es necesaria si existe la publishable key.                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`            | servidor, secreta          | Obligatoria; solo la del staging.                                                                                                    |
| `PAYMENT_PROVIDER`                     | servidor, no secreta       | Obligatoria; exactamente `mercadopago` o `stripe`.                                                                                   |
| `MERCADOPAGO_ACCESS_TOKEN`             | servidor, sandbox, secreta | Obligatoria si el proveedor es Mercado Pago; debe ser credencial TEST.                                                               |
| `MERCADOPAGO_WEBHOOK_SECRET`           | servidor, sandbox, secreta | Obligatoria si el proveedor es Mercado Pago.                                                                                         |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`   | pública, sandbox           | Opcional para el checkout redirigido actual; si se carga debe ser TEST.                                                              |
| `STRIPE_SECRET_KEY`                    | servidor, sandbox, secreta | Obligatoria solo si el proveedor es Stripe; debe ser `sk_test_*`.                                                                    |
| `STRIPE_WEBHOOK_SECRET`                | servidor, sandbox, secreta | Obligatoria solo si el proveedor es Stripe; debe corresponder al endpoint preview.                                                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | pública, sandbox           | Opcional para el checkout redirigido actual; si se carga debe ser `pk_test_*`.                                                       |
| `RESEND_API_KEY`                       | servidor, secreta          | Obligatoria para que health y correo transaccional pasen.                                                                            |
| `RESEND_FROM_EMAIL`                    | servidor, no secreta       | Obligatoria; remitente de un dominio verificado.                                                                                     |
| `NOTIFICATION_WEBHOOK_SECRET`          | servidor, secreta          | Obligatoria; autoriza `/api/notifications/order`.                                                                                    |
| `CRON_SECRET`                          | servidor, secreta          | Obligatoria; autoriza `/api/cron/release-stock`.                                                                                     |
| `ADMIN_BOOTSTRAP_EMAILS`               | servidor                   | Opcional; no concede roles automáticamente.                                                                                          |
| `EMAIL_PROVIDER`                       | compatibilidad             | Opcional; el código actual usa Resend directamente.                                                                                  |

El workflow de GitHub necesita además `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` como secretos del environment `preview`. No son variables runtime de la aplicación.

No reutilizar variables del target `production`. Actualmente no hay ninguna variable en el target `preview`, por lo que el deploy está bloqueado de forma segura.

### Validación segura

1. Confirmar solo presencia y ambiente de cada variable, nunca imprimir su valor.
2. Rotar secretos creados para desarrollo antes del go-live.
3. Abrir `GET /api/health` en el despliegue. Debe responder `200` y `status: "ok"`; `503/degraded` bloquea la salida.
4. Verificar que ninguna variable privada tenga prefijo `NEXT_PUBLIC_`.

## 3. Base de datos y migraciones

No aplicar por primera vez las migraciones directamente sobre producción.

1. Crear o refrescar un ambiente de staging sin datos personales.
2. `supabase:link` ya no contiene un project ref fijo. Vincular siempre un workdir aislado al destino autorizado y comprobar el ref antes de cualquier escritura:

   ```bash
   npm run supabase:link
   npm run supabase:migrations
   ```

   No asumir el ambiente por el nombre del comando; contrastar el proyecto vinculado con el dashboard antes de `supabase:push`.

3. El 17 de julio de 2026 staging recibió correctamente `20260714001400_validate_variant_integrity_and_profile_guard.sql`, equivalente temporal de la migración canónica `20260716165809_validate_variant_integrity_and_profile_guard.sql`. Validó dos FK, agregó y validó el check normalizado de cupones y convirtió el guard de perfiles a `SECURITY INVOKER`.
4. Para futuras migraciones, aplicar en staging todas las pendientes en orden:

   ```bash
   npm run supabase:push
   npm run supabase:advisors
   ```

5. Validar en staging:

   - tablas modernas y de compatibilidad de catálogo;
   - RLS habilitado y políticas efectivas;
   - `reserve_checkout_stock_mirrored(jsonb)` ejecutable solo por `service_role`;
   - trigger que impide que un usuario cambie su propio `profiles.role`;
   - `release_expired_checkout_reservations(integer)` ejecutable solo por `service_role`;
   - índices y columnas `reservation_expires_at` y `stock_released_at`;
   - bucket `product-images`, límites y políticas esperadas.

6. Crear un backup antes de la ventana productiva y probar una restauración en un proyecto aislado. Confirmar retención, cifrado, responsable y RPO/RTO acordados con el cliente. Un backup no se considera operativo hasta completar un restore drill.
7. Aplicar las migraciones en producción, guardar la salida y volver a ejecutar advisors.

`supabase/seed.sql` es solo para demo/desarrollo y no debe ejecutarse en producción.

## 4. Autenticación y administración

El layout y las acciones del admin requieren un usuario con rol `owner`, `admin` o `staff`. Antes de publicar:

1. Crear un usuario administrativo nominal; no compartir cuentas.
2. Asignar el rol desde una sesión confiable de administración de base de datos.
3. Confirmar que un cliente autenticado recibe denegación al abrir `/admin` y al invocar acciones administrativas.
4. Confirmar que un usuario no puede leer pedidos ajenos ni modificar `profiles.role`.
5. Probar registro, verificación/recuperación de contraseña, login, persistencia, logout y revocación.
6. Revisar en Supabase las URLs permitidas de redirección y dejar solo HTTPS del dominio y previews autorizados.
7. Documentar baja de accesos y rotación de credenciales ante salida de personal.

## 5. Pagos y webhooks

Activar un solo proveedor por ambiente y usar exclusivamente sandbox hasta aprobar todos los casos.

### Mercado Pago

1. Crear la aplicación y credenciales del ambiente correcto.
2. Configurar el webhook HTTPS en:

   ```text
   https://DOMINIO/api/webhooks/mercadopago
   ```

3. Suscribir los eventos de pago requeridos por la aplicación y guardar el secreto de firma en `MERCADOPAGO_WEBHOOK_SECRET`.
4. Ejecutar desde el proveedor una notificación de prueba y confirmar firma válida, consulta del pago al proveedor y respuesta `2xx`.

### Stripe alternativo

Configurar el endpoint `https://DOMINIO/api/webhooks/stripe` y suscribir, como mínimo, los eventos usados por el código: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` y `payment_intent.payment_failed`.

### Matriz sandbox obligatoria

Registrar ID de pedido interno, ID sandbox del proveedor y resultado para:

- pago aprobado, rechazado y cancelado;
- pago pendiente seguido de aprobación;
- refresh y doble clic al pagar;
- webhook duplicado y fuera de orden;
- monto, moneda o sesión que no concilia;
- pago tardío después de liberar stock;
- reintento de un mismo checkout.

Comprobar que la redirección del navegador nunca marca por sí sola un pedido como pagado, que los totales se recalculan en servidor y que un evento no descuenta stock dos veces. Revisar los logs sin copiar payloads completos ni tokens.

La finalización transaccional, el evento idempotente y el outbox están implementados en la migración `20260713220000_atomic_checkout_and_payment_finalization.sql`. Sigue siendo bloqueante validarlos contra PostgreSQL real en staging y ejecutar la matriz sandbox antes de habilitar cobros reales.

## 6. Stock, reservas y cron

`vercel.json` programa `GET /api/cron/release-stock` cada 10 minutos. Antes del go-live:

1. Confirmar que el plan y la configuración del proyecto ejecutan esa frecuencia.
2. Definir `CRON_SECRET`; Vercel debe enviar `Authorization: Bearer <CRON_SECRET>`.
3. Invocar el endpoint de forma controlada en staging y confirmar `200`, `ok: true` y cantidad liberada.
4. Crear un pedido sandbox pendiente, dejar vencer `reservation_expires_at` y comprobar una única devolución de stock y `stock_released_at` poblado.
5. Probar dos compradores sobre la última unidad, variante inactiva, producto archivado, carrito obsoleto y cantidad manipulada.
6. Crear una alerta si el cron falla, deja de ejecutarse o aumenta el número de reservas vencidas sin liberar.

Si el cron no está confirmado, el checkout real debe permanecer deshabilitado: el stock puede quedar reservado indefinidamente.

El límite atómico de reservas abiertas y la reserva/consumo atómico de cupones están implementados en `20260713220000_atomic_checkout_and_payment_finalization.sql`. Antes de habilitar ventas se debe comprobar en staging que el límite rechaza el cuarto checkout abierto, que la capacidad del cupón no se excede bajo concurrencia y que las reservas vencidas se liberan.

## 7. Correo, dominio y almacenamiento

- Verificar SPF, DKIM y dominio remitente en Resend.
- Enviar a una cuenta de prueba un correo de pedido exitoso y uno fallido; validar contenido, links y registro en `email_events`.
- Configurar dominio, HTTPS y redirección única entre `www` y apex.
- Confirmar que callbacks y canonical usan el mismo dominio definitivo.
- Probar upload JPEG, PNG y WebP menor a 5 MB y rechazo de tipo/tamaño inválido.
- Revisar que el bucket no permita escritura pública anónima ni listado innecesario.

## 8. CI y controles técnicos

`.github/workflows/quality.yml` ejecuta en pull requests y pushes a ramas principales:

- instalación reproducible con `npm ci`;
- control de espacios finales, lint, typecheck, unit e integration tests;
- build de producción;
- Playwright en Chromium, Firefox y WebKit, incluidos los viewports configurados;
- publicación de artefactos Playwright solo cuando hay fallos.

El merge queda bloqueado si un job falla. Configurar esos jobs como required checks en la protección de rama. El job también ejecuta `npm run format:check`; usar `npm run format` localmente para aplicar el formato antes de abrir el PR.

Antes de cada release ejecutar además:

```bash
git diff --check
npm audit
```

No usar `npm audit fix --force` sin revisar el cambio propuesto. Las vulnerabilidades moderadas transitivas deben registrarse con paquete, impacto, mitigación y fecha de reevaluación.

## 9. Observabilidad y respuesta a incidentes

Como mínimo, configurar:

- retención y acceso restringido a logs de Vercel y Supabase;
- alertas por errores `5xx`, fallos de webhook, fallo del cron y checkout degradado;
- seguimiento de entregas/fallos en Mercado Pago o Stripe y Resend;
- alarma por pedidos `payment_review`, pendientes demasiado tiempo o stock negativo;
- synthetic check sobre home, catálogo, checkout y `/api/health`;
- responsable y canal de escalamiento con horarios definidos.

Los logs deben usar IDs internos/códigos, no contraseñas, tokens, cookies, direcciones completas ni datos completos de pago. No hay una plataforma de error tracking verificada en el repositorio: elegirla, configurar retención/privacidad y probar una alerta antes del go-live.

Rollback operativo:

1. Pausar el checkout si hay riesgo de cobro o stock inconsistente.
2. Desactivar o promover el deployment anterior en Vercel.
3. No revertir migraciones destructivamente sin un plan probado; restaurar desde backup si corresponde.
4. Conciliar manualmente pedidos con el panel del proveedor antes de reabrir ventas.
5. Documentar línea de tiempo, pedidos afectados y acción preventiva.

## 10. Smoke test de release

Ejecutar sobre staging y luego, sin cargos reales, sobre producción:

- home, catálogo y producto cargan sin errores de consola ni requests `5xx`;
- búsqueda, cambio de variante, alta/cambio/eliminación del carrito;
- registro/login/logout y acceso privado;
- usuario común bloqueado en admin; administrador autorizado puede operar;
- checkout sandbox aprobado, rechazado y cancelado;
- webhook firmado actualiza una sola vez y el pedido pertenece al usuario correcto;
- stock exacto, sin stock y liberación por vencimiento;
- página de éxito refleja el estado real del pedido;
- correo transaccional llega desde el dominio validado;
- `/api/health` devuelve `200` sin exponer secretos;
- mobile, tablet y desktop no presentan overflow ni controles inaccesibles.

Guardar commit, ambiente, navegador, fecha, resultado y evidencia no sensible.

## 11. Checklist de aprobación

Todos los ítems son obligatorios salvo que el cliente acepte por escrito un riesgo no bloqueante:

- [ ] Dominio definitivo y HTTPS verificados.
- [ ] Variables productivas presentes, separadas por ambiente y rotadas.
- [ ] CI verde para el commit exacto a desplegar.
- [ ] Migraciones y Supabase advisors verificados en staging y producción.
- [ ] RLS, roles de admin y aislamiento de pedidos probados.
- [ ] Backup automático habilitado y restore drill completado.
- [ ] Proveedor de pago productivo configurado; suite sandbox aprobada.
- [ ] Firma, reintentos e idempotencia del webhook verificados.
- [ ] Cron de reservas ejecutado y alertado.
- [ ] Resend, SPF/DKIM y remitente verificados.
- [ ] Logs, alertas, health check y responsables operativos configurados.
- [ ] Playwright en Chromium, Firefox y WebKit aprobado.
- [ ] Lint, typecheck, unit, integration, build y audit registrados.
- [ ] Smoke test final aprobado.
- [ ] Rollback ensayado y contacto de incidente confirmado.
- [ ] Usuario administrador nominal creado y cuenta demo descartada.

Hasta completar esta lista, el estado debe seguir siendo **NO LISTO PARA PRODUCCIÓN**.

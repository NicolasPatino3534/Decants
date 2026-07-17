# Auditoría final de migraciones y staging

Fecha de cierre: 2026-07-17

Destino: proyecto Supabase `decants-staging` (`xsrmgkshxqfbivugnfbd`)

Supabase CLI: `2.109.1`

## Veredicto

**STAGING VALIDADO CON OBSERVACIONES**

Staging tiene 15/15 migraciones del workdir aplicadas. El dry-run, el push de la migración nueva, `db lint`, la auditoría SQL final, el historial y Auth real terminaron correctamente. No se modificó producción.

Los bloqueos restantes son externos al esquema: Vercel preview no tiene variables, no hay credenciales sandbox disponibles para un pago real, falta validar entrega de correo transaccional y no existe todavía una URL de preview.

## Alcance y seguridad

- El workdir temporal fue vinculado explícitamente al ref de staging.
- El enlace del repositorio permaneció apuntando al proyecto preexistente y no se utilizó para escrituras.
- Las claves de API de staging se obtuvieron con la sesión autenticada de Supabase CLI y permanecieron solo en memoria.
- No se imprimieron ni escribieron service-role keys, contraseñas o tokens.
- El workdir y el historial Git pasaron el escaneo de secretos.
- No se ejecutó seed.
- No se modificó producción.
- No hubo Git push ni deploy.
- No se usaron pagos reales.

La contraseña de staging que se compartió previamente por chat debe considerarse expuesta y rotarse, aunque no está versionada ni aparece en los archivos auditados.

## Causa raíz

La cadena canónica de `supabase/migrations/` representa la evolución de una base existente, pero no es autosuficiente desde un proyecto Supabase vacío. Parte del esquema storefront histórico nació fuera del historial canónico.

La estrategia aprobada no reescribe migraciones aplicadas. `scripts/prepare-staging-validation.ps1` crea un proyecto temporal y agrega:

1. el baseline `supabase/staging/historical_storefront_baseline_after_0002.sql` entre `0002` y `0003`;
2. el auditor `supabase/staging/validate_final_schema.sql` después de la cadena funcional;
3. las migraciones canónicas posteriores en el mismo orden relativo.

El baseline es exclusivo para reconstruir un staging vacío. No debe copiarse al historial canónico ni aplicarse a producción.

## Preparación del workdir

Se ejecutó `scripts/prepare-staging-validation.ps1` bajo `%TEMP%`.

Comprobaciones:

- 15 archivos SQL y 15 entradas de manifiesto;
- 17 archivos totales: `config.toml`, `migration-order.txt` y 15 SQL;
- orden del manifiesto idéntico al orden de archivos;
- cero archivos inesperados;
- cero coincidencias de secretos;
- hashes de `supabase/migrations/` sin cambios.

Orden final:

1. `20260714000100_0001_init.sql`
2. `20260714000200_0002_production_hardening.sql`
3. `20260714000250_historical_storefront_baseline.sql`
4. `20260714000300_0003_security_advisor_fixes.sql`
5. `20260714000400_0004_catalog_schema_compatibility.sql`
6. `20260714000500_0005_storefront_flow_hardening.sql`
7. `20260714000600_0006_profile_auth_and_product_details.sql`
8. `20260714000700_align_order_items_product_variants.sql`
9. `20260714000800_prevent_profile_role_escalation.sql`
10. `20260714000900_checkout_reservation_expiry.sql`
11. `20260714001000_schema_security_consistency.sql`
12. `20260714001100_transactional_stock_release.sql`
13. `20260714001200_atomic_checkout_and_payment_finalization.sql`
14. `20260714001300_validate_final_schema.sql`
15. `20260714001400_validate_variant_integrity_and_profile_guard.sql`

## Migración nueva

Archivo canónico: `supabase/migrations/20260716165809_validate_variant_integrity_and_profile_guard.sql`

Versión del workdir: `20260714001400_validate_variant_integrity_and_profile_guard.sql`

La migración es forward-only y falla cerrada con `lock_timeout = '5s'` y `statement_timeout = '10min'`. No elimina tablas, columnas, constraints, funciones o datos.

Preflight real antes del push:

| Condición                           | Resultado |
| ----------------------------------- | --------: |
| Items con variante huérfana         |         0 |
| Movimientos con variante huérfana   |         0 |
| Variantes sin espejo                |         0 |
| Divergencias de stock               |         0 |
| Colisiones de cupón normalizado     |         0 |
| Códigos de cupón vacíos             |         0 |
| Códigos que requerían normalización |         0 |
| FK requeridas existentes            |       2/2 |
| FK todavía `NOT VALID`              |       2/2 |

Las columnas `variant_id` de ambas FK tienen índices. No se detectaron datos incompatibles ni fue necesario forzar cambios.

## Dry-run, push e historial

El dry-run enumeró exclusivamente `20260714001400_validate_variant_integrity_and_profile_guard.sql`. No mostró migraciones anteriores, seed u operaciones destructivas.

El push real se ejecutó desde el workdir enlazado a staging y terminó con código 0. Después del push:

- historial local/remoto: 15/15;
- primera versión: `20260714000100`;
- última versión: `20260714001400`;
- migraciones pendientes: 0.

## Datos y objetos afectados

- Se validaron `order_items_variant_id_product_variants_fkey` e `inventory_movements_variant_id_product_variants_fkey`.
- Se agregó y validó `coupons_code_normalized_check`.
- Se actualizaron 0 filas de cupones porque todos los códigos ya estaban normalizados.
- Se recreó `prevent_profile_role_escalation()` como `SECURITY INVOKER`, con `search_path` vacío y ejecución revocada a `public`, `anon` y `authenticated`.
- El trigger `prevent_profile_role_escalation` sigue presente una sola vez.
- No se modificaron filas de variantes, inventario, pedidos o pagos.

Postchecks:

- FK validadas: 2/2;
- check de cupones validado: 1/1;
- códigos no normalizados: 0;
- divergencias de stock: 0;
- función de guard: `SECURITY INVOKER`;
- `search_path`: vacío.

## Lint, advisors y auditoría SQL

`supabase db lint --schema public` terminó con cero errores.

La auditoría SQL final se repitió fuera del historial y terminó correctamente. Estado observado:

| Objeto                              | Resultado |
| ----------------------------------- | --------: |
| Tablas públicas                     |        27 |
| Tablas públicas con RLS             |     27/27 |
| Funciones públicas                  |        28 |
| Triggers activos en `public`/`auth` |        19 |
| Índices públicos                    |        81 |
| Constraints públicos                |       116 |
| Políticas públicas                  |        60 |
| Roles requeridos                    |       3/3 |

Los advisors no reportaron errores ni hallazgos de seguridad. Reportaron 112 warnings de rendimiento heredados:

- 25 `auth_rls_initplan`;
- 86 `multiple_permissive_policies`;
- 1 `duplicate_index` sobre `products.slug`.

No se amplió la migración ya aplicada para corregir advertencias de rendimiento no relacionadas. Deben abordarse en una migración futura, con mediciones y revisión separada.

## RLS, permisos y flujos SQL

La auditoría acumulada verificó:

- RLS habilitado en todas las tablas públicas;
- lectura pública limitada al catálogo activo;
- aislamiento de perfiles, direcciones, carritos y pedidos;
- acceso administrativo basado en `app_metadata`, no en metadata editable por el usuario;
- reserva atómica y rechazo de stock insuficiente;
- rechazo de cantidades manipuladas;
- liberación idempotente de reservas;
- conciliación atómica de pagos;
- webhook duplicado idempotente;
- cupón reservado/consumido una sola vez;
- pago rechazado o cancelado libera stock correctamente.

Los fixtures SQL se ejecutaron en transacciones controladas y no dejaron residuos.

## Auth real contra staging

El 17 de julio se repitió `scripts/validate-staging-auth.mjs` con claves de staging en memoria.

Resultado: 10/10 controles aprobados.

- registro público de usuario efímero;
- confirmación controlada;
- rechazo de contraseña incorrecta;
- login correcto;
- persistencia de sesión y logout;
- generación de recuperación;
- creación automática de perfiles;
- aislamiento de pedidos entre dos usuarios;
- acceso administrativo y denegación de escrituras admin a clientes;
- revocación de sesión del lado servidor.

Configuración pública observada:

- signup habilitado;
- confirmación automática deshabilitada;
- proveedor email habilitado;
- proveedor phone deshabilitado.

El bloqueo previo `429 over_email_send_rate_limit` no volvió a ocurrir al vencer la ventana. No se cambió SMTP, no se aumentaron límites y no se deshabilitó confirmación. Usuarios y pedidos efímeros fueron eliminados al finalizar.

## Tests ejecutados

Después de aplicar la migración y cerrar los cambios locales:

| Validación                         | Resultado                                                |
| ---------------------------------- | -------------------------------------------------------- |
| Prettier write selectivo           | aprobado; no tocó los archivos excluidos                 |
| `format:check` global              | aprobado                                                 |
| ESLint                             | aprobado                                                 |
| TypeScript                         | aprobado                                                 |
| Vitest completo                    | 92/92 en 23 archivos                                     |
| Integración                        | 47/47 en 6 archivos                                      |
| Migration chain aislado            | 23/23                                                    |
| Fallback de URL Vercel             | 3/3                                                      |
| Playwright Chromium                | 88/88                                                    |
| Playwright Firefox                 | 66/66                                                    |
| Playwright WebKit                  | 66/66                                                    |
| Playwright total                   | 220/220 en 14,9 minutos; 0 failed, 0 flaky               |
| Build Next.js                      | aprobado; 30 rutas/páginas                               |
| `npm audit --audit-level=moderate` | 0 vulnerabilidades                                       |
| Secret scan worktree               | aprobado                                                 |
| Secret scan worktree + historial   | aprobado                                                 |
| `git diff --check`                 | aprobado; solo warnings CRLF conocidos sin diff material |

## Preview y pagos sandbox

El proyecto Vercel está enlazado y la CLI autenticada. El target `preview` contiene cero variables. Las nueve variables existentes pertenecen únicamente a `production` y no fueron leídas ni copiadas.

El repositorio fija Node.js `22.x` mediante `engines.node`, que tiene precedencia sobre el valor general `24.x` mostrado por Vercel. Además, la URL de callbacks puede derivarse del `VERCEL_URL` HTTPS de un preview si no se define una URL canónica explícita.

No se creó preview porque faltan Supabase staging runtime, credenciales sandbox, Resend, cron y notificaciones. El proveedor esperado por defecto es Mercado Pago, pero no hay token TEST ni secreto de webhook disponibles en preview o en el entorno local auditado.

No se ejecutaron pagos reales ni sandbox externos. Los casos aprobado, rechazado, cancelado, duplicado, fuera de orden, idempotencia y liberación de stock permanecen validados solo en la capa SQL/tests hasta disponer de credenciales y URL HTTPS.

## Archivos de release y exclusiones

Se excluyen expresamente del release:

- `PRODUCT.md`;
- `lib/catalog-data.ts`.

`0003_security_advisor_fixes.sql` y `0004_catalog_schema_compatibility.sql` no tienen cambios materiales. Los demás falsos positivos de stat/EOL tampoco aparecen en `git diff`; OneDrive vuelve a marcarlos aunque el refresco del índice no altera su contenido.

## Riesgos y próximos pasos

1. Rotar la contraseña de staging previamente compartida por chat.
2. Cargar en Vercel `preview` las variables clasificadas en `docs/production-readiness.md`, sin copiar valores de producción.
3. Configurar SMTP/Resend de staging y validar entrega real, SPF/DKIM y redirects autorizados.
4. Configurar Mercado Pago TEST o Stripe test y ejecutar la matriz externa completa.
5. Crear el preview no productivo y ejecutar health, headers, CORS, Playwright remoto, Auth, checkout, cron y correo.
6. Resolver las advertencias de rendimiento de advisors en una migración separada.
7. Hacer un restore drill antes de planificar producción.

## Confirmaciones

- Migraciones de staging aplicadas: sí, 15/15.
- Migración nueva aplicada: sí, solo en staging.
- `db lint`: limpio.
- Auditoría SQL final: aprobada.
- Auth real: aprobado, 10/10.
- Pago sandbox externo: no ejecutado.
- Preview deploy: no creado.
- Producción modificada: no.
- Git push: no.
- Deploy a producción: no.

## Estado final

**STAGING VALIDADO CON OBSERVACIONES**

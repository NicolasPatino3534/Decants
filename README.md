# DecantsCBA

Tienda online full-stack de decants de perfumes construida con Next.js, React, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, RLS y Storage) y checkout redirigido con Mercado Pago o Stripe.

## Estado de entrega

**No listo para producción hasta completar y documentar el checklist de go-live.** El código incluye controles de autenticación administrativa, conciliación de pagos y liberación de reservas vencidas, pero las credenciales, webhooks, migraciones, backups y alertas del entorno real deben validarse fuera del repositorio.

Estado verificado el 17 de julio de 2026: staging tiene las 15 migraciones del workdir aplicadas, `db lint` limpio, auditoría SQL aprobada y Auth validado con fixtures efímeras. El preview continúa bloqueado porque Vercel no tiene variables para el target `preview`; no se reutilizan las variables de producción. Tampoco se ejecutó todavía un pago externo sandbox.

La guía operativa completa está en [docs/production-readiness.md](docs/production-readiness.md).

## Desarrollo local

Requisitos: Node.js 22, npm y, para tareas de base de datos, Supabase CLI. `package.json` fija `engines.node` en `22.x`, que tiene precedencia sobre el valor general del proyecto Vercel.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`. Sin variables de Supabase usa datos demo únicamente en desarrollo; en producción la ausencia de configuración no habilita un administrador demo.

## Validaciones

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
npm audit
```

## Despliegue resumido

La cadena canónica de `supabase/migrations/` representa la evolución de una base existente, pero no reconstruye por sí sola un proyecto vacío: parte del esquema histórico nació fuera del historial. Por eso no debe ejecutarse `npm run supabase:push` contra una base vacía ni asumirse que el proyecto enlazado es el destino correcto.

Para validar desde cero se usa exclusivamente un proyecto staging descartable:

1. Ejecutar `scripts/prepare-staging-validation.ps1`; el script crea un workdir temporal con el baseline histórico, las migraciones canónicas y validadores, sin escribir en `supabase/migrations/`.
2. Revisar `migration-order.txt`, confirmar el destino y ejecutar dry-run desde ese workdir usando una URL de base suministrada de forma segura.
3. El baseline de `supabase/staging/` es **solo para staging vacío**. Nunca debe copiarse al historial canónico ni aplicarse a producción.

Para una producción existente:

1. Comparar en modo lectura el historial remoto y el esquema real con las migraciones canónicas.
2. Probar el conjunto realmente pendiente sobre una restauración representativa, con backup, dry-run, lint, advisors y postchecks.
3. Aplicar únicamente migraciones canónicas o correctivas forward-only. No renombrar ni reescribir migraciones ya aplicadas.
4. Configurar las variables del target Vercel `preview` según la clasificación exacta de [docs/production-readiness.md](docs/production-readiness.md), con Supabase staging y un único proveedor sandbox; no copiar valores del target `production`.
5. Ejecutar CI, Playwright multibrowser, pruebas sandbox y smoke tests de [docs/production-readiness.md](docs/production-readiness.md).
6. Recién después de aprobar el checklist completo se puede planificar una promoción a producción.

`npm run supabase:link` ya no contiene un `project-ref` fijo. El ref debe pasarse explícitamente y verificarse contra el ambiente autorizado antes de cualquier comando remoto.

No ejecutar `supabase/seed.sql` sobre producción ni usar tarjetas o datos personales reales durante las pruebas.

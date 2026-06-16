# DecantsCBA

Tienda online full-stack para venta de decants de perfumes con Next.js, Tailwind CSS, Supabase, Supabase Auth, PostgreSQL/RLS y Supabase Storage.

## Pasos de producción

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/migrations/0001_init.sql`.
3. Ejecutar el resto de migraciones en orden.
4. Ejecutar `supabase/seed.sql` si querés datos demo.
5. Crear un bucket público `product-images` si no lo creó la migración.
6. Configurar las variables de `.env.example`.
7. Deploy en Vercel con las mismas variables.

La integración de pagos queda preparada en el código, pero la activación del proveedor se configura después.

## Desarrollo local

```bash
npm install
npm run dev
```

Sin variables de Supabase, la app corre en modo demo solo para previsualización. En producción, las rutas leen y escriben contra Supabase.

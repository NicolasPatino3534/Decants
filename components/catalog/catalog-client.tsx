"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import type { ProductFilters, ProductSort } from "@/lib/catalog/filters";
import type { Product } from "@/lib/types";

type PriceFilter = "all" | "under-20000" | "20000-30000" | "over-30000";

export function CatalogClient({ products: initialProducts, initialQuery = "" }: { products: Product[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [family, setFamily] = useState("all");
  const [brand, setBrand] = useState("all");
  const [gender, setGender] = useState("all");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState<ProductSort>("featured");

  const filters = useMemo<ProductFilters>(
    () => ({
      query,
      brand: brand === "all" ? undefined : brand,
      category: category === "all" ? undefined : category,
      family: family === "all" ? undefined : family,
      gender: gender === "all" ? undefined : (gender as Product["gender"]),
      sizeMl: size === "all" ? undefined : Number(size),
      sort,
      ...priceToRange(price),
    }),
    [brand, category, family, gender, price, query, size, sort],
  );

  const { products, isLoading, error } = useProducts(filters, initialProducts);
  const filterSource = initialProducts;
  const categories = useMemo(() => uniqueOptions(filterSource.map((product) => product.category)), [filterSource]);
  const families = useMemo(() => uniqueOptions(filterSource.map((product) => product.family)), [filterSource]);
  const brands = useMemo(() => uniqueOptions(filterSource.map((product) => product.brand)), [filterSource]);
  const genders = useMemo(() => Array.from(new Set(filterSource.map((product) => product.gender))).sort(), [filterSource]);
  const sizes = useMemo(
    () => Array.from(new Set(filterSource.flatMap((product) => product.variants.map((variant) => variant.sizeMl)))).sort((a, b) => a - b),
    [filterSource],
  );

  const activeFilterCount = [query.trim(), category, family, brand, gender, price, size].filter((value) => value && value !== "all").length;

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setFamily("all");
    setBrand("all");
    setGender("all");
    setPrice("all");
    setSize("all");
    setSort("featured");
  }

  return (
    <main className="premium-shell min-h-screen">
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Catalogo premium</p>
            <h1 className="font-display mt-2 text-5xl leading-tight text-ink sm:text-6xl">Encontrar tu proxima firma</h1>
            <p className="mt-4 max-w-xl leading-7 text-[#5f574c]">
              Busca por nombre, nota o marca y compara tamaños antes de agregar al carrito.
            </p>
          </div>
          <div className="grid content-end gap-3 sm:grid-cols-3">
            <TrustItem icon={<BadgeCheck size={17} />} title="Originalidad" />
            <TrustItem icon={<Sparkles size={17} />} title="Curaduria" />
            <TrustItem icon={<SlidersHorizontal size={17} />} title="Filtros utiles" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-md border border-line bg-white p-4 shadow-[0_18px_50px_rgba(11,13,15,0.06)]">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
            <label className="relative lg:col-span-2">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#81786b]" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, nota o marca"
                className="h-12 w-full rounded-md border border-line bg-mist pl-10 pr-3 text-sm font-semibold text-ink outline-none focus:border-[#b88939]"
              />
            </label>
            <FilterSelect label="Marca" value={brand} onChange={setBrand} options={brands} />
            <FilterSelect label="Familia" value={family} onChange={setFamily} options={families} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto]">
            <FilterSelect label="Categoria" value={category} onChange={setCategory} options={categories} />
            <FilterSelect label="Genero" value={gender} onChange={setGender} options={genders.map((value) => ({ label: value, value }))} />
            <FilterSelect
              label="Precio"
              value={price}
              onChange={(value) => setPrice(value as PriceFilter)}
              options={[
                { label: "Hasta $20.000", value: "under-20000" },
                { label: "$20.000 - $30.000", value: "20000-30000" },
                { label: "Mas de $30.000", value: "over-30000" },
              ]}
            />
            <FilterSelect label="Tamaño" value={size} onChange={setSize} options={sizes.map((value) => ({ label: `${value}ml`, value: String(value) }))} />
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#7b7164]">Orden</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ProductSort)}
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-[#b88939]"
              >
                <option value="featured">Destacados</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
                <option value="name-asc">Nombre A-Z</option>
                <option value="name-desc">Nombre Z-A</option>
                <option value="best-selling">Mas vendidos</option>
              </select>
            </label>
            <Button variant="subtle" className="h-11 self-end whitespace-nowrap" onClick={clearFilters}>
              <X size={16} />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#5f574c]">
            <SlidersHorizontal size={17} />
            {isLoading ? "Cargando perfumes..." : `${products.length} decants disponibles`}
            {activeFilterCount > 0 ? <span className="rounded-md bg-[#edf2ee] px-2 py-1 text-xs text-[#5f7d69]">{activeFilterCount} filtros activos</span> : null}
          </div>
          <p className="text-sm text-[#6f6658]">Tip: 2ml para testear, 5ml para comparar, 10ml para convivir con la fragancia.</p>
        </div>

        {error ? <CatalogError message={error} onRetry={clearFilters} /> : null}
        {isLoading ? <CatalogSkeleton /> : null}

        {!isLoading && !error && products.length > 0 ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 3} />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && products.length === 0 ? <CatalogEmpty onClear={clearFilters} /> : null}
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#7b7164]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-[#b88939]"
      >
        <option value="all">Todas</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TrustItem({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-[#fbfaf7] p-4 text-sm font-bold text-ink">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-white">{icon}</span>
      {title}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando productos">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-md border border-line bg-white">
          <div className="aspect-[4/3] animate-pulse bg-mist" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 animate-pulse rounded bg-mist" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-mist" />
            <div className="h-11 w-full animate-pulse rounded bg-mist" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CatalogError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-7 rounded-md border border-[#e1c7bf] bg-[#fff8f5] p-6 text-center">
      <AlertCircle className="mx-auto text-[#9a3f2f]" size={24} />
      <p className="mt-3 font-black text-ink">Ocurrio un error</p>
      <p className="mt-1 text-sm text-[#6f6658]">{message}</p>
      <Button className="mt-5" variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function CatalogEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-7 rounded-md border border-line bg-white p-10 text-center">
      <p className="font-display text-3xl text-ink">No encontramos decants</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6f6658]">
        Proba quitar filtros o buscar por otra nota olfativa. Tambien podes empezar por familias frescas, ambaradas o florales.
      </p>
      <Button className="mt-6" variant="secondary" onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}

function uniqueOptions(items: Array<{ name: string; slug: string }>) {
  return Array.from(new Map(items.map((item) => [item.slug, { label: item.name, value: item.slug }])).values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function priceToRange(price: PriceFilter) {
  if (price === "under-20000") return { maxPriceCents: 2000000 };
  if (price === "20000-30000") return { minPriceCents: 2000000, maxPriceCents: 3000000 };
  if (price === "over-30000") return { minPriceCents: 3000000 };
  return {};
}

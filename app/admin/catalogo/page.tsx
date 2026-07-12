import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminCatalog } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

export default async function AdminCatalogPage() {
  const products = await getAdminCatalog();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6f24]">Catálogo</p>
          <h1 className="mt-2 text-3xl font-black text-ink">Productos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#665d50]">
            Lista simple para entrar al detalle de cada perfume y editar datos, imágenes, stock, estado y variantes.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-[#665d50]">
          <PackageSearch size={17} className="text-[#b8872f]" />
          {products.length} productos
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-md border border-line bg-white">
        <div className="grid gap-3 p-3 lg:hidden">
          {products.map((product) => {
            const stock = product.variants.reduce((sum, variant) => sum + variant.stockOnHand, 0);
            const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((variant) => variant.priceCents)) : 0;
            return (
              <article key={product.id} className="rounded-md border border-line bg-[#fbfaf6] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-black text-ink">{product.name}</p>
                    <p className="mt-1 text-xs text-[#756b5d]">{product.brand.name}</p>
                  </div>
                  <StatusBadge tone={product.status === "active" ? "green" : product.status === "archived" ? "neutral" : "amber"}>
                    {product.status}
                  </StatusBadge>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a806f]">Categoria</dt>
                    <dd className="mt-1 text-[#665d50]">{product.category.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a806f]">Stock</dt>
                    <dd className="mt-1 font-black text-ink">{stock}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a806f]">Precio</dt>
                    <dd className="mt-1 font-black text-ink">{minPrice ? formatMoney(minPrice) : "Sin variantes"}</dd>
                  </div>
                </dl>
                <Link
                  href={`/admin/catalogo/${product.id}`}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#caa55c] bg-white px-3 text-sm font-bold leading-none text-ink transition hover:bg-[#f8f1e3]"
                >
                  Ver detalle <ArrowRight size={15} />
                </Link>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-mist text-[#665d50]">
              <tr>
                <th className="px-4 py-3 font-bold">Producto</th>
                <th className="px-4 py-3 font-bold">Categoria</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Stock</th>
                <th className="px-4 py-3 font-bold">Precio</th>
                <th className="px-4 py-3 font-bold">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => {
                const stock = product.variants.reduce((sum, variant) => sum + variant.stockOnHand, 0);
                const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((variant) => variant.priceCents)) : 0;
                return (
                  <tr key={product.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-black text-ink">{product.name}</p>
                      <p className="mt-1 text-xs text-[#756b5d]">{product.brand.name}</p>
                    </td>
                    <td className="px-4 py-4 text-[#665d50]">{product.category.name}</td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={product.status === "active" ? "green" : product.status === "archived" ? "neutral" : "amber"}>
                        {product.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 font-bold text-ink">{stock}</td>
                    <td className="px-4 py-4 font-bold text-ink">{minPrice ? formatMoney(minPrice) : "Sin variantes"}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/catalogo/${product.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[#caa55c] bg-white px-3 text-sm font-bold leading-none text-ink transition hover:bg-[#f8f1e3]"
                      >
                        Ver detalle <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {products.length === 0 ? <p className="p-6 text-sm text-[#665d50]">Todavia no hay productos cargados.</p> : null}
      </section>
    </div>
  );
}

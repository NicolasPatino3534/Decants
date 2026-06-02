import { adjustStock } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { getAdminCatalog, getInventoryMovements } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

export default async function AdminStockPage() {
  const [products, movements] = await Promise.all([getAdminCatalog(), getInventoryMovements()]);
  const rows = products.flatMap((product) => product.variants.map((variant) => ({ product, variant })));

  return (
    <div>
      <h1 className="text-3xl font-black">Stock</h1>
      <p className="mt-2 text-neutral-600">Ajustes de inventario y movimientos recientes.</p>

      <section className="mt-6 overflow-hidden rounded-md border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-mist text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Umbral</th>
                <th className="px-4 py-3 font-semibold">Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ product, variant }) => (
                <tr key={variant.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold">{product.name}</p>
                    <p className="text-neutral-500">{variant.sizeMl}ml</p>
                  </td>
                  <td className="px-4 py-3">{variant.sku}</td>
                  <td className="px-4 py-3 font-bold">{formatMoney(variant.priceCents)}</td>
                  <td className={`px-4 py-3 font-black ${variant.stockOnHand <= variant.lowStockThreshold ? "text-amber" : "text-ink"}`}>
                    {variant.stockOnHand}
                  </td>
                  <td className="px-4 py-3">{variant.lowStockThreshold}</td>
                  <td className="px-4 py-3">
                    <form action={adjustStock} className="flex gap-2">
                      <input type="hidden" name="variantId" value={variant.id} />
                      <input name="quantity" type="number" placeholder="+5" className="h-10 w-20 rounded-md border border-line px-2 text-sm" />
                      <input name="note" placeholder="Nota interna" className="h-10 w-40 rounded-md border border-line px-2 text-sm" />
                      <Button variant="secondary" className="h-10">Aplicar</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">Historial de movimientos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-neutral-500">
              <tr>
                <th className="py-3 font-semibold">Fecha</th>
                <th className="py-3 font-semibold">Producto</th>
                <th className="py-3 font-semibold">SKU</th>
                <th className="py-3 font-semibold">Cantidad</th>
                <th className="py-3 font-semibold">Motivo</th>
                <th className="py-3 font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="py-3">{new Date(movement.createdAt).toLocaleString("es-AR")}</td>
                  <td className="py-3">{movement.productName} {movement.sizeMl ? `${movement.sizeMl}ml` : ""}</td>
                  <td className="py-3">{movement.sku}</td>
                  <td className={`py-3 font-black ${movement.quantity < 0 ? "text-danger" : "text-moss"}`}>{movement.quantity}</td>
                  <td className="py-3">{movement.reason}</td>
                  <td className="py-3 text-neutral-500">{movement.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 ? <p className="py-4 text-sm text-neutral-500">Todavia no hay movimientos registrados.</p> : null}
        </div>
      </section>
    </div>
  );
}

import { createBrand, deleteBrand, updateBrand } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { getAdminBrands } from "@/lib/data/admin";

export default async function AdminBrandsPage() {
  const brands = await getAdminBrands();

  return (
    <div>
      <h1 className="text-3xl font-black">Marcas</h1>
      <p className="mt-2 text-neutral-600">Gestion de casas perfumistas y marcas del catalogo.</p>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">Nueva marca</h2>
        <form action={createBrand} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input name="name" label="Nombre" required />
          <Input name="country" label="Pais" />
          <Button className="self-end">Crear</Button>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">Listado</h2>
        <div className="mt-4 divide-y divide-line">
          {brands.map((brand) => (
            <form key={brand.id} action={updateBrand} className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto_auto]">
              <input type="hidden" name="id" value={brand.id} />
              <Input name="name" label="Nombre" defaultValue={brand.name} required />
              <Input name="country" label="Pais" defaultValue={brand.country ?? ""} />
              <Button variant="secondary" className="self-end">Guardar</Button>
              <button formAction={deleteBrand} className="self-end rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-danger">
                Eliminar
              </button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

function Input({ name, label, defaultValue, required }: { name: string; label: string; defaultValue?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

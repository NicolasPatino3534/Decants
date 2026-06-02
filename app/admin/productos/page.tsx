import { archiveProduct, createProduct, deleteVariant, updateProduct, upsertVariant } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminBrands, getAdminCatalog, getAdminCategories } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

const genders = ["unisex", "feminine", "masculine"];
const statuses = ["draft", "active", "archived"];

export default async function AdminProductsPage() {
  const [products, brands, categories] = await Promise.all([getAdminCatalog(), getAdminBrands(), getAdminCategories()]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Productos</h1>
          <p className="mt-2 text-neutral-600">CRUD de catalogo, imagenes y variantes por tamano.</p>
        </div>
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">Nuevo producto</h2>
        <form action={createProduct} className="mt-4 grid gap-3 md:grid-cols-3" encType="multipart/form-data">
          <Input name="name" label="Nombre" required />
          <Select name="brandId" label="Marca" options={brands.map((brand) => ({ label: brand.name, value: brand.id }))} />
          <Select name="categoryId" label="Categoria" options={categories.map((category) => ({ label: category.name, value: category.id }))} />
          <Input name="concentration" label="Concentracion" defaultValue="Eau de Parfum" />
          <Select name="gender" label="Genero" options={genders.map((value) => ({ label: value, value }))} />
          <Select name="status" label="Estado" options={statuses.map((value) => ({ label: value, value }))} />
          <Input name="notesTop" label="Notas salida" placeholder="Bergamota, lima" />
          <Input name="notesHeart" label="Notas corazon" placeholder="Cedro, neroli" />
          <Input name="notesBase" label="Notas fondo" placeholder="Ambar, musk" />
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-bold">Descripcion</span>
            <textarea name="description" required className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-bold">Imagen</span>
            <input name="image" type="file" accept="image/*" className="h-11 w-full rounded-md border border-line px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-3">
            <input name="featured" type="checkbox" />
            Destacado
          </label>
          <Button className="md:col-span-3 md:w-fit">Crear producto</Button>
        </form>
      </section>

      <section className="mt-6 grid gap-5">
        {products.map((product) => (
          <ProductEditor key={product.id} product={product} brands={brands} categories={categories} />
        ))}
      </section>
    </div>
  );
}

function ProductEditor({
  product,
  brands,
  categories,
}: {
  product: Product;
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  const stock = product.variants.reduce((sum, variant) => sum + variant.stockOnHand, 0);
  const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((variant) => variant.priceCents)) : 0;

  return (
    <article className="rounded-md border border-line bg-white p-5">
      <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black">{product.name}</h2>
            <StatusBadge tone={product.status === "active" ? "green" : product.status === "archived" ? "neutral" : "amber"}>{product.status}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {product.brand.name} - {product.category.name} - Stock {stock} - Desde {formatMoney(minPrice)}
          </p>
        </div>
        <form action={archiveProduct}>
          <input type="hidden" name="id" value={product.id} />
          <Button variant="secondary" className="h-10">
            Archivar
          </Button>
        </form>
      </div>

      <form action={updateProduct} className="mt-4 grid gap-3 md:grid-cols-3" encType="multipart/form-data">
        <input type="hidden" name="id" value={product.id} />
        <Input name="name" label="Nombre" defaultValue={product.name} required />
        <Select name="brandId" label="Marca" defaultValue={product.brand.id} options={brands.map((brand) => ({ label: brand.name, value: brand.id }))} />
        <Select name="categoryId" label="Categoria" defaultValue={product.category.id} options={categories.map((category) => ({ label: category.name, value: category.id }))} />
        <Input name="concentration" label="Concentracion" defaultValue={product.concentration} />
        <Select name="gender" label="Genero" defaultValue={product.gender} options={genders.map((value) => ({ label: value, value }))} />
        <Select name="status" label="Estado" defaultValue={product.status} options={statuses.map((value) => ({ label: value, value }))} />
        <Input name="notesTop" label="Notas salida" defaultValue={product.notesTop.join(", ")} />
        <Input name="notesHeart" label="Notas corazon" defaultValue={product.notesHeart.join(", ")} />
        <Input name="notesBase" label="Notas fondo" defaultValue={product.notesBase.join(", ")} />
        <label className="md:col-span-2">
          <span className="mb-1 block text-sm font-bold">Descripcion</span>
          <textarea name="description" defaultValue={product.description} className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
        </label>
        <label>
          <span className="mb-1 block text-sm font-bold">Nueva imagen</span>
          <input name="image" type="file" accept="image/*" className="h-11 w-full rounded-md border border-line px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold md:col-span-3">
          <input name="featured" type="checkbox" defaultChecked={product.featured} />
          Destacado
        </label>
        <Button className="md:col-span-3 md:w-fit">Guardar producto</Button>
      </form>

      <div className="mt-5 rounded-md border border-line">
        <div className="border-b border-line bg-mist px-4 py-3 font-black">Variantes</div>
        <div className="divide-y divide-line">
          {product.variants.map((variant) => (
            <form key={variant.id} action={upsertVariant} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto]">
              <input type="hidden" name="id" value={variant.id} />
              <input type="hidden" name="productId" value={product.id} />
              <Input name="sizeMl" label="Tamano ml" type="number" defaultValue={String(variant.sizeMl)} />
              <Input name="sku" label="SKU" defaultValue={variant.sku} />
              <Input name="price" label="Precio" type="number" defaultValue={String(variant.priceCents / 100)} />
              <Input name="stock" label="Stock" type="number" defaultValue={String(variant.stockOnHand)} />
              <Input name="lowStockThreshold" label="Umbral" type="number" defaultValue={String(variant.lowStockThreshold)} />
              <Button variant="secondary" className="self-end">
                Guardar
              </Button>
              <button
                formAction={deleteVariant}
                className="self-end rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-danger"
              >
                Eliminar
              </button>
            </form>
          ))}
          <form action={upsertVariant} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <input type="hidden" name="productId" value={product.id} />
            <Input name="sizeMl" label="Tamano ml" type="number" placeholder="2" />
            <Input name="sku" label="SKU" placeholder="SKU-2ML" />
            <Input name="price" label="Precio" type="number" placeholder="16000" />
            <Input name="stock" label="Stock" type="number" placeholder="10" />
            <Input name="lowStockThreshold" label="Umbral" type="number" defaultValue="5" />
            <Button className="self-end">Agregar</Button>
          </form>
        </div>
      </div>
    </article>
  );
}

function Input({
  name,
  label,
  required,
  defaultValue,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-11 w-full rounded-md border border-line px-3 text-sm">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

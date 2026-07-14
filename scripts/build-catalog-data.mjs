import fs from "node:fs/promises";

const input = process.argv[2] ?? "catalog-extracted.json";
const output = process.argv[3] ?? "lib/catalog-data.ts";
const [{ rows }] = JSON.parse(await fs.readFile(input, "utf8"));

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseMoney(value) {
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function parseSize(value) {
  const number = Number(
    String(value)
      .replace(",", ".")
      .match(/\d+(?:\.\d+)?/)?.[0] ?? 0,
  );
  return Number.isFinite(number) ? number : 0;
}

function parseName(rawName) {
  const brandMatch = String(rawName).match(/\(([^)]+)\)/);
  const brand = brandMatch?.[1]?.trim() || "Decants CBA";
  const name = String(rawName)
    .replace(/\s*\[[^\]]+\]/g, "")
    .trim();
  return { name, brand };
}

function parseNotes(description, label) {
  const expression = new RegExp(`(?:${label}) son ([^.;]+)`, "i");
  const match = String(description).match(expression);
  if (!match) return [];
  return match[1]
    .split(/,|\sy\s/)
    .map((note) => note.trim())
    .filter(Boolean)
    .map((note) => note.charAt(0).toUpperCase() + note.slice(1));
}

function parseGender(description) {
  const text = String(description).toLowerCase();
  if (text.includes("para hombres y mujeres")) return "unisex";
  if (text.includes("para mujeres")) return "feminine";
  if (text.includes("para hombres")) return "masculine";
  return "unisex";
}

function categoryName(value) {
  const categories = {
    ARABE: "Arabe",
    GENERAL: "General",
    "NICHO-AUTOR": "Nicho autor",
    DISEÑADOR: "Disenador",
    PROMOS: "Promos",
  };
  return categories[value] ?? value;
}

const productsById = new Map();

for (const row of rows.slice(1)) {
  const [
    sourceId,
    rawName,
    rawCategory,
    rawSize,
    rawPrice,
    regularPrice,
    salePrice,
    offer,
    description,
    productUrl,
    imageUrl,
  ] = row;
  if (!sourceId || !rawName || !rawSize) continue;

  const { name, brand } = parseName(rawName);
  const productSlug = slugify(
    productUrl
      ? String(productUrl).split("/").filter(Boolean).pop()
      : `${name}-${sourceId}`,
  );
  const category = categoryName(rawCategory);
  const categorySlug = slugify(category);
  const price =
    offer === "Si" && salePrice ? salePrice : rawPrice || regularPrice;
  const sizeMl = parseSize(rawSize);

  if (!productsById.has(sourceId)) {
    const brandSlug = slugify(brand);
    productsById.set(sourceId, {
      id: `prod_${sourceId}`,
      name,
      slug: productSlug,
      brand: { id: `brand_${brandSlug}`, name: brand, slug: brandSlug },
      category: {
        id: `cat_${categorySlug}`,
        name: category,
        slug: categorySlug,
      },
      family: { id: `cat_${categorySlug}`, name: category, slug: categorySlug },
      concentration: "Decant",
      description: description || `${name} disponible en decants.`,
      notesTop: parseNotes(description, "Notas de Salida"),
      notesHeart: parseNotes(description, "Notas de Corazón|Notas de Corazon"),
      notesBase: parseNotes(description, "Notas de Fondo"),
      gender: parseGender(description),
      status: "active",
      featured: productsById.size < 6,
      imageUrl: imageUrl || "/images/hero-decants.png",
      variants: [],
    });
  }

  const product = productsById.get(sourceId);
  if (sizeMl > 0 && price) {
    product.variants.push({
      id: `var_${sourceId}_${String(sizeMl).replace(".", "_")}ml`,
      sizeMl,
      priceCents: parseMoney(price),
      stockOnHand: 20,
      lowStockThreshold: 4,
      sku: `${product.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${String(sizeMl).replace(".", "-")}ML`,
      active: true,
    });
  }
}

const products = [...productsById.values()]
  .map((product) => ({
    ...product,
    variants: product.variants.sort((a, b) => a.sizeMl - b.sizeMl),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const content = `import type { Product } from "@/lib/types";

export const catalogProducts: Product[] = ${JSON.stringify(products, null, 2)};
`;

await fs.writeFile(output, content);
console.log(`Wrote ${products.length} products to ${output}`);

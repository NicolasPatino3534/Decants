import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const action = process.argv[2];
assert.ok(
  action === "setup" || action === "cleanup",
  "Usage: node scripts/manage-preview-catalog-fixture.mjs <setup|cleanup>",
);

const projectRef = requiredEnv("STAGING_PROJECT_REF");
const supabaseUrl = requiredAnyEnv(
  "STAGING_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
);
const serviceRoleKey = requiredAnyEnv(
  "STAGING_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
);
assert.equal(
  new URL(supabaseUrl).hostname,
  `${projectRef}.supabase.co`,
  "Refusing to manage fixtures in an unexpected Supabase project.",
);

const statePath = path.resolve(
  process.env.PREVIEW_CATALOG_FIXTURE_STATE ??
    path.join(os.tmpdir(), `decants-preview-catalog-${projectRef}.json`),
);
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

if (action === "setup") await setup();
else await cleanup(await readState());

async function setup() {
  if (fs.existsSync(statePath)) {
    await cleanup(await readState());
  }

  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  const state = {
    brandId: randomUUID(),
    familyId: randomUUID(),
    productIds: [randomUUID(), randomUUID()],
    variantIds: [randomUUID(), randomUUID()],
    runId,
  };
  const slug = `preview-qa-${runId}`;

  try {
    await insert("brands", {
      id: state.brandId,
      name: `Preview QA ${runId}`,
      slug,
      country: "AR",
    });
    await insert("fragrance_families", {
      id: state.familyId,
      name: `Preview QA ${runId}`,
      slug,
    });

    for (const [index, productId] of state.productIds.entries()) {
      const variantId = state.variantIds[index];
      const productSlug = `${slug}-${index + 1}`;
      const productName = `Preview QA ${index === 0 ? "Cedro" : "Jazmin"} ${runId}`;
      await insert("products", {
        id: productId,
        brand_id: state.brandId,
        family_id: state.familyId,
        category_id: state.familyId,
        name: productName,
        slug: productSlug,
        concentration: "QA",
        description: "Fixture efimero para pruebas Playwright de Preview.",
        notes_top: index === 0 ? ["cedro"] : ["jazmin"],
        notes_heart: [],
        notes_base: [],
        top_notes: index === 0 ? ["cedro"] : ["jazmin"],
        heart_notes: [],
        base_notes: [],
        gender: "unisex",
        status: "active",
        active: true,
        featured: false,
      });
      await insert("decant_variants", {
        id: variantId,
        product_id: productId,
        size_ml: 5,
        sku: `PREVIEW-D-${runId}-${index + 1}`,
        price_cents: 1000 + index * 100,
        stock_on_hand: 20,
        low_stock_threshold: 1,
        is_active: true,
      });
      await insert("product_variants", {
        id: variantId,
        product_id: productId,
        size_ml: 5,
        sku: `PREVIEW-P-${runId}-${index + 1}`,
        price_cents: 1000 + index * 100,
        stock: 20,
        low_stock_threshold: 1,
        active: true,
      });
    }

    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
    console.log("Ephemeral Preview catalog fixture created in staging.");
  } catch (error) {
    await cleanup(state, { removeState: false });
    throw error;
  }
}

async function cleanup(state, { removeState = true } = {}) {
  const brandIds = state.brandIds ?? [state.brandId];
  const familyIds = state.familyIds ?? [state.familyId];
  const steps = [
    ["inventory_movements", "variant_id", state.variantIds],
    ["product_variants", "id", state.variantIds],
    ["decant_variants", "id", state.variantIds],
    ["products", "id", state.productIds],
    ["categories", "id", familyIds],
    ["fragrance_families", "id", familyIds],
    ["perfume_brands", "id", brandIds],
    ["brands", "id", brandIds],
  ];

  for (const [table, column, value] of steps) {
    const query = admin.from(table).delete();
    const result = Array.isArray(value)
      ? await query.in(column, value)
      : await query.eq(column, value);
    assert.ifError(result.error);
  }

  const remaining = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("id", state.productIds);
  assert.ifError(remaining.error);
  assert.equal(
    remaining.count,
    0,
    "Preview catalog fixture cleanup was incomplete.",
  );

  if (removeState) fs.rmSync(statePath, { force: true });
  console.log("Ephemeral Preview catalog fixture removed from staging.");
}

async function insert(table, values) {
  const result = await admin.from(table).insert(values);
  assert.ifError(result.error);
}

async function readState() {
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  }

  const products = await admin
    .from("products")
    .select("id,brand_id,family_id,slug")
    .eq("description", "Fixture efimero para pruebas Playwright de Preview.")
    .like("slug", "preview-qa-%");
  assert.ifError(products.error);
  assert.ok(
    products.data?.length,
    "Preview catalog fixture state is missing and no QA records were found.",
  );

  const productIds = products.data.map((product) => product.id);
  const variants = await admin
    .from("decant_variants")
    .select("id")
    .in("product_id", productIds);
  assert.ifError(variants.error);

  return {
    productIds,
    variantIds: variants.data.map((variant) => variant.id),
    brandIds: [...new Set(products.data.map((product) => product.brand_id))],
    familyIds: [...new Set(products.data.map((product) => product.family_id))],
  };
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requiredAnyEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`One of ${names.join(", ")} is required.`);
}

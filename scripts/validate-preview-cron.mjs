import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const projectRef = requiredEnv("STAGING_PROJECT_REF");
const supabaseUrl = requiredAnyEnv(
  "STAGING_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
);
const serviceRoleKey = requiredAnyEnv(
  "STAGING_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
);
const cronSecret = requiredEnv("CRON_SECRET");
const previewBaseUrl = requiredEnv("PREVIEW_BASE_URL").replace(/\/$/u, "");

assert.equal(
  new URL(supabaseUrl).hostname,
  `${projectRef}.supabase.co`,
  "Refusing to validate the cron against an unexpected Supabase project.",
);
assert.equal(
  new URL(previewBaseUrl).protocol,
  "https:",
  "Preview cron validation requires HTTPS.",
);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
const runId = randomUUID().replaceAll("-", "").slice(0, 16);
const ids = {
  brand: randomUUID(),
  family: randomUUID(),
  product: randomUUID(),
  variant: randomUUID(),
  expiredOrder: randomUUID(),
  futureOrder: randomUUID(),
  paidOrder: randomUUID(),
};
const stockBeforeRelease = 14;
const expiredQuantity = 2;
const protectionHeaders = await createProtectionHeaders(previewBaseUrl);

try {
  await expectUnauthorized();
  await createFixtures();

  const responses = await Promise.all([invokeCron(), invokeCron()]);
  for (const response of responses) {
    assert.equal(response.status, 200, "Concurrent cron invocation failed.");
    assert.equal(response.body?.ok, true);
  }

  await assertReleaseState(stockBeforeRelease + expiredQuantity);

  const retry = await invokeCron();
  assert.equal(retry.status, 200, "Idempotent cron retry failed.");
  assert.equal(retry.body?.ok, true);
  await assertReleaseState(stockBeforeRelease + expiredQuantity);

  console.log(
    "Preview cron validation passed: authentication, expiration, concurrency, order isolation and idempotency.",
  );
} finally {
  await cleanup();
}

async function expectUnauthorized() {
  for (const authorization of [undefined, "Bearer invalid-preview-secret"]) {
    const url = new URL("/api/cron/release-stock", previewBaseUrl);
    url.searchParams.set("validation", randomUUID());
    const response = await fetch(url, {
      headers: {
        ...protectionHeaders,
        ...(authorization ? { authorization } : {}),
      },
      cache: "no-store",
    });
    assert.equal(
      response.status,
      401,
      "Cron endpoint accepted an invalid caller.",
    );
  }
}

async function invokeCron() {
  const url = new URL("/api/cron/release-stock", previewBaseUrl);
  url.searchParams.set("validation", randomUUID());
  const response = await fetch(url, {
    headers: {
      ...protectionHeaders,
      authorization: `Bearer ${cronSecret}`,
    },
    cache: "no-store",
  });
  return { status: response.status, body: await response.json() };
}

async function createProtectionHeaders(url) {
  const automationSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (automationSecret) {
    return { "x-vercel-protection-bypass": automationSecret };
  }

  const shareSecret = process.env.VERCEL_SHARE_BYPASS?.trim();
  if (!shareSecret) return {};
  const shareUrl = new URL(url);
  shareUrl.searchParams.set("_vercel_share", shareSecret);
  const response = await fetch(shareUrl, { redirect: "manual" });
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Vercel share bypass did not establish a cookie.");
  return { cookie: setCookie.split(";", 1)[0] };
}

async function createFixtures() {
  const suffix = `cron-${runId}`;
  await insert("brands", {
    id: ids.brand,
    name: `Cron QA ${runId}`,
    slug: suffix,
    country: "AR",
  });
  await insert("fragrance_families", {
    id: ids.family,
    name: `Cron QA ${runId}`,
    slug: suffix,
  });
  await insert("products", {
    id: ids.product,
    brand_id: ids.brand,
    family_id: ids.family,
    category_id: ids.family,
    name: `Cron QA ${runId}`,
    slug: suffix,
    concentration: "QA",
    description: "Fixture efímero para validar liberación de stock.",
    notes_top: [],
    notes_heart: [],
    notes_base: [],
    top_notes: [],
    heart_notes: [],
    base_notes: [],
    gender: "unisex",
    status: "active",
    active: true,
    featured: false,
  });
  await insert("decant_variants", {
    id: ids.variant,
    product_id: ids.product,
    size_ml: 5,
    sku: `CRON-D-${runId}`,
    price_cents: 1000,
    stock_on_hand: stockBeforeRelease,
    low_stock_threshold: 1,
    is_active: true,
  });
  await insert("product_variants", {
    id: ids.variant,
    product_id: ids.product,
    size_ml: 5,
    sku: `CRON-P-${runId}`,
    price_cents: 1000,
    stock: stockBeforeRelease,
    low_stock_threshold: 1,
    active: true,
  });

  const now = Date.now();
  await insert("orders", [
    orderFixture(ids.expiredOrder, "expired", {
      status: "pending_payment",
      payment_status: "pending",
      reservation_expires_at: new Date(now - 60_000).toISOString(),
    }),
    orderFixture(ids.futureOrder, "future", {
      status: "pending_payment",
      payment_status: "pending",
      reservation_expires_at: new Date(now + 30 * 60_000).toISOString(),
    }),
    orderFixture(ids.paidOrder, "paid", {
      status: "paid",
      payment_status: "paid",
      reservation_expires_at: new Date(now - 60_000).toISOString(),
    }),
  ]);
  await insert("order_items", [
    itemFixture(ids.expiredOrder, expiredQuantity),
    itemFixture(ids.futureOrder, 3),
    itemFixture(ids.paidOrder, 1),
  ]);
}

function orderFixture(id, label, state) {
  return {
    id,
    order_number: `CRON-${runId}-${label}`,
    ...state,
    shipment_status: "pending",
    subtotal_cents: 1000,
    shipping_cents: 0,
    discount_cents: 0,
    total_cents: 1000,
    customer_email: `cron-${runId}@example.invalid`,
    customer_name: "Cron QA",
    shipping_address: { line1: "QA only" },
    checkout_idempotency_key: `cron-${runId}-${label}`,
    notes: `preview-cron-validation:${runId}`,
  };
}

function itemFixture(orderId, quantity) {
  return {
    order_id: orderId,
    product_id: ids.product,
    variant_id: ids.variant,
    product_name: `Cron QA ${runId}`,
    variant_label: "5 ml",
    quantity,
    unit_price_cents: 1000,
    total_cents: quantity * 1000,
  };
}

async function assertReleaseState(expectedStock) {
  const orders = await admin
    .from("orders")
    .select("id,status,payment_status,stock_released_at")
    .in("id", [ids.expiredOrder, ids.futureOrder, ids.paidOrder]);
  assert.ifError(orders.error);
  assert.equal(orders.data?.length, 3);

  const byId = new Map(orders.data.map((order) => [order.id, order]));
  assert.equal(byId.get(ids.expiredOrder)?.status, "cancelled");
  assert.equal(byId.get(ids.expiredOrder)?.payment_status, "failed");
  assert.ok(byId.get(ids.expiredOrder)?.stock_released_at);
  assert.equal(byId.get(ids.futureOrder)?.status, "pending_payment");
  assert.equal(byId.get(ids.futureOrder)?.payment_status, "pending");
  assert.equal(byId.get(ids.futureOrder)?.stock_released_at, null);
  assert.equal(byId.get(ids.paidOrder)?.status, "paid");
  assert.equal(byId.get(ids.paidOrder)?.payment_status, "paid");
  assert.equal(byId.get(ids.paidOrder)?.stock_released_at, null);

  const [modern, legacy, movements] = await Promise.all([
    admin
      .from("product_variants")
      .select("stock")
      .eq("id", ids.variant)
      .single(),
    admin
      .from("decant_variants")
      .select("stock_on_hand")
      .eq("id", ids.variant)
      .single(),
    admin
      .from("inventory_movements")
      .select("order_id,quantity,reason")
      .eq("variant_id", ids.variant),
  ]);
  assert.ifError(modern.error);
  assert.ifError(legacy.error);
  assert.ifError(movements.error);
  assert.equal(modern.data.stock, expectedStock);
  assert.equal(legacy.data.stock_on_hand, expectedStock);
  assert.deepEqual(movements.data, [
    { order_id: ids.expiredOrder, quantity: expiredQuantity, reason: "return" },
  ]);
}

async function insert(table, values) {
  const result = await admin.from(table).insert(values);
  assert.ifError(result.error);
}

async function cleanup() {
  const cleanupSteps = [
    ["inventory_movements", "variant_id", ids.variant],
    ["orders", "id", [ids.expiredOrder, ids.futureOrder, ids.paidOrder]],
    ["product_variants", "id", ids.variant],
    ["decant_variants", "id", ids.variant],
    ["products", "id", ids.product],
    ["categories", "id", ids.family],
    ["fragrance_families", "id", ids.family],
    ["perfume_brands", "id", ids.brand],
    ["brands", "id", ids.brand],
  ];

  for (const [table, column, value] of cleanupSteps) {
    const query = admin.from(table).delete();
    const result = Array.isArray(value)
      ? await query.in(column, value)
      : await query.eq(column, value);
    if (result.error) {
      console.error(
        `Cleanup failed for ${table}: ${result.error.code ?? "unknown"} ${result.error.message}`,
      );
    }
  }
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

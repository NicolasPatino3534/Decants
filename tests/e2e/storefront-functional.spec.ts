import { expect, test, type Page } from "@playwright/test";

type CatalogProduct = {
  name: string;
  slug: string;
  brand?: { name?: string };
  category?: { name?: string };
  concentration?: string;
  notesTop?: string[];
  notesHeart?: string[];
  notesBase?: string[];
  variants?: Array<{ stockOnHand?: number; stock_on_hand?: number }>;
};

test("home search server-renders only matching catalog products", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/catalog/products");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { products?: CatalogProduct[] };
  const products = payload.products ?? [];
  const searchCase = products
    .map((product) => ({
      query: product.name,
      matches: products.filter((candidate) =>
        productMatchesQuery(candidate, product.name),
      ),
    }))
    .find(({ query, matches }) => query && matches.length < products.length);

  expect(
    searchCase,
    "Expected a product name that does not match the entire catalog",
  ).toBeTruthy();
  const irrelevantProduct = products.find(
    (product) => !productMatchesQuery(product, searchCase!.query),
  );
  expect(irrelevantProduct).toBeTruthy();

  const serverResponse = await request.get(
    `/catalogo?q=${encodeURIComponent(searchCase!.query)}`,
  );
  expect(serverResponse.ok()).toBeTruthy();
  const serverHtml = await serverResponse.text();
  expect(serverHtml).toContain(`/producto/${searchCase!.matches[0].slug}`);
  expect(serverHtml).not.toContain(`/producto/${irrelevantProduct!.slug}`);

  await page.goto("/");
  const homeSearch = page.getByPlaceholder(/Buscar por perfume, marca o nota/i);
  await homeSearch.fill(searchCase!.query);
  await Promise.all([
    page.waitForURL(/\/catalogo\?q=/),
    homeSearch.press("Enter"),
  ]);

  expect(new URL(page.url()).searchParams.get("q")).toBe(searchCase!.query);
  await expect(
    page.getByRole("textbox", { name: "Buscar", exact: true }),
  ).toHaveValue(searchCase!.query);
  await expect(
    page.locator('main article:has(a[href^="/producto/"])'),
  ).toHaveCount(searchCase!.matches.length);
});

test("shopper can search, choose a variant, update the cart and remove the item", async ({
  page,
}) => {
  const product = await getAvailableProduct(page);

  await page.goto("/catalogo");
  await page
    .getByRole("textbox", { name: "Buscar", exact: true })
    .fill(product.name);
  const productLink = page
    .getByRole("link", { name: new RegExp(escapeRegex(product.name), "i") })
    .first();
  await expect(productLink).toBeVisible();
  await productLink.click();

  const availableVariants = page.locator(
    "button[aria-pressed]:not([disabled])",
  );
  if ((await availableVariants.count()) > 1)
    await availableVariants.nth(1).click();
  await page.getByRole("button", { name: /^Agregar al carrito$/i }).click();
  const cartLink = page.getByRole("link", { name: /Ver carrito/i });
  await expect(cartLink).toBeVisible();
  // The confirmation link intentionally lives for 1.6s inside an animated
  // panel. Once visible, force the actual click so WebKit does not wait for
  // animation stability until the panel unmounts.
  await cartLink.click({ force: true });

  const addQuantity = page.getByRole("button", {
    name: new RegExp(`Sumar ${escapeRegex(product.name)}`, "i"),
  });
  if (await addQuantity.isEnabled()) {
    await addQuantity.click();
    await expect(
      page.locator('[aria-live="polite"]').filter({ hasText: "2" }).first(),
    ).toBeVisible();
  }

  await page
    .getByRole("button", {
      name: new RegExp(`Eliminar ${escapeRegex(product.name)}`, "i"),
    })
    .click();
  await expect(
    page.getByRole("heading", { name: /Tu carrito.*vac/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Explorar cat/i }).click();
  await expect(page).toHaveURL(/\/catalogo/);
  await expectNoHorizontalOverflow(page);
});

test("authentication errors and password recovery are actionable without contacting real services", async ({
  page,
}) => {
  await page.route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("grant_type=password")) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });

  await page.goto("/auth");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel(/Contrase/i, { exact: true }).fill("incorrecta123");
  await page
    .getByRole("button", { name: "Ingresar", exact: true })
    .last()
    .click();
  const authStatus = page.getByRole("status");
  await expect(authStatus).toContainText(/incorrectos|modo demo/i);
  const demoMode = await authStatus
    .getByText(/Configur.*Supabase/i)
    .isVisible()
    .catch(() => false);
  if (demoMode) {
    await expect(authStatus).toContainText(/modo demo/i);
  } else {
    await expect(authStatus).toContainText(/incorrectos/i);
  }

  await page.getByRole("button", { name: /Olvid.*contrase/i }).click();
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByRole("button", { name: /Enviar recuperaci/i }).click();
  await expect(page.getByRole("status")).toContainText(
    demoMode ? /modo demo/i : /Te enviamos un email/i,
  );
});

test("account entry is controlled and checkout rejects malformed requests", async ({
  page,
}) => {
  await page.goto("/cuenta");
  // Development intentionally exposes the seeded demo owner. A configured
  // deployment redirects anonymous visitors; both modes keep the route controlled.
  const accountHeading = page.getByRole("heading", { name: /Mis pedidos/i });
  await expect
    .poll(
      async () =>
        page.url().includes("/auth") || (await accountHeading.isVisible()),
    )
    .toBe(true);
  if (page.url().includes("/auth")) {
    await expect(page).toHaveURL(/\/auth\?next=%2Fcuenta/);
  } else {
    await expect(accountHeading).toBeVisible();
  }

  const malformed = await page.request.post("/api/checkout/session", {
    headers: { "Content-Type": "application/json" },
    data: "{invalid-json",
  });
  expect(malformed.status()).toBe(400);
});

test("health endpoint reports configuration without exposing secrets", async ({
  page,
}) => {
  const response = await page.request.get("/api/health");
  expect([200, 503]).toContain(response.status());
  const body = (await response.json()) as Record<string, unknown>;
  expect(body).toHaveProperty("status");
  expect(body).toHaveProperty("checks");
  expect(JSON.stringify(body)).not.toMatch(/secret|token|key/i);
});

async function getAvailableProduct(page: Page) {
  const response = await page.request.get("/api/catalog/products", {
    maxRetries: 2,
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { products?: CatalogProduct[] };
  const product = payload.products?.find(
    (item) =>
      item.slug &&
      item.variants?.some(
        (variant) => (variant.stockOnHand ?? variant.stock_on_hand ?? 0) > 1,
      ),
  );
  expect(
    product,
    "Expected a product with at least two units for quantity testing",
  ).toBeTruthy();
  return product!;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function productMatchesQuery(product: CatalogProduct, query: string) {
  const searchableText = [
    product.name,
    product.brand?.name,
    product.category?.name,
    product.concentration,
    ...(product.notesTop ?? []),
    ...(product.notesHeart ?? []),
    ...(product.notesBase ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es");

  return searchableText.includes(query.trim().toLocaleLowerCase("es"));
}

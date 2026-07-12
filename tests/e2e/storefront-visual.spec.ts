import { expect, test, type Page, type TestInfo } from "@playwright/test";

type CatalogProduct = {
  slug: string;
  variants?: Array<{ stockOnHand?: number; stock_on_hand?: number }>;
};

const themes = ["light", "dark"] as const;

for (const theme of themes) {
  test.describe(`storefront visual smoke - ${theme}`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addInitScript((selectedTheme) => {
        window.localStorage.setItem("decantscba-theme", selectedTheme);
      }, theme);
    });

    test("home, catalog, product, cart and checkout keep layout integrity", async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      const productPath = await getAvailableProductPath(page);
      const routes = [
        { path: "/", label: "home", expected: /Decants\.CBA/i },
        { path: "/catalogo", label: "catalog", expected: /Catálogo de decants/i },
        { path: productPath, label: "product", expected: /Agregar al carrito/i },
        { path: "/carrito", label: "cart", expected: /carrito|selección/i },
        { path: "/checkout", label: "checkout", expected: /Finalizar compra|No hay ítems para confirmar|Cuenta Decants\.CBA/i },
      ];

      for (const route of routes) {
        await page.goto(route.path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("body")).toContainText(route.expected);
        await expectNoFrameworkOverlay(page);
        await expectNoHorizontalOverflow(page);
        await captureSmokeScreenshot(page, testInfo, `${route.label}-${theme}`);
      }

      expect(consoleErrors.filter(isRelevantConsoleError)).toEqual([]);
    });

    test("account menu and theme switch are reachable", async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const isMobile = (testInfo.project.use.viewport?.width ?? 1440) < 768;
      if (isMobile) {
        await page.getByRole("button", { name: /Abrir menú/i }).click();
        await expect(page.getByText("Tema")).toBeVisible();
        await expect(page.getByRole("link", { name: /Ingresar/i })).toBeVisible();
      } else {
        await page.getByRole("button", { name: /^Cuenta$/i }).click();
        await expect(page.getByRole("link", { name: /Ingresar/i })).toBeVisible();
      }

      await page.getByRole("switch", { name: /Cambiar tema/i }).first().click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme === "dark" ? "light" : "dark");
      await expectNoHorizontalOverflow(page);
      await captureSmokeScreenshot(page, testInfo, `account-menu-toggle-${theme}`);

      expect(consoleErrors.filter(isRelevantConsoleError)).toEqual([]);
    });

    test("product purchase controls add an item and render the cart", async ({ page }, testInfo) => {
      const productPath = await getAvailableProductPath(page);
      await page.goto(productPath);

      await page.getByRole("button", { name: /^Agregar al carrito$/i }).click();
      await expect(page.getByRole("link", { name: /Ver carrito/i })).toBeVisible();
      await page.getByRole("link", { name: /Ver carrito/i }).click();
      await expect(page.getByRole("heading", { name: /Tu selección/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureSmokeScreenshot(page, testInfo, `cart-with-item-${theme}`);
    });
  });
}

async function getAvailableProductPath(page: Page) {
  const response = await page.request.get("/api/catalog/products");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { products?: CatalogProduct[] };
  const product = payload.products?.find((item) => item.slug && item.variants?.some((variant) => (variant.stockOnHand ?? variant.stock_on_hand ?? 0) > 0));

  expect(product, "Expected at least one product with stock for storefront smoke tests").toBeTruthy();
  return `/producto/${product?.slug}`;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoFrameworkOverlay(page: Page) {
  await expect(page.locator("body")).not.toContainText(/Unhandled Runtime Error|Application error|Build Error|Next\.js/i);
}

async function captureSmokeScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const viewportName = testInfo.project.name.replace(/\W+/g, "-");
  await page.screenshot({
    path: testInfo.outputPath(`${viewportName}-${name}.png`),
    fullPage: false,
    animations: "disabled",
  });
}

function isRelevantConsoleError(message: string) {
  return !/favicon|ResizeObserver loop/i.test(message);
}

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type CatalogProduct = {
  slug: string;
  variants?: Array<{ stockOnHand?: number; stock_on_hand?: number }>;
};

for (const theme of ["light", "dark"] as const) {
  test(`critical storefront routes have no automatic WCAG 2.1 A/AA violations in ${theme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem("decantscba-theme", selectedTheme);
    }, theme);

    const productPath = await getAvailableProductPath(page);
    const routes = ["/", "/catalogo", productPath, "/carrito", "/auth"];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("main")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.map((node) => ({
            target: node.target.join(" "),
            summary: node.failureSummary,
          })),
        })),
        `Automatic accessibility violations on ${route} in ${theme} mode`,
      ).toEqual([]);
    }
  });
}

async function getAvailableProductPath(page: Page) {
  const response = await page.request.get("/api/catalog/products", {
    maxRetries: 2,
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { products?: CatalogProduct[] };
  const product = payload.products?.find(
    (item) =>
      item.slug &&
      item.variants?.some(
        (variant) => (variant.stockOnHand ?? variant.stock_on_hand ?? 0) > 0,
      ),
  );

  expect(
    product,
    "Expected a stocked product for accessibility checks",
  ).toBeTruthy();
  return `/producto/${product?.slug}`;
}

import { expect, test, type Page, type TestInfo } from "@playwright/test";

type CatalogProduct = {
  slug: string;
  variants?: Array<{ stockOnHand?: number; stock_on_hand?: number }>;
};

const themes = ["light", "dark"] as const;

// Full-page screenshots exercise the local Next.js image optimizer heavily.
// Keep this file ordered so parallel theme captures cannot observe a partial
// optimizer response while the rest of the Playwright suite stays parallel.
test.describe.configure({ mode: "default" });

for (const theme of themes) {
  test.describe(`storefront visual smoke - ${theme}`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addInitScript((selectedTheme) => {
        window.localStorage.setItem("decantscba-theme", selectedTheme);
      }, theme);
    });

    test("home, catalog, product, cart and checkout keep layout integrity", async ({
      page,
    }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      const productPath = await getAvailableProductPath(page);
      const routes = [
        { path: "/", label: "home", expected: /Decants\.CBA/i },
        {
          path: "/catalogo",
          label: "catalog",
          expected: /Catálogo de decants/i,
        },
        {
          path: productPath,
          label: "product",
          expected: /Agregar al carrito/i,
        },
        { path: "/carrito", label: "cart", expected: /carrito|selección/i },
        {
          path: "/checkout",
          label: "checkout",
          expected:
            /Finalizar compra|No hay ítems para confirmar|Cuenta Decants\.CBA/i,
        },
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

    test("account menu and theme switch are reachable", async ({
      page,
    }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const usesCompactNavigation =
        (testInfo.project.use.viewport?.width ?? 1440) < 1024;
      if (usesCompactNavigation) {
        await page.getByRole("button", { name: /Abrir menú/i }).click();
        if ((testInfo.project.use.viewport?.width ?? 1440) < 640) {
          await expect(page.getByText("Tema")).toBeVisible();
        }
        await expect(
          page.getByRole("link", { name: /Ingresar/i }),
        ).toBeVisible();
      } else {
        await page.getByRole("button", { name: /^Cuenta$/i }).click();
        await expect(
          page.getByRole("link", { name: /Ingresar/i }),
        ).toBeVisible();
      }

      await page
        .getByRole("switch", { name: /Cambiar tema/i })
        .first()
        .click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme === "dark" ? "light" : "dark",
      );
      await expectNoHorizontalOverflow(page);
      await captureSmokeScreenshot(
        page,
        testInfo,
        `account-menu-toggle-${theme}`,
      );

      expect(consoleErrors.filter(isRelevantConsoleError)).toEqual([]);
    });

    test("product purchase controls add an item and render the cart", async ({
      page,
    }, testInfo) => {
      const productPath = await getAvailableProductPath(page);
      await page.goto(productPath);

      await page.getByRole("button", { name: /^Agregar al carrito$/i }).click();
      await expect(
        page.getByRole("link", { name: /Ver carrito/i }),
      ).toBeVisible();
      // The functional suite exercises the link itself in every browser. This
      // visual check navigates directly so a short-lived confirmation panel
      // cannot detach while the screenshot route is changing.
      await page.goto("/carrito");
      await expect(
        page.getByRole("heading", { name: /Tu selección/i }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureSmokeScreenshot(page, testInfo, `cart-with-item-${theme}`);
    });

    test("editorial grids alternate on desktop and keep all content reachable with reduced motion", async ({
      page,
    }, testInfo) => {
      await page.goto("/");
      const splits = page.locator("[data-split-section]");
      await expect(splits).toHaveCount(4);

      const width = testInfo.project.use.viewport?.width ?? 1440;
      for (let index = 0; index < (await splits.count()); index += 1) {
        const split = splits.nth(index);
        const reverse = index === 1 || index === 3;
        await expect(split).toHaveAttribute("data-reverse", String(reverse));

        if (width >= 1024) {
          const content = await split
            .locator("[data-split-content]")
            .boundingBox();
          const visual = await split
            .locator("[data-split-visual]")
            .boundingBox();
          expect(content).not.toBeNull();
          expect(visual).not.toBeNull();
          expect(
            reverse ? content!.x < visual!.x : content!.x > visual!.x,
            `Split section ${index} should place ${reverse ? "content left" : "content right"}`,
          ).toBeTruthy();
        }
      }

      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.reload();
      await expect(
        page.getByRole("heading", { name: /Decants para decidir mejor/i }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureSmokeScreenshot(
        page,
        testInfo,
        `alternating-grids-reduced-${theme}`,
      );
    });

    test("catalog grid keeps a consistent closing rhythm before the footer", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/catalogo");
      const cards = page.locator("main article");
      await expect(page.getByText("Cargando perfumes...")).toBeHidden();
      await expect(cards.first()).toBeVisible();
      await settleVisualState(page, true);

      const layout = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll("main article"));
        const footer = document.querySelector("footer");
        const lastCard = cards.at(-1);
        if (!lastCard || !footer) return null;
        const grid = lastCard.closest(".motion-reveal");
        return {
          gap:
            footer.getBoundingClientRect().top -
            lastCard.getBoundingClientRect().bottom,
          gridTransform: grid ? window.getComputedStyle(grid).transform : null,
          fontsStatus: document.fonts.status,
          pendingImages: Array.from(document.images).filter(
            (image) => !image.complete,
          ).length,
          scrollY: window.scrollY,
        };
      });

      expect(
        layout,
        "Expected the catalog grid and footer to be measurable",
      ).not.toBeNull();
      expect(layout!.fontsStatus).toBe("loaded");
      expect(layout!.pendingImages).toBe(0);
      expect(layout!.scrollY).toBe(0);
      expect(layout!.gridTransform).toBe("none");
      expect(
        layout!.gap,
        "Catalog content should not collide with the footer",
      ).toBeGreaterThanOrEqual(24);
      expect(
        layout!.gap,
        "Catalog content should not leave an excessive empty tail",
      ).toBeLessThanOrEqual(96);
    });

    test("reduced motion neutralizes spatial hover movement", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/catalogo");

      const button = page.getByRole("button", { name: /^Agregar /i }).first();
      const card = button.locator("xpath=ancestor::article");
      await expect(card).toBeVisible();
      await card.hover();

      const cardMotion = await card.evaluate(readComputedMotion);
      expect(cardMotion.transform).toBe("none");
      expect(cardMotion.maxDurationMs).toBeLessThanOrEqual(1);

      await button.hover();
      const buttonMotion = await button.evaluate(readComputedMotion);
      expect(buttonMotion.transform).toBe("none");
      expect(buttonMotion.maxDurationMs).toBeLessThanOrEqual(1);
    });
  });
}

test("the intended body and display typefaces are available", async ({
  page,
}) => {
  await page.goto("/");
  const typography = await page.evaluate(async () => {
    await document.fonts.ready;
    const heading = document.querySelector<HTMLElement>("h1.font-display");
    return {
      bodyFamily: window.getComputedStyle(document.body).fontFamily,
      displayFamily: heading ? window.getComputedStyle(heading).fontFamily : "",
      availableFamilies: Array.from(document.fonts, (font) => font.family),
    };
  });

  expect(typography.bodyFamily).toMatch(/Open[_ ]Sans/);
  expect(typography.displayFamily).toMatch(/Libre[_ ]Caslon/);
  expect(typography.availableFamilies.join(" ")).toMatch(/Open[_ ]Sans/);
  expect(typography.availableFamilies.join(" ")).toMatch(/Libre[_ ]Caslon/);
});

function readComputedMotion(element: Element) {
  const style = window.getComputedStyle(element);
  const durations = `${style.animationDuration},${style.transitionDuration}`
    .split(",")
    .map((value) => value.trim())
    .map((value) =>
      value.endsWith("ms")
        ? Number.parseFloat(value)
        : Number.parseFloat(value) * 1_000,
    )
    .filter(Number.isFinite);

  return {
    transform: style.transform,
    maxDurationMs: Math.max(0, ...durations),
  };
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
    "Expected at least one product with stock for storefront smoke tests",
  ).toBeTruthy();
  return `/producto/${product?.slug}`;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoFrameworkOverlay(page: Page) {
  await expect(page.locator("body")).not.toContainText(
    /Unhandled Runtime Error|Application error|Build Error|Next\.js/i,
  );
}

async function captureSmokeScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  await settleVisualState(page, true);
  await page.waitForTimeout(100);

  const viewportName = testInfo.project.name.replace(/\W+/g, "-");
  const pageHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const screenshotPath = testInfo.outputPath(`${viewportName}-${name}.png`);
  if (pageHeight >= 30_000) {
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    // WebKit cannot encode an image taller than 32,767px. Extremely long
    // catalogs still get viewport evidence after the full document was scanned.
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      scale: "css",
      clip: { x: 0, y: 0, width: viewport!.width, height: viewport!.height },
    });
    return;
  }

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
}

async function settleVisualState(page: Page, scanDocument = false) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async (shouldScanDocument) => {
    await document.fonts.ready;

    if (shouldScanDocument) {
      const step = Math.max(window.innerHeight * 0.75, 320);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => resolve()),
        );
      }
    }

    await Promise.all(
      Array.from(document.images).map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
            window.setTimeout(finish, 5_000);
          });
        }
        await image.decode().catch(() => undefined);
      }),
    );

    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve()),
      ),
    );
  }, scanDocument);
}

function isRelevantConsoleError(message: string) {
  if (/favicon|ResizeObserver loop/i.test(message)) return false;
  return !(
    message.includes("vercel.live/_next-live/feedback/feedback.js") &&
    /content[- ]security[- ]policy|script-src(?:-elem)? directive/i.test(
      message,
    )
  );
}

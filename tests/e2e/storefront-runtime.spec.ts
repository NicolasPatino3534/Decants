import { expect, test, type Page } from "@playwright/test";

type CatalogProduct = {
  slug: string;
  variants?: Array<{ stockOnHand?: number; stock_on_hand?: number }>;
};

const themes = ["light", "dark"] as const;

for (const theme of themes) {
  test(`critical navigation has no runtime, network or viewport failures in ${theme} mode`, async ({
    browserName,
    page,
  }) => {
    const consoleErrors: string[] = [];
    const hydrationErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const failedResponses: string[] = [];

    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && !isVercelToolbarCspError(text)) {
        consoleErrors.push(text);
      }
      if (/hydration|did not match|server rendered html/i.test(text)) {
        hydrationErrors.push(text);
      }
    });
    page.on("pageerror", (error) => {
      if (
        browserName === "webkit" &&
        isCancelledWebKitRscPrefetch(error.message)
      ) {
        return;
      }
      pageErrors.push(error.message);
    });
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "unknown request failure";
      if (
        request.url() ===
          "https://vercel.live/_next-live/feedback/feedback.js" &&
        failure.toLowerCase() === "csp"
      ) {
        return;
      }
      if (
        browserName === "webkit" &&
        failure === "Load request cancelled" &&
        /[?&]_rsc=/.test(request.url())
      ) {
        return;
      }
      if (
        browserName === "webkit" &&
        failure === "Load request cancelled" &&
        request.method() === "GET" &&
        new URL(request.url()).pathname === "/api/cart"
      ) {
        return;
      }
      if (!/NS_BINDING_ABORTED|ERR_ABORTED/i.test(failure)) {
        failedRequests.push(
          `${request.method()} ${request.url()} — ${failure}`,
        );
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem("decantscba-theme", selectedTheme);
    }, theme);

    const productPath = await getAvailableProductPath(page);
    const routes = [
      "/",
      "/catalogo",
      productPath,
      "/carrito",
      "/checkout",
      "/auth",
    ];

    for (const route of routes) {
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(
        response?.status(),
        `Navigation response for ${route}`,
      ).toBeLessThan(400);
      await expect(page.getByRole("main")).toBeVisible();
      // Let App Router segment prefetches settle before the next document
      // navigation. WebKit otherwise reports those intentional aborts as CORS
      // page errors even though every response completed with HTTP 200.
      await page.waitForLoadState("networkidle");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expectNoNextJsErrorOverlay(page, route);
      await expectNoHorizontalOverflow(page, route);
      await expectNoClippedViewportControls(page, route);

      if (route === "/") {
        await expectHeaderBrandToFit(page);
        if ((page.viewportSize()?.width ?? 1440) < 640) {
          await expect(
            page.getByRole("switch", { name: /Cambiar tema/i }),
            "The compact header should expose the theme switch inside its menu",
          ).toHaveCount(0);
        }
      }
    }

    expect(consoleErrors, "Console errors").toEqual([]);
    expect(hydrationErrors, "Hydration errors").toEqual([]);
    expect(pageErrors, "Uncaught page errors").toEqual([]);
    expect(failedRequests, "Failed browser requests").toEqual([]);
    expect(failedResponses, "HTTP responses with status >= 400").toEqual([]);
  });
}

async function expectNoNextJsErrorOverlay(page: Page, route: string) {
  const portalErrors = await page
    .locator("nextjs-portal")
    .evaluateAll((portals) =>
      portals
        .map((portal) => portal.shadowRoot?.textContent ?? "")
        .filter((text) =>
          /Build Error|Unhandled Runtime Error|Application error|Hydration failed/i.test(
            text,
          ),
        ),
    );

  expect(portalErrors, `Next.js error overlay on ${route}`).toEqual([]);
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
  expect(product, "Expected a stocked product for runtime checks").toBeTruthy();
  return `/producto/${product?.slug}`;
}

async function expectNoHorizontalOverflow(page: Page, route: string) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, `Horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
}

async function expectNoClippedViewportControls(page: Page, route: string) {
  const clipped = await page.evaluate(() => {
    const selector = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[role='dialog']",
      "[role='menu']",
    ].join(",");

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight
        );
      })
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.left >= -1 && rect.right <= window.innerWidth + 1)
          return false;

        for (
          let parent = element.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          const overflowX = window.getComputedStyle(parent).overflowX;
          if (["auto", "scroll", "hidden", "clip"].includes(overflowX)) {
            return false;
          }
        }
        return true;
      })
      .slice(0, 10)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.innerText || element.getAttribute("aria-label") || "")
            .trim()
            .slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          viewportWidth: window.innerWidth,
        };
      });
  });

  expect(clipped, `Visible controls clipped on ${route}`).toEqual([]);
}

async function expectHeaderBrandToFit(page: Page) {
  const brandName = page.locator("header a[href='/'] .font-display").first();
  await expect(brandName).toBeVisible();
  const overflow = await brandName.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(
    overflow,
    "The header brand name should not be truncated",
  ).toBeLessThanOrEqual(1);
}

function isCancelledWebKitRscPrefetch(message: string) {
  // WebKit surfaces an App Router prefetch cancelled by the test's next full
  // document navigation as a CORS pageerror. The trace records these requests
  // as `Load request cancelled`; actual HTTP/network failures remain asserted.
  return /[?&]_rsc=[^ ]+ due to access control checks\.$/i.test(message);
}

function isVercelToolbarCspError(message: string) {
  return (
    message.includes("vercel.live/_next-live/feedback/feedback.js") &&
    /content[- ]security[- ]policy|script-src(?:-elem)? directive/i.test(
      message,
    )
  );
}

import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

export const previewStorageStatePath = path.join(
  process.cwd(),
  "test-results",
  ".vercel-preview-storage.json",
);

export default async function previewGlobalSetup(config: FullConfig) {
  const shareSecret = process.env.VERCEL_SHARE_BYPASS?.trim();
  if (!shareSecret) return;

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (!baseUrl?.startsWith("https://")) {
    throw new Error(
      "Vercel share bypass requires an HTTPS Playwright base URL.",
    );
  }

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const shareUrl = new URL(baseUrl);
    shareUrl.searchParams.set("_vercel_share", shareSecret);
    const response = await page.goto(shareUrl.toString(), {
      waitUntil: "domcontentloaded",
    });
    if (!response || response.status() >= 400) {
      throw new Error("Vercel share bypass could not open the Preview.");
    }
    fs.mkdirSync(path.dirname(previewStorageStatePath), { recursive: true });
    await context.storageState({ path: previewStorageStatePath });
  } finally {
    await browser.close();
  }

  if (config.projects.length === 0) {
    throw new Error("Playwright has no projects configured.");
  }
}

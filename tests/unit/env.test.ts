import { afterEach, describe, expect, it, vi } from "vitest";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelUrl = process.env.VERCEL_URL;

afterEach(() => {
  if (originalSiteUrl == null) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
  if (originalVercelUrl == null) {
    delete process.env.VERCEL_URL;
  } else {
    process.env.VERCEL_URL = originalVercelUrl;
  }
  vi.resetModules();
});

describe("env", () => {
  it("falls back when NEXT_PUBLIC_SITE_URL is empty", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = " ";
    delete process.env.VERCEL_URL;
    vi.resetModules();

    const { env } = await import("@/lib/env");

    expect(env.siteUrl).toBe("http://localhost:3000");
    expect(() => new URL(env.siteUrl)).not.toThrow();
  });

  it("uses the deployment URL for previews", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "decants-preview.vercel.app";
    vi.resetModules();

    const { env } = await import("@/lib/env");

    expect(env.siteUrl).toBe("https://decants-preview.vercel.app");
  });

  it("prefers an explicit canonical URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://decants.example/";
    process.env.VERCEL_URL = "decants-preview.vercel.app";
    vi.resetModules();

    const { env } = await import("@/lib/env");

    expect(env.siteUrl).toBe("https://decants.example");
  });
});

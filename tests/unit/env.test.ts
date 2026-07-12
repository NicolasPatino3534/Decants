import { afterEach, describe, expect, it, vi } from "vitest";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl == null) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
  vi.resetModules();
});

describe("env", () => {
  it("falls back when NEXT_PUBLIC_SITE_URL is empty", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = " ";
    vi.resetModules();

    const { env } = await import("@/lib/env");

    expect(env.siteUrl).toBe("http://localhost:3000");
    expect(() => new URL(env.siteUrl)).not.toThrow();
  });
});

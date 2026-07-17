import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(pathname: string) {
  return readFileSync(resolve(process.cwd(), pathname), "utf8");
}

describe("release and preview safety gates", () => {
  it("keeps the preview workflow non-production and pinned", () => {
    const workflow = read(".github/workflows/preview.yml");

    expect(workflow).toContain("environment: preview");
    expect(workflow).toContain("--environment=preview");
    expect(workflow).toContain("vercel@56.2.1 deploy --prebuilt");
    expect(workflow).not.toMatch(/(?:^|\s)--prod(?:\s|$)/m);
    expect(workflow).not.toContain("environment=production");
  });

  it("keeps dependency and secret checks in CI", () => {
    const workflow = read(".github/workflows/quality.yml");

    expect(workflow).toContain("npm run security:secrets");
    expect(workflow).toContain("npm audit --audit-level=moderate");
  });

  it("does not hardcode a Supabase project ref", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["supabase:link"]).toBe("supabase link");
    expect(packageJson.scripts["supabase:link"]).not.toContain("--project-ref");
  });

  it("covers responsive Chromium, Firefox and WebKit projects", () => {
    const config = read("playwright.config.ts");

    for (const project of [
      "desktop",
      "tablet",
      "mobile",
      "firefox-desktop",
      "firefox-tablet",
      "firefox-mobile",
      "webkit-desktop",
      "webkit-tablet",
      "webkit-mobile",
    ]) {
      expect(config).toContain(`name: "${project}"`);
    }
    expect(config).toContain("failOnFlakyTests: Boolean(process.env.CI)");
  });
});

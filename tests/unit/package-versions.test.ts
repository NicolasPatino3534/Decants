import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("package dependency versions", () => {
  it("pins direct dependencies to exact versions", () => {
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };

    for (const [name, version] of Object.entries(dependencies)) {
      expect(version, `${name} must not use latest`).not.toBe("latest");
      expect(version, `${name} must be pinned without ranges`).toMatch(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
    }
  });
});

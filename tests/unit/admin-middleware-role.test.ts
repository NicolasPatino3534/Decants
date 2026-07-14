import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const middlewareSource = fs.readFileSync(
  path.join(process.cwd(), "lib", "supabase", "middleware.ts"),
  "utf8",
);

describe("admin proxy role contract", () => {
  it("accepts every role allowed by the server-side admin guard", () => {
    expect(middlewareSource).toContain('value === "owner"');
    expect(middlewareSource).toContain('value === "admin"');
    expect(middlewareSource).toContain('value === "staff"');
  });

  it("does not grant proxy access from bootstrap email configuration", () => {
    expect(middlewareSource).not.toContain("isBootstrapAdmin");
  });
});

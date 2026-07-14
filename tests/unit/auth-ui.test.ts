import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const authFormSource = fs.readFileSync(
  path.join(process.cwd(), "components", "auth", "auth-form.tsx"),
  "utf8",
);
const siteHeaderSource = fs.readFileSync(
  path.join(process.cwd(), "components", "site", "site-header.tsx"),
  "utf8",
);

describe("auth UI contract", () => {
  it("offers an accessible password recovery flow", () => {
    expect(authFormSource).toContain("resetPasswordForEmail");
    expect(authFormSource).toContain('setMode("reset")');
    expect(authFormSource).toContain('setMode("login")');
    expect(authFormSource).toContain('aria-live="polite"');
  });

  it("offers account actions from the header", () => {
    expect(siteHeaderSource).toContain("Ingresar");
    expect(siteHeaderSource).toContain("Crear cuenta");
    expect(siteHeaderSource).toContain("Mi cuenta");
    expect(siteHeaderSource).toContain("Mis pedidos");
    expect(siteHeaderSource).toContain("Cerrar sesi");
    expect(siteHeaderSource).toContain('aria-live="polite"');
  });
});

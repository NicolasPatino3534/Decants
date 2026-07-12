import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const authFormSource = fs.readFileSync(path.join(process.cwd(), "components", "auth", "auth-form.tsx"), "utf8");
const siteHeaderSource = fs.readFileSync(path.join(process.cwd(), "components", "site", "site-header.tsx"), "utf8");

describe("auth UI contract", () => {
  it("keeps password recovery support internal but removes the public recovery controls", () => {
    expect(authFormSource).toContain("resetPasswordForEmail");
    expect(authFormSource).not.toContain(">Recuperar<");
    expect(authFormSource).not.toContain("Olvid");
  });

  it("offers account actions from the header", () => {
    expect(siteHeaderSource).toContain("Ingresar");
    expect(siteHeaderSource).toContain("Crear cuenta");
    expect(siteHeaderSource).toContain("Mi cuenta");
    expect(siteHeaderSource).toContain("Mis pedidos");
    expect(siteHeaderSource).toContain("Cerrar sesión");
    expect(siteHeaderSource).toContain('aria-live="polite"');
  });
});

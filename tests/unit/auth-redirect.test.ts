import { describe, expect, it } from "vitest";
import { isSafeInternalPath } from "@/app/auth/page";

describe("post-auth redirects", () => {
  it("accepts local application paths", () => {
    expect(isSafeInternalPath("/cuenta/pedidos")).toBe(true);
  });

  it("rejects protocol-relative and backslash redirects", () => {
    expect(isSafeInternalPath("//example.com")).toBe(false);
    expect(isSafeInternalPath("/\\example.com")).toBe(false);
  });
});

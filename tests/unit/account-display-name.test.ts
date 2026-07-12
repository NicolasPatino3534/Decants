import { describe, expect, it } from "vitest";
import { getAccountDisplayName } from "@/lib/auth/display-name";

describe("account display name", () => {
  it("uses the first two words of the full name", () => {
    expect(getAccountDisplayName({ fullName: "Nicolas Decants CBA", email: "nicolas@example.com" })).toBe("Nicolas Decants");
  });

  it("falls back to the email handle", () => {
    expect(getAccountDisplayName({ email: "cliente@decants.test" })).toBe("cliente");
  });

  it("uses username before email", () => {
    expect(getAccountDisplayName({ username: "decantsfan", email: "cliente@decants.test" })).toBe("decantsfan");
  });

  it("uses a safe fallback when no account data is available", () => {
    expect(getAccountDisplayName({})).toBe("tu cuenta");
  });
});

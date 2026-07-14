import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("transactional email retry safety", () => {
  it("sends an idempotency key to the email provider", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib", "notifications", "email.ts"),
      "utf8",
    );

    expect(source).toContain('"Idempotency-Key": input.idempotencyKey');
  });
});

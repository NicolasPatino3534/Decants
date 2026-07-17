import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("preview reservation scheduler strategy", () => {
  it("preserves the ten-minute production scheduler", () => {
    const production = JSON.parse(read("vercel.json"));
    expect(production.crons).toEqual([
      {
        path: "/api/cron/release-stock",
        schedule: "*/10 * * * *",
      },
    ]);
  });

  it("omits scheduling only from the explicit Preview configuration", () => {
    const preview = JSON.parse(read("vercel.preview.json"));
    expect(preview).not.toHaveProperty("crons");

    const preparation = read("scripts/prepare-vercel-preview.mjs");
    expect(preparation).toContain("assertProductionCron");
    expect(preparation).toContain("assertPreviewHasNoScheduler");
    expect(preparation).toContain('relativePath === "vercel.json"');
    expect(preparation).toContain('"show", `HEAD:${relativePath}`');
  });

  it("keeps the manual endpoint fail-closed and service-role only", () => {
    const route = read("app/api/cron/release-stock/route.ts");
    expect(route).toContain("!env.cronSecret");
    expect(route).toContain("`Bearer ${env.cronSecret}`");
    expect(route).toContain("status: 401");
    expect(route).toContain("createSupabaseAdminClient");

    const releaseMigration = read(
      "supabase/migrations/20260712231500_transactional_stock_release.sql",
    );
    expect(releaseMigration).toContain("for update skip locked");
    expect(releaseMigration).toContain("stock_released_at is null");
    expect(releaseMigration).toContain(
      "payment_status in ('pending', 'payment_review')",
    );
    expect(releaseMigration).toContain(
      "target_order.stock_released_at is not null",
    );
    expect(releaseMigration).toContain(
      "target_order.payment_status in ('paid', 'refunded')",
    );
    expect(releaseMigration).toContain(
      "revoke all on function public.release_expired_checkout_reservations(integer) from public, anon, authenticated",
    );
    expect(releaseMigration).toContain(
      "grant execute on function public.release_expired_checkout_reservations(integer) to service_role",
    );
  });

  it("defines a real staging test for expiration, isolation and idempotency", () => {
    const validation = read("scripts/validate-preview-cron.mjs");
    expect(validation).toContain(
      "await Promise.all([invokeCron(), invokeCron()])",
    );
    expect(validation).toContain("await assertReleaseState");
    expect(validation).toContain("ids.futureOrder");
    expect(validation).toContain("ids.paidOrder");
    expect(validation).toContain("Cron endpoint accepted an invalid caller");
  });
});

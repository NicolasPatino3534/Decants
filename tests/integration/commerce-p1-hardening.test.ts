import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260713220000_atomic_checkout_and_payment_finalization.sql",
);

function read(pathname: string) {
  return fs.readFileSync(pathname, "utf8");
}

describe("P1 commerce hardening contract", () => {
  it("limits open reservations and reserves coupons atomically", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("public.acquire_checkout_reservation_guard");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("public.reserve_checkout_coupon");
    expect(sql).toContain("for update");
    expect(sql).toContain("checkout_coupon_reservations");
    expect(sql).toContain("usage_limit");
    expect(sql).toContain("new.payment_status::text = 'payment_review'");
    expect(sql).toContain(
      "set expires_at = greatest(expires_at, new.reservation_expires_at)",
    );
    expect(sql).toMatch(
      /if exists \([\s\S]*checkout_reservation_guards[\s\S]*return false;/,
    );
  });

  it("finalizes payment state and durable side effects in one RPC", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("public.finalize_paid_order");
    expect(sql).toContain("payment_webhook_events");
    expect(sql).toContain("order_notification_outbox");
    expect(sql).toContain("on conflict (provider, event_id) do nothing");
    expect(sql).toContain("on conflict (order_id) do update");
    expect(sql).toContain("provider_payment_intent_id");
    expect(sql).toContain(
      "select o.id, o.user_id, o.customer_email, o.customer_name, o.order_number",
    );
    expect(sql).toContain("from public.orders o");
    expect(sql).toContain("where o.id = p_order_id");
    expect(sql).toMatch(
      /if target_order\.coupon_id is not null then[\s\S]*select ccr\.id, ccr\.coupon_id, ccr\.status[\s\S]*from public\.checkout_coupon_reservations ccr[\s\S]*ccr\.user_id = target_order\.user_id[\s\S]*for update;[\s\S]*target_order\.payment_status <> 'paid'[\s\S]*coupon_reservation\.status <> 'reserved'[\s\S]*raise exception 'PAYMENT_REQUIRES_REVIEW';/,
    );
  });

  it("keeps privileged RPCs inaccessible to browser roles", () => {
    const sql = read(migrationPath);

    for (const signature of [
      "acquire_checkout_reservation_guard(uuid, text, timestamptz, integer)",
      "reserve_checkout_coupon(uuid, uuid, text, timestamptz)",
      "release_checkout_security_guards(uuid, text)",
      "finalize_paid_order(uuid, text, text, text, text, jsonb)",
      "complete_order_notification_outbox(uuid, text, boolean, text)",
    ]) {
      expect(sql).toContain(
        `revoke all on function public.${signature} from public, anon, authenticated`,
      );
      expect(sql).toContain(
        `grant execute on function public.${signature} to service_role`,
      );
    }
  });

  it("routes all paid webhooks through the transactional finalizer", () => {
    const stripe = read(
      path.join(process.cwd(), "app", "api", "webhooks", "stripe", "route.ts"),
    );
    const mercadoPago = read(
      path.join(
        process.cwd(),
        "app",
        "api",
        "webhooks",
        "mercadopago",
        "route.ts",
      ),
    );
    const checkout = read(
      path.join(process.cwd(), "app", "api", "checkout", "session", "route.ts"),
    );

    expect(stripe).toContain("finalizePaidOrder");
    expect(mercadoPago).toContain("finalizePaidOrder");
    expect(stripe).not.toContain(
      'currentOrder.payment_status === "paid") return',
    );
    expect(mercadoPago).not.toContain(
      'currentOrder.payment_status === "paid") return',
    );
    expect(checkout).not.toContain("incrementCouponUsage");
    expect(checkout).toContain("acquireCheckoutReservationGuard");
    expect(checkout).toContain("reserveCheckoutCoupon");
    expect(checkout).toContain("p_max_open: 3");
  });

  it("expires checkout guards from the authenticated cron route", () => {
    const cron = read(
      path.join(
        process.cwd(),
        "app",
        "api",
        "cron",
        "release-stock",
        "route.ts",
      ),
    );

    expect(cron).toContain("release_expired_checkout_reservations");
    expect(cron).toContain("release_expired_checkout_security_guards");
    expect(cron).toContain("env.cronSecret");

    const stockRelease = read(
      path.join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260712231500_transactional_stock_release.sql",
      ),
    );
    expect(stockRelease).toContain(
      "payment_status in ('pending', 'payment_review')",
    );

    const reservationExpiry = read(
      path.join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260712224500_checkout_reservation_expiry.sql",
      ),
    );
    expect(reservationExpiry).toMatch(
      /create index if not exists orders_expired_reservations_idx[\s\S]*where stock_released_at is null\s+and payment_status in \('pending', 'payment_review'\);/,
    );
  });
});

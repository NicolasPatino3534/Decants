import { describe, expect, it, vi } from "vitest";
import { finalizePaidOrder } from "@/lib/payments/finalization";

describe("paid order finalization RPC", () => {
  it("passes provider idempotency data to the privileged RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          customer_email: "qa@example.com",
          customer_name: "QA",
          order_number: "ORD-1",
          notification_pending: true,
          already_processed: false,
        },
      ],
      error: null,
    });

    const result = await finalizePaidOrder({ rpc } as never, {
      orderId: "order-1",
      provider: "stripe",
      providerEventId: "evt-1",
      providerSessionId: "cs-1",
      providerPaymentId: "pi-1",
      eventPayload: { event_id: "evt-1" },
    });

    expect(rpc).toHaveBeenCalledWith("finalize_paid_order", {
      p_order_id: "order-1",
      p_provider: "stripe",
      p_provider_event_id: "evt-1",
      p_provider_session_id: "cs-1",
      p_provider_payment_id: "pi-1",
      p_event_payload: { event_id: "evt-1" },
    });
    expect(result).toMatchObject({
      orderId: "order-1",
      notificationPending: true,
      alreadyProcessed: false,
    });
  });

  it("exposes a controlled review signal without leaking database errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "PAYMENT_REQUIRES_REVIEW internal details" },
    });

    await expect(
      finalizePaidOrder({ rpc } as never, {
        orderId: "order-1",
        provider: "mercadopago",
        providerEventId: "payment-1:approved",
        eventPayload: {},
      }),
    ).rejects.toThrow("PAYMENT_REQUIRES_REVIEW");
  });
});

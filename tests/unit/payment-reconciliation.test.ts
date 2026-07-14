import { describe, expect, it } from "vitest";
import { reconcilePaymentValues } from "@/lib/payments/reconciliation";

const validPayment = {
  expectedAmountCents: 12500,
  expectedCurrency: "ars",
  expectedSessionId: "session-1",
  receivedAmountCents: 12500,
  receivedCurrency: "ARS",
  receivedSessionId: "session-1",
};

describe("payment reconciliation", () => {
  it("accepts matching amount, currency and session", () => {
    expect(reconcilePaymentValues(validPayment)).toBeNull();
  });

  it("rejects a different provider session", () => {
    expect(
      reconcilePaymentValues({
        ...validPayment,
        receivedSessionId: "session-2",
      }),
    ).toBe("session_mismatch");
  });

  it("rejects a manipulated amount", () => {
    expect(
      reconcilePaymentValues({ ...validPayment, receivedAmountCents: 12499 }),
    ).toBe("amount_mismatch");
  });

  it("rejects a different currency", () => {
    expect(
      reconcilePaymentValues({ ...validPayment, receivedCurrency: "USD" }),
    ).toBe("currency_mismatch");
  });
});

import { describe, expect, it } from "vitest";
import {
  getMercadoPagoOrderId,
  getMercadoPagoPaymentAction,
  getMercadoPagoPaymentId,
  getMercadoPagoWebhookDataId,
  parseMercadoPagoWebhookPayload,
} from "@/lib/payments/mercadopago-webhook";

describe("mercadopago webhook helpers", () => {
  it("extracts payment ids from current webhook query params", () => {
    const url = new URL("https://example.com/api/webhooks/mercadopago?type=payment&data.id=12345");

    expect(getMercadoPagoWebhookDataId(url)).toBe("12345");
    expect(getMercadoPagoPaymentId({}, url)).toBe("12345");
  });

  it("extracts payment ids from legacy query and resource formats", () => {
    expect(getMercadoPagoPaymentId({}, new URL("https://example.com/api/webhooks/mercadopago?topic=payment&id=987"))).toBe("987");
    expect(
      getMercadoPagoPaymentId(
        { resource: "https://api.mercadopago.com/v1/payments/654321", topic: "payment" },
        new URL("https://example.com/api/webhooks/mercadopago"),
      ),
    ).toBe("654321");
  });

  it("extracts order ids and maps payment statuses", () => {
    expect(getMercadoPagoOrderId({ metadata: { orderId: "order-1" }, external_reference: "order-2" })).toBe("order-1");
    expect(getMercadoPagoOrderId({ external_reference: "order-2" })).toBe("order-2");
    expect(getMercadoPagoPaymentAction("approved")).toBe("approved");
    expect(getMercadoPagoPaymentAction("pending")).toBe("review");
    expect(getMercadoPagoPaymentAction("rejected")).toBe("failed");
    expect(getMercadoPagoPaymentAction("unknown")).toBe("ignored");
  });

  it("parses invalid payloads as an empty object", () => {
    expect(parseMercadoPagoWebhookPayload("{bad json")).toEqual({});
  });
});

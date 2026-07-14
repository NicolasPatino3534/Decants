type MercadoPagoPaymentLike = {
  metadata?: Record<string, unknown> | null;
  external_reference?: string | null;
  status?: string | null;
};

export function parseMercadoPagoWebhookPayload(rawBody: string) {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getMercadoPagoWebhookDataId(requestUrl: URL) {
  return requestUrl.searchParams.get("data.id");
}

export function getMercadoPagoPaymentId(
  payload: Record<string, unknown>,
  requestUrl: URL,
) {
  const queryId =
    requestUrl.searchParams.get("data.id") ?? requestUrl.searchParams.get("id");
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : null;
  const bodyId = data?.id ?? payload.id;
  const resourceId = getPaymentIdFromResource(payload.resource);
  const id = queryId ?? bodyId ?? resourceId;

  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

export function getMercadoPagoOrderId(payment: MercadoPagoPaymentLike) {
  const metadataOrderId =
    payment.metadata?.order_id ?? payment.metadata?.orderId;
  if (typeof metadataOrderId === "string") return metadataOrderId;
  return typeof payment.external_reference === "string"
    ? payment.external_reference
    : null;
}

export function getMercadoPagoPaymentAction(status: string | null | undefined) {
  if (status === "approved") return "approved";
  if (status === "in_process" || status === "pending") return "review";
  if (status === "refunded" || status === "charged_back") return "reversed";
  if (status === "cancelled" || status === "rejected") return "failed";
  return "ignored";
}

function getPaymentIdFromResource(resource: unknown) {
  if (typeof resource !== "string") return null;
  const match = resource.match(/\/payments\/(\d+)(?:\b|$)/);
  return match?.[1] ?? null;
}

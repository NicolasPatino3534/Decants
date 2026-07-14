export type PaymentReconciliationInput = {
  expectedAmountCents: number;
  expectedCurrency: string;
  receivedAmountCents: number;
  receivedCurrency: string;
  expectedSessionId?: string | null;
  receivedSessionId?: string | null;
};

export function reconcilePaymentValues(input: PaymentReconciliationInput) {
  if (
    input.expectedSessionId != null &&
    input.expectedSessionId !== input.receivedSessionId
  )
    return "session_mismatch" as const;
  if (input.expectedAmountCents !== input.receivedAmountCents)
    return "amount_mismatch" as const;
  if (
    input.expectedCurrency.toLowerCase() !==
    input.receivedCurrency.toLowerCase()
  )
    return "currency_mismatch" as const;
  return null;
}

import { env } from "@/lib/env";
import { brand } from "@/lib/brand";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SendOrderEmailInput = {
  orderId: string;
  to: string;
  subject: string;
  html: string;
  template: string;
};

export async function sendOrderEmail(input: SendOrderEmailInput) {
  const admin = createSupabaseAdminClient();

  if (!env.resendApiKey) {
    if (admin) {
      await admin.from("email_events").insert({
        order_id: input.orderId,
        provider: "resend",
        template: input.template,
        recipient: input.to,
        status: "skipped_missing_key",
      });
    }
    return { ok: true, skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${brand.displayName} <${env.resendFromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

  if (admin) {
    await admin.from("email_events").insert({
      order_id: input.orderId,
      provider: "resend",
      template: input.template,
      recipient: input.to,
      status: response.ok ? "sent" : "failed",
      provider_message_id: payload.id,
      error: response.ok ? null : payload.message ?? "unknown_error",
    });
  }

  return { ok: response.ok, payload };
}

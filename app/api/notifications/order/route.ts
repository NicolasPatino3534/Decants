import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendOrderEmail } from "@/lib/notifications/email";

const schema = z.object({
  orderId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(3),
  html: z.string().min(5),
  template: z.string().min(2),
});

export async function POST(request: Request) {
  if (!env.notificationWebhookSecret) {
    return NextResponse.json(
      { error: "Endpoint de notificaciones no configurado." },
      { status: 503 },
    );
  }

  const secret = request.headers.get("x-internal-secret");
  if (!secret || !secretsMatch(secret, env.notificationWebhookSecret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const result = await sendOrderEmail(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

function secretsMatch(received: string, expected: string) {
  const receivedBytes = new TextEncoder().encode(received);
  const expectedBytes = new TextEncoder().encode(expected);
  if (receivedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(receivedBytes, expectedBytes);
}

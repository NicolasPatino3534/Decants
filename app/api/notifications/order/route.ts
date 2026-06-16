import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOrderEmail } from "@/lib/notifications/email";

const schema = z.object({
  orderId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(3),
  html: z.string().min(5),
  template: z.string().min(2),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const result = await sendOrderEmail(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

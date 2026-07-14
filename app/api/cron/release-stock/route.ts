import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (
    !env.cronSecret ||
    request.headers.get("authorization") !== `Bearer ${env.cronSecret}`
  ) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin)
    return NextResponse.json(
      { error: "Base de datos no configurada." },
      { status: 503 },
    );

  const [orders, guards] = await Promise.all([
    admin.rpc("release_expired_checkout_reservations", { p_limit: 200 }),
    admin.rpc("release_expired_checkout_security_guards"),
  ]);
  if (orders.error || guards.error) {
    console.error("expired_checkout_release_error", {
      ordersCode: orders.error?.code,
      guardsCode: guards.error?.code,
    });
    return NextResponse.json(
      { error: "No se pudieron liberar las reservas vencidas." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      releasedOrders: Number(orders.data ?? 0),
      releasedGuards: Number(guards.data ?? 0),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

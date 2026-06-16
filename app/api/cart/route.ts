import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCartLinesFromItems, clearPersistedCart, getPersistedCartLines, replacePersistedCart } from "@/lib/cart/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const cartSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive().max(99),
      }),
    )
    .max(100),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ lines: [], authenticated: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ lines: [], authenticated: false });

  const lines = await getPersistedCartLines(supabase, user.id);
  return NextResponse.json({ lines, authenticated: true });
}

export async function PUT(request: Request) {
  const parsed = cartSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Carrito inválido." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lines = await buildCartLinesFromItems(supabase, parsed.data.items);
  if (!user) return NextResponse.json({ lines, authenticated: false });

  const result = await replacePersistedCart(supabase, user.id, lines);
  if (!result.ok) {
    return NextResponse.json(
      { lines, authenticated: true, warning: "No se pudo sincronizar el carrito en Supabase." },
      { status: 202 },
    );
  }

  return NextResponse.json({ lines: result.lines ?? lines, authenticated: true });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await clearPersistedCart(supabase, user.id);
  return NextResponse.json({ ok: true });
}

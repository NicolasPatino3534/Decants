import { NextResponse } from "next/server";
import { getAvailableShippingMethods } from "@/lib/checkout/options";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const methods = await getAvailableShippingMethods(
    createSupabaseAdminClient(),
  );
  return NextResponse.json({ shippingMethods: methods });
}

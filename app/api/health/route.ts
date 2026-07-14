import { NextResponse } from "next/server";
import { env, getProductionConfigurationIssues } from "@/lib/env";

export function GET() {
  const issues = getProductionConfigurationIssues();
  return NextResponse.json(
    {
      status: issues.length === 0 ? "ok" : "degraded",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      paymentProvider:
        env.paymentProvider === "invalid" ? "invalid" : env.paymentProvider,
      checks: {
        database: !issues.some((issue) => issue.startsWith("supabase")),
        payments: !issues.includes("payments"),
        notifications: !issues.includes("notifications"),
        email: !issues.includes("email"),
        cron: !issues.includes("cron"),
      },
    },
    {
      status: issues.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

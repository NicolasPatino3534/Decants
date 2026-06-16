import type { NextConfig } from "next";

const supabaseImageHostname = getSupabaseImageHostname(process.env.NEXT_PUBLIC_SUPABASE_URL);

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      ...(supabaseImageHostname ? [{ protocol: "https" as const, hostname: supabaseImageHostname }] : []),
      {
        protocol: "https",
        hostname: "d22fxaf9t8d39k.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;

function getSupabaseImageHostname(value?: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

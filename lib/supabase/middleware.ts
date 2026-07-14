import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);

    if (!user) {
      return NextResponse.redirect(redirectUrl);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const hasAdminRole =
      hasPrivilegedClaim(getJwtAppMetadata(session?.access_token)) ||
      hasPrivilegedClaim(user.app_metadata);

    if (!hasAdminRole) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

function hasPrivilegedClaim(appMetadata?: Record<string, unknown> | null) {
  if (!appMetadata) return false;

  const role = appMetadata.role ?? appMetadata.app_role;
  if (isPrivilegedRole(role)) return true;

  const roles = appMetadata.roles;
  if (Array.isArray(roles)) return roles.some(isPrivilegedRole);
  if (typeof roles === "string")
    return roles
      .split(",")
      .map((item) => item.trim())
      .some(isPrivilegedRole);

  return false;
}

function isPrivilegedRole(value: unknown) {
  return value === "owner" || value === "admin" || value === "staff";
}

function getJwtAppMetadata(accessToken?: string) {
  const payload = accessToken?.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const claims = JSON.parse(atob(padded)) as {
      app_metadata?: Record<string, unknown>;
    };
    return claims.app_metadata ?? null;
  } catch {
    return null;
  }
}

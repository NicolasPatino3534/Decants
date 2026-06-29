import { redirect } from "next/navigation";
import { demoOrders } from "@/lib/demo-data";
import { env, hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

export type CurrentProfile = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  roles: AppRole[];
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!hasSupabaseConfig()) {
    return {
      id: "demo-owner",
      email: "owner@decantscba.local",
      fullName: "DecantsCBA Owner",
      phone: "",
      roles: ["owner", "admin", "staff", "customer"],
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,phone,role").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const profileRole = "role" in (profile ?? {}) ? (profile?.role as AppRole | null) : null;
  const roleList = roles?.map((row) => row.role as AppRole) ?? [];
  const claimRoles = getRolesFromMetadata(user.app_metadata);
  const bootstrapRoles: AppRole[] = user.email && isBootstrapOwner(user.email) ? ["owner", "admin", "staff"] : [];
  const mergedRoles = Array.from(new Set([profileRole, ...roleList, ...claimRoles, ...bootstrapRoles].filter(Boolean))) as AppRole[];

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "",
    phone: profile?.phone ?? "",
    roles: mergedRoles.length > 0 ? mergedRoles : ["customer"],
  };
}

export function canAccessAdmin(roles: AppRole[]) {
  return roles.some((role) => role === "owner" || role === "admin" || role === "staff");
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !canAccessAdmin(profile.roles)) {
    redirect("/auth?next=/admin");
  }
  return profile;
}

export const requireStaff = requireAdmin;

export async function requireCustomer(nextPath = "/cuenta") {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }
  return profile;
}

export function getDemoAccountOrder() {
  return demoOrders[0];
}

export function isBootstrapOwner(email: string) {
  return env.adminBootstrapEmails.includes(email.toLowerCase());
}

function getRolesFromMetadata(appMetadata: Record<string, unknown> | null | undefined): AppRole[] {
  if (!appMetadata) return [];

  const role = appMetadata.role ?? appMetadata.app_role;
  const roles = appMetadata.roles;
  const values = [
    typeof role === "string" ? role : null,
    ...(Array.isArray(roles) ? roles : typeof roles === "string" ? roles.split(",") : []),
  ];

  return values
    .map((value) => String(value).trim())
    .filter((value): value is AppRole => value === "owner" || value === "admin" || value === "staff" || value === "customer");
}

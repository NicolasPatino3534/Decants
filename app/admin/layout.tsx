import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <main className="admin-shell min-h-screen bg-bg text-ink">
      <div className="border-b border-line bg-warm px-4 py-3 text-sm text-[var(--accent-muted)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 font-semibold">
          <p>Panel protegido</p>
          <p className="truncate text-xs">{profile.email}</p>
        </div>
      </div>
      <div className="grid min-h-screen lg:grid-cols-[244px_1fr]">
        <AdminSidebar />
        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </section>
      </div>
    </main>
  );
}
export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

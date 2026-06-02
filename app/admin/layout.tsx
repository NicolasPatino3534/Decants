import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <main className="grid min-h-screen bg-[#f5f6f4] lg:grid-cols-[260px_1fr]">
      <AdminSidebar />
      <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</section>
    </main>
  );
}

import { ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#fbfaf6] text-ink">
      <div className="border-b border-[#dec681] bg-[#fff8e8] px-4 py-3 text-sm text-[#5f4518] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-2 font-semibold">
          <ShieldCheck className="mt-0.5 shrink-0" size={17} />
          <p>
            Panel protegido por cuenta y rol. Usa owner, admin o staff para gestionar pedidos y catalogo.
          </p>
        </div>
      </div>
      <div className="grid min-h-screen lg:grid-cols-[244px_1fr]">
        <AdminSidebar />
        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</section>
      </div>
    </main>
  );
}

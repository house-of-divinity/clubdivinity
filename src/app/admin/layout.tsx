// Admin shell. Every /admin/* page is wrapped in this layout, which
// (a) gates access to users with role:admin in their JWT app_metadata
// and (b) renders the sidebar + topbar chrome shared by all admin
// routes. Non-admins land back on the home page.

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "Divinity · Curator",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required");
  }

  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") {
    redirect("/?auth=forbidden");
  }

  return (
    <AdminShell userEmail={user.email!}>
      {children}
    </AdminShell>
  );
}

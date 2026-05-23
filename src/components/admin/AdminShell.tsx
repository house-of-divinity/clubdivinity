"use client";

// Sidebar + topbar chrome shared by every admin page. Matches the
// prototype's admin.jsx layout: gold wordmark + chip top-right,
// vertical sidebar with the 6 tabs, scrollable main area.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const TABS = [
  { href: "/admin",              label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/members",      label: "Members" },
  { href: "/admin/events",       label: "Events" },
] as const;

export default function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = userEmail[0].toUpperCase();
  const firstName = userEmail.split("@")[0].split(/[._-]/)[0];

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="admin-shell">
      <header className="admin-head">
        <Link href="/admin" className="admin-mark" style={{ textDecoration: "none" }}>
          Divinity <span>Curator</span>
        </Link>
        <div className="admin-head-r">
          <div className="admin-chip">
            <span className="admin-chip-dot">{initial}</span>
            {firstName}
          </div>
          <button className="admin-head-btn" onClick={signOut}>
            Sign out
          </button>
          <Link href="/" className="admin-head-btn admin-head-close">
            ← Public site
          </Link>
        </div>
      </header>

      <aside className="admin-side">
        {TABS.map((t) => {
          const on = t.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={"admin-side-item" + (on ? " on" : "")}
              style={{ textDecoration: "none" }}
            >
              <span className="asi-mark">✦</span>
              <span className="asi-label">{t.label}</span>
            </Link>
          );
        })}
        <div className="admin-side-foot">
          The room is curated<br/>by hand.
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}

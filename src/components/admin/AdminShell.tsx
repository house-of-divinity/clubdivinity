"use client";

// Sidebar + topbar chrome shared by every admin page. Matches the
// prototype's admin.jsx layout: gold wordmark + chip top-right,
// vertical sidebar with the 6 tabs, scrollable main area.
//
// On phones the sidebar collapses behind a hamburger button in the
// top-left and slides in as a full-height drawer.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const TABS = [
  { href: "/admin",              label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/members",      label: "Members" },
  { href: "/admin/tickets",      label: "Tickets" },
  { href: "/admin/events",       label: "Events" },
  { href: "/admin/emails",       label: "Emails" },
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
  const [sideOpen, setSideOpen] = useState(false);

  // Close the drawer whenever the route changes (e.g. user tapped a tab).
  useEffect(() => {
    setSideOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't scroll when the user swipes inside the menu.
  useEffect(() => {
    if (!sideOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sideOpen]);

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className={"admin-shell" + (sideOpen ? " side-open" : "")}>
      <header className="admin-head">
        <button
          type="button"
          className="admin-burger"
          aria-label={sideOpen ? "Close menu" : "Open menu"}
          aria-expanded={sideOpen}
          onClick={() => setSideOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <Link href="/admin" className="admin-mark" style={{ textDecoration: "none" }}>
          Divinity <span>Curator</span>
        </Link>
        <div className="admin-head-r">
          <div className="admin-chip">
            <span className="admin-chip-dot">{initial}</span>
            <span className="admin-chip-name">{firstName}</span>
          </div>
          <button className="admin-head-btn" onClick={signOut}>
            Sign out
          </button>
          <Link href="/" className="admin-head-btn admin-head-close">
            ← Public site
          </Link>
        </div>
      </header>

      <button
        type="button"
        className="admin-side-scrim"
        aria-hidden={!sideOpen}
        tabIndex={-1}
        onClick={() => setSideOpen(false)}
      />

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

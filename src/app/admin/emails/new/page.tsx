// /admin/emails/new — create a new custom email template.
// Just asks for a label + short description, then POSTs to
// /api/admin/emails which inserts the row and returns its id, so
// we can redirect into the editor where the admin writes the copy.

import Link from "next/link";
import NewEmailForm from "@/components/admin/NewEmailForm";

export const dynamic = "force-dynamic";

export default function NewEmailPage() {
  return (
    <>
      <div className="admin-page-head">
        <Link
          href="/admin/emails"
          className="aph-sub"
          style={{ textDecoration: "none", color: "var(--ink-mute)" }}
        >
          ← Back to emails
        </Link>
        <h1 style={{ marginTop: 8 }}>New custom email.</h1>
        <div className="aph-sub">
          A broadcast email you can send manually to members or applicants.
        </div>
      </div>

      <NewEmailForm />
    </>
  );
}

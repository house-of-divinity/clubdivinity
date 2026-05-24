// /admin/emails/:id — edit form for one template.

import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { TEMPLATES, type TemplateId } from "@/lib/email/templates-meta";
import EmailEditor from "@/components/admin/EmailEditor";

export const dynamic = "force-dynamic";

export default async function EditEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(id in TEMPLATES)) notFound();
  const meta = TEMPLATES[id as TemplateId];

  const supabase = createSupabaseAdminClient();
  const { data: override } = await supabase
    .from("email_templates")
    .select("subject, headline, body, updated_at")
    .eq("id", id)
    .maybeSingle();

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
        <h1 style={{ marginTop: 8 }}>{meta.label}.</h1>
        <div className="aph-sub">{meta.trigger}</div>
      </div>

      <EmailEditor
        templateId={id as TemplateId}
        initial={{
          subject: override?.subject ?? meta.defaultSubject,
          headline: override?.headline ?? meta.defaultHeadline,
          body: override?.body ?? meta.defaultBody,
        }}
        isOverridden={!!override}
        meta={meta}
      />
    </>
  );
}

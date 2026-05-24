// /admin/emails/:id — edit one template (built-in or custom).

import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { TemplateId } from "@/lib/email/templates-meta";
import { loadTemplateForAdmin } from "@/lib/email/templates-admin";
import EmailEditor from "@/components/admin/EmailEditor";

export const dynamic = "force-dynamic";

export default async function EditEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tpl = await loadTemplateForAdmin(id);
  if (!tpl) notFound();

  // For built-ins, fetch the override row separately so the editor
  // shows current saved subject/headline/body (not the defaults).
  // For custom templates, the loader already used the DB row as the
  // initial values, so this is a no-op.
  const supabase = createSupabaseAdminClient();
  const { data: override } = await supabase
    .from("email_templates")
    .select("subject, headline, body, enabled")
    .eq("id", id)
    .maybeSingle();

  const initial = {
    subject:  override?.subject  ?? tpl.defaultSubject,
    headline: override?.headline ?? tpl.defaultHeadline,
    body:     override?.body     ?? tpl.defaultBody,
  };
  const initialEnabled = override?.enabled ?? true;

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
        <h1 style={{ marginTop: 8 }}>{tpl.label}.</h1>
        <div className="aph-sub">{tpl.trigger}</div>
      </div>

      <EmailEditor
        templateId={tpl.id}
        isCustom={tpl.isCustom}
        initialLabel={tpl.label}
        initialTrigger={tpl.trigger}
        initial={initial}
        initialEnabled={initialEnabled}
        isOverridden={!!override}
        meta={{
          id: tpl.id as TemplateId,
          label: tpl.label,
          trigger: tpl.trigger,
          vars: tpl.vars,
          defaultSubject: tpl.defaultSubject,
          defaultHeadline: tpl.defaultHeadline,
          defaultBody: tpl.defaultBody,
        }}
      />
    </>
  );
}

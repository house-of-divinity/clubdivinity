// Server-only loader that merges built-in templates (from
// templates-meta.ts) with custom templates and overrides stored
// in the email_templates table.
//
// Used by the /admin/emails pages and APIs. The send.tsx send path
// uses its own narrower helper that just fetches the single row it
// needs.

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  TEMPLATES,
  TEMPLATE_IDS,
  type TemplateMeta,
  type VarHint,
} from "./templates-meta";

// What the admin UI sees for each template (built-in or custom).
export type AdminTemplateRow = {
  id: string;
  label: string;
  trigger: string;
  vars: VarHint[];
  defaultSubject: string;
  defaultHeadline: string;
  defaultBody: string;
  // Whether the admin has saved an override (subject/headline/body
  // different from defaults, or this is a custom template).
  hasOverride: boolean;
  // Whether sending is enabled. true means the trigger fires + sends;
  // false means we log skipped.
  enabled: boolean;
  // true if this template was created by an admin via the UI (not
  // hard-coded in templates-meta.ts).
  isCustom: boolean;
  // Last edit time, if a DB row exists.
  updatedAt: string | null;
};

type DbRow = {
  id: string;
  subject: string;
  headline: string;
  body: string;
  enabled: boolean;
  is_custom: boolean;
  label: string | null;
  trigger_description: string | null;
  updated_at: string;
};

// Variables custom broadcast templates can use. Built-ins define
// their own vars in templates-meta.ts; custom templates always get
// this generic set (interpolated from the recipient's member/applicant
// record at send time).
export const CUSTOM_TEMPLATE_VARS: VarHint[] = [
  { name: "firstName",     description: "Recipient's first name. Empty if unknown." },
  { name: "fullName",      description: "Recipient's full name (e.g. 'Madison Wilde'). Falls back to email if unknown." },
  { name: "eventLine",     description: "Current next event display, e.g. 'VI · The Lovers'." },
  { name: "eventDateLine", description: "Current next event date, e.g. 'Friday, June 19 · Las Vegas'." },
  { name: "siteUrl",       description: "Link to clubdivinity.com." },
];

const DEFAULT_CUSTOM_SUBJECT  = "A note from the room";
const DEFAULT_CUSTOM_HEADLINE = "A note from the <em>room</em>.";
const DEFAULT_CUSTOM_BODY     = "Write your message here.\n\nBlank lines separate paragraphs.";

export async function loadAllTemplatesForAdmin(): Promise<AdminTemplateRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("id, subject, headline, body, enabled, is_custom, label, trigger_description, updated_at");

  const rowsById = new Map<string, DbRow>(
    (data ?? []).map((r) => [r.id as string, r as DbRow]),
  );

  const builtIns: AdminTemplateRow[] = TEMPLATE_IDS.map((id) => {
    const meta = TEMPLATES[id];
    const row = rowsById.get(id) ?? null;
    return toAdminRow(meta, row);
  });

  const customs: AdminTemplateRow[] = (data ?? [])
    .filter((r) => r.is_custom)
    .map((r) => toCustomAdminRow(r as DbRow));

  return [...builtIns, ...customs];
}

export async function loadTemplateForAdmin(
  id: string,
): Promise<AdminTemplateRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("id, subject, headline, body, enabled, is_custom, label, trigger_description, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (data && data.is_custom) {
    return toCustomAdminRow(data as DbRow);
  }
  if (id in TEMPLATES) {
    return toAdminRow(TEMPLATES[id as keyof typeof TEMPLATES], data as DbRow | null);
  }
  return null;
}

function toAdminRow(meta: TemplateMeta, row: DbRow | null): AdminTemplateRow {
  return {
    id: meta.id,
    label: meta.label,
    trigger: meta.trigger,
    vars: meta.vars,
    defaultSubject: meta.defaultSubject,
    defaultHeadline: meta.defaultHeadline,
    defaultBody: meta.defaultBody,
    hasOverride: !!row,
    enabled: row ? row.enabled : true,
    isCustom: false,
    updatedAt: row?.updated_at ?? null,
  };
}

function toCustomAdminRow(row: DbRow): AdminTemplateRow {
  return {
    id: row.id,
    label: row.label || "(untitled)",
    trigger: row.trigger_description || "Custom broadcast — sent manually from the admin.",
    vars: CUSTOM_TEMPLATE_VARS,
    defaultSubject: row.subject,
    defaultHeadline: row.headline,
    defaultBody: row.body,
    hasOverride: true,
    enabled: row.enabled,
    isCustom: true,
    updatedAt: row.updated_at,
  };
}

export const CUSTOM_DEFAULTS = {
  subject: DEFAULT_CUSTOM_SUBJECT,
  headline: DEFAULT_CUSTOM_HEADLINE,
  body: DEFAULT_CUSTOM_BODY,
};

// Generate a custom template id from a label. Lower-case + kebab,
// prefixed with `custom-` so it can never collide with a future
// built-in TemplateId.
export function customIdFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";
  return `custom-${slug}`;
}

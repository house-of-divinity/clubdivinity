-- 0005_email_templates_v2.sql
--
-- Two new capabilities on the email_templates table:
--
--   1. enabled flag — admin can silence any template (built-in or
--      custom) without deleting the row. When enabled=false, sendEmail()
--      writes an email_log row with status='skipped' instead of calling
--      Resend.
--
--   2. Custom templates — admin can create new templates that aren't
--      in the TemplateId union in code. Those need their own label
--      and trigger_description (built-ins read those from
--      templates-meta.ts). Marked with is_custom=true so the UI knows
--      to allow delete + show as separate group.
--
-- Run in Supabase SQL editor. Idempotent.

alter table email_templates
  add column if not exists enabled                boolean not null default true,
  add column if not exists is_custom              boolean not null default false,
  add column if not exists label                  text,
  add column if not exists trigger_description    text;

-- Tell PostgREST to reload its schema cache so the new columns are
-- usable from the Supabase REST API without a project restart.
notify pgrst, 'reload schema';

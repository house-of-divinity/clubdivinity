// /admin/events/:id — edit form for a single event. Lets curators
// adjust the roman, name, tagline, date, ticket URL, capacity,
// hosts, poster URL, status, and venue address fields without
// touching SQL.

import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import EventEditor from "@/components/admin/EventEditor";
import DeleteEventButton from "@/components/admin/DeleteEventButton";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  return (
    <>
      <div className="admin-page-head">
        <Link
          href="/admin/events"
          className="aph-sub"
          style={{ textDecoration: "none", color: "var(--ink-mute)" }}
        >
          ← Back to events
        </Link>
        <h1 style={{ marginTop: 8 }}>
          <span style={{ color: "var(--gold)", fontStyle: "italic" }}>
            {event.roman}
          </span>{" "}
          · {event.name}
        </h1>
        <div className="aph-sub">Edit the room.</div>
      </div>

      <EventEditor event={event} />

      <DeleteEventButton eventId={event.id} eventName={`${event.roman} · ${event.name}`} />
    </>
  );
}

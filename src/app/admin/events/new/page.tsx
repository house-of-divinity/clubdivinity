// /admin/events/new — empty form for creating a new event.
// Reuses EventEditor in create mode (event=null).

import Link from "next/link";
import EventEditor from "@/components/admin/EventEditor";

export const metadata = { robots: { index: false, follow: false } };

export default function NewEventPage() {
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
          New <em style={{ color: "var(--gold)", fontStyle: "italic" }}>gathering</em>.
        </h1>
        <div className="aph-sub">
          Compose the next room. Fields can be edited later.
        </div>
      </div>

      <EventEditor event={null} />
    </>
  );
}

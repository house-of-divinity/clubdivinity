"use client";

// Internal notes panel on the application detail page. Curators
// leave notes for each other; not visible to the applicant.

import { useRouter } from "next/navigation";
import { useState } from "react";

type Note = { id: string; body: string; created_at: string; author_id: string | null };

export default function NotesPanel({
  applicationId,
  notes,
}: {
  applicationId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.ok) {
        setBody("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ad-notes">
      <div className="ad-side-h">Notes between curators</div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a note for the other curator…"
      />
      <button
        className="ad-note-add"
        onClick={submit}
        disabled={busy || !body.trim()}
      >
        {busy ? "Adding…" : "Add note"}
      </button>

      <div className="ad-notes-list">
        {notes.length === 0 && (
          <div className="ad-notes-empty">No notes yet.</div>
        )}
        {notes.map((n) => (
          <div key={n.id} className="ad-note">
            <div className="ad-note-head">{relative(n.created_at)}</div>
            <div className="ad-note-body">{n.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

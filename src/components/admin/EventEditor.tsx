"use client";

// Form to edit a single event. All fields are optional except
// roman + name + starts_at. Save POSTs to /api/admin/events/[id].

import { useRouter } from "next/navigation";
import { useState } from "react";

type EventRow = {
  id: string;
  slug: string;
  roman: string;
  name: string;
  tagline: string | null;
  starts_at: string;
  location_city: string | null;
  ticket_url: string | null;
  capacity_souls: number | null;
  hosts: string[] | null;
  status: string;
  poster_url: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_state: string | null;
};

const STATUS_OPTIONS = [
  { id: "upcoming",  label: "Upcoming" },
  { id: "past",      label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

function toLocalDateTimeInput(iso: string): string {
  // <input type="datetime-local"> wants YYYY-MM-DDTHH:mm in the
  // browser's local zone. We pass through the stored value as-is.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventEditor({ event }: { event: EventRow }) {
  const router = useRouter();
  const [form, setForm] = useState({
    roman: event.roman,
    name: event.name,
    tagline: event.tagline ?? "",
    startsAtLocal: toLocalDateTimeInput(event.starts_at),
    locationCity: event.location_city ?? "Las Vegas",
    ticketUrl: event.ticket_url ?? "",
    capacitySouls: event.capacity_souls?.toString() ?? "",
    hosts: (event.hosts ?? []).join(", "),
    status: event.status,
    posterUrl: event.poster_url ?? "",
    venueName: event.venue_name ?? "",
    venueAddress: event.venue_address ?? "",
    venueCity: event.venue_city ?? "",
    venueState: event.venue_state ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roman: form.roman.trim(),
          name: form.name.trim(),
          tagline: form.tagline.trim() || null,
          startsAt: new Date(form.startsAtLocal).toISOString(),
          locationCity: form.locationCity.trim(),
          ticketUrl: form.ticketUrl.trim() || null,
          capacitySouls: form.capacitySouls ? Number(form.capacitySouls) : null,
          hosts: form.hosts.split(",").map((s) => s.trim()).filter(Boolean),
          status: form.status,
          posterUrl: form.posterUrl.trim() || null,
          venueName: form.venueName.trim() || null,
          venueAddress: form.venueAddress.trim() || null,
          venueCity: form.venueCity.trim() || null,
          venueState: form.venueState.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Save failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="ee-form" style={{ maxWidth: 720 }}>
      <div className="ev-row-2">
        <FormField label="Roman" required>
          <input
            type="text"
            value={form.roman}
            onChange={(e) => set("roman", e.target.value)}
            required
          />
        </FormField>
        <FormField label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Name" required>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </FormField>

      <FormField label="Tagline" hint="Italic gold subtitle below the name on the event card.">
        <input
          type="text"
          value={form.tagline}
          onChange={(e) => set("tagline", e.target.value)}
          placeholder="A Wilde Night where the Sky's the limit"
        />
      </FormField>

      <div className="ev-row-2">
        <FormField label="Starts at" required>
          <input
            type="datetime-local"
            value={form.startsAtLocal}
            onChange={(e) => set("startsAtLocal", e.target.value)}
            required
          />
        </FormField>
        <FormField label="Capacity (souls)">
          <input
            type="number"
            min={0}
            value={form.capacitySouls}
            onChange={(e) => set("capacitySouls", e.target.value)}
            placeholder="60"
          />
        </FormField>
      </div>

      <FormField label="Hosts" hint="Comma-separated. Shows in hero meta + the 14-day reminder email.">
        <input
          type="text"
          value={form.hosts}
          onChange={(e) => set("hosts", e.target.value)}
          placeholder="Madison Wilde, Bree Sky"
        />
      </FormField>

      <FormField label="Ticket URL" hint="TicketSpice (or future provider) link members tap to buy.">
        <input
          type="url"
          value={form.ticketUrl}
          onChange={(e) => set("ticketUrl", e.target.value)}
          placeholder="https://divinity.ticketspice.com/..."
        />
      </FormField>

      <FormField
        label="Poster URL"
        hint="Path or URL to the event flier image. We'll add drag-drop upload here later."
      >
        <input
          type="text"
          value={form.posterUrl}
          onChange={(e) => set("posterUrl", e.target.value)}
          placeholder="/assets/lovers-poster.jpeg"
        />
      </FormField>

      <h3 className="admin-section-h" style={{ marginTop: 28 }}>
        Venue — only sent in the 48-hour address email
      </h3>

      <FormField label="Venue name">
        <input
          type="text"
          value={form.venueName}
          onChange={(e) => set("venueName", e.target.value)}
          placeholder="The estate"
        />
      </FormField>

      <FormField label="Street address">
        <input
          type="text"
          value={form.venueAddress}
          onChange={(e) => set("venueAddress", e.target.value)}
        />
      </FormField>

      <div className="ev-row-2">
        <FormField label="City">
          <input
            type="text"
            value={form.venueCity}
            onChange={(e) => set("venueCity", e.target.value)}
            placeholder="Las Vegas"
          />
        </FormField>
        <FormField label="State">
          <input
            type="text"
            value={form.venueState}
            onChange={(e) => set("venueState", e.target.value)}
            placeholder="NV"
          />
        </FormField>
      </div>

      {/* Save bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 32,
          paddingTop: 24,
          borderTop: ".5px solid var(--line)",
        }}
      >
        <button
          type="submit"
          className="ee-btn ee-btn-save"
          disabled={busy}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            ✦ Saved
          </span>
        )}
        {error && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".12em",
              color: "var(--wine)",
            }}
          >
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && (
        <div
          className="field-help"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".08em" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// /me — member profile + past gatherings.
//
// Server-rendered. Reads the signed-in user from the session,
// looks up their members + event_tickets rows, renders both.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My profile · Divinity",
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();

  if (!user) {
    redirect("/?auth=required");
  }

  const admin = createSupabaseAdminClient();

  const { data: member } = await admin
    .from("members")
    .select("id, name, email, admitted_at, status, pair_id, application_id")
    .eq("email", user.email!)
    .maybeSingle();

  // Pair partner (if member is part of a couple)
  let pairPartner: { name: string } | null = null;
  if (member?.pair_id) {
    const { data: partner } = await admin
      .from("members")
      .select("name")
      .eq("pair_id", member.pair_id)
      .neq("id", member.id)
      .maybeSingle();
    pairPartner = partner;
  }

  // Past gatherings — event_tickets joined with events.
  // Filter to PAST events only (starts_at < now). Future tickets
  // for upcoming events show on the Event Spotlight on the home page.
  let pastTickets: Array<{
    eventName: string;
    eventRoman: string;
    eventDate: string;
    quantity: number;
    purchasedAt: string;
  }> = [];

  if (member) {
    const { data: tickets } = await admin
      .from("event_tickets")
      .select("quantity, purchased_at, events!inner(roman, name, starts_at)")
      .eq("member_id", member.id)
      .lt("events.starts_at", new Date().toISOString())
      .order("purchased_at", { ascending: false });

    pastTickets = (tickets ?? []).map((t) => {
      const ev = (t.events as unknown) as { roman: string; name: string; starts_at: string };
      return {
        eventName: ev.name,
        eventRoman: ev.roman,
        eventDate: ev.starts_at,
        quantity: t.quantity,
        purchasedAt: t.purchased_at,
      };
    });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        padding: "120px 48px 80px",
        maxWidth: 880,
        margin: "0 auto",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          textDecoration: "none",
        }}
      >
        ← Back to home
      </Link>

      <h1
        className="display"
        style={{
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(48px, 7vw, 80px)",
          lineHeight: 1.02,
          margin: "32px 0 14px",
        }}
      >
        Your <em style={{ color: "var(--gold)" }}>file</em>.
      </h1>

      {member ? (
        <>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: 48,
            }}
          >
            Admitted {new Date(member.admitted_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <section
            style={{
              padding: "32px 0",
              borderTop: ".5px solid var(--line)",
              borderBottom: ".5px solid var(--line)",
              marginBottom: 64,
            }}
          >
            <Row k="Name" v={member.name} />
            <Row k="Email" v={member.email} mono />
            {pairPartner && <Row k="Pair" v={pairPartner.name} />}
            <Row k="Status" v={member.status} />
          </section>
        </>
      ) : (
        <section
          style={{
            padding: 48,
            border: ".5px dashed var(--line)",
            background: "color-mix(in oklab, var(--bg-2) 50%, transparent)",
            marginBottom: 64,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 22,
              color: "var(--ink-mute)",
              lineHeight: 1.5,
            }}
          >
            You&apos;re signed in as <strong style={{ color: "var(--gold)" }}>{user.email}</strong>
            <br />but no membership is associated with this address yet.
          </p>
        </section>
      )}

      <h2
        id="gatherings"
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(32px, 4vw, 48px)",
          color: "var(--ink)",
          margin: "0 0 16px",
        }}
      >
        Past <em style={{ color: "var(--gold)" }}>gatherings</em>.
      </h2>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          color: "var(--ink-mute)",
          fontSize: 17,
          marginBottom: 32,
        }}
      >
        The nights you have been in the room.
      </p>

      {pastTickets.length > 0 ? (
        <div
          style={{
            border: ".5px solid var(--line)",
            background: "color-mix(in oklab, var(--bg-2) 30%, transparent)",
          }}
        >
          {pastTickets.map((t, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 140px 80px",
                gap: 24,
                padding: "20px 24px",
                borderBottom: i === pastTickets.length - 1 ? "none" : ".5px solid var(--line)",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--gold)",
                  fontSize: 24,
                }}
              >
                {t.eventRoman}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--ink)",
                  fontSize: 20,
                }}
              >
                {t.eventName}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "var(--ink-dim)",
                }}
              >
                {new Date(t.eventDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--gold)",
                  textAlign: "right",
                }}
              >
                {t.quantity} {t.quantity === 1 ? "ticket" : "tickets"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: 48,
            border: ".5px dashed var(--line)",
            background: "color-mix(in oklab, var(--bg-2) 30%, transparent)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 20,
              color: "var(--ink-mute)",
              lineHeight: 1.5,
            }}
          >
            You haven&apos;t been to a gathering yet.
            <br />
            The next door opens soon.
          </p>
          <Link
            href="/"
            className="btn-gold"
            style={{ display: "inline-flex", marginTop: 24, textDecoration: "none" }}
          >
            See the next gathering <span className="arr">→</span>
          </Link>
        </div>
      )}
    </main>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 24,
        padding: "16px 0",
        borderTop: ".5px solid var(--line)",
        alignItems: "baseline",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-display)",
          fontStyle: mono ? "normal" : "italic",
          fontSize: mono ? 14 : 22,
          color: "var(--ink)",
        }}
      >
        {v}
      </div>
    </div>
  );
}

// Discord webhook notifier. Fires into the #divinity channel whenever
// a new application comes in (and any other admin-alert-worthy event
// we wire up later).
//
// Setup:
//   - In Discord → channel settings → Integrations → Webhooks →
//     New Webhook → copy URL
//   - Set DISCORD_WEBHOOK_URL in Vercel env vars
//   - If unset, notifyDiscord becomes a no-op (so local dev + missing
//     env don't break the application submit flow)

const GOLD = 0xc8a352; // brand gold, same hue as our --gold token

type DiscordEmbed = {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
};

export async function notifyDiscord(payload: {
  content?: string;
  embeds?: DiscordEmbed[];
}): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[discord] webhook failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[discord] webhook threw:", e);
  }
}

// Build the embed for a new application — keep it light on detail
// (no essay, no socials, no photo) so Discord stays scannable and
// we don't leak applicant-sensitive content into a chat history.
export function newApplicationEmbed(args: {
  ref: string;
  type: "solo" | "couple";
  p1Name: string;
  p2Name?: string | null;
  city: string;
  email: string;
  applicationId: string;
  siteUrl: string;
}): DiscordEmbed {
  const nameLine = args.p2Name
    ? `${args.p1Name}  ·  ${args.p2Name}`
    : args.p1Name;
  const typeLabel = args.type === "couple" ? "Couple" : "Single woman";

  return {
    title: `✦ New application — ${args.ref}`,
    description: `**${nameLine}**`,
    url: `${args.siteUrl}/admin/applications/${args.applicationId}`,
    color: GOLD,
    fields: [
      { name: "Type",  value: typeLabel,  inline: true },
      { name: "City",  value: args.city,  inline: true },
      { name: "Email", value: args.email, inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "Club Divinity · open the curator to review" },
  };
}

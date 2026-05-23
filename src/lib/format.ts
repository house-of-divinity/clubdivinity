// Date formatting that works in both server and client.
// Pinned to en-US so SSR and CSR never disagree.

export function formatLongDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function formatWeekday(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
  });
}

export function nightsUntil(dateStr?: string) {
  if (!dateStr) return 0;
  const target = new Date(dateStr + "T20:30:00-07:00");
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86400000));
}

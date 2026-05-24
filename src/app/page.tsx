import HomeClient from "@/components/HomeClient";
import { loadHomeEvent } from "@/lib/event";

// Server component. Fetches the next gathering from the live
// events table on every request, then hands it to HomeClient.
// Admin changes (status flips, poster swaps, etc.) appear
// publicly within seconds.

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const event = await loadHomeEvent();
  return <HomeClient event={event} />;
}

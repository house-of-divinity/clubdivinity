import HomeClient from "@/components/HomeClient";

// The home route is a server component that just renders the client
// wrapper. Keeping page.tsx server-side means we can later move
// event-loading from /lib/event.ts to a real DB query and stream
// the data into the client without restructuring this file.

export default function HomePage() {
  return <HomeClient />;
}

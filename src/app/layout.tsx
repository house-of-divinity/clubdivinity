import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Divinity · By invitation",
  description:
    "An invitation-only lifestyle society in Las Vegas. Real people. Real conversations. Performances like no other.",
  metadataBase: new URL("https://clubdivinity.com"),
  openGraph: {
    title: "Divinity · By invitation",
    description:
      "An invitation-only lifestyle society in Las Vegas.",
    url: "https://clubdivinity.com",
    siteName: "Club Divinity",
    type: "website",
    images: [
      {
        // Use the redirect endpoint so the preview image always
        // points to whatever's the next upcoming event poster.
        // Some scrapers don't follow redirects — for those, the
        // direct fallback path stays in twitter.images below.
        url: "/assets/lovers-poster.jpeg",
        width: 1024,
        height: 1536,
        alt: "VI · The Lovers — Friday, June 19 · Las Vegas",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Divinity · By invitation",
    description: "An invitation-only lifestyle society in Las Vegas.",
    images: ["/assets/lovers-poster.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

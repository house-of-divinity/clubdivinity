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

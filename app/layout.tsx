import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = new URL("/og.png", `${protocol}://${host}`).toString();
  return {
    title: "One-Room Behavior Lab · v0.3.0",
    description: "A deterministic one-room social-tactics prototype built around shared Beats, constructed messages, attention, movement, and readable consequences.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "One-Room Behavior Lab v0.3.0",
      description: "Observe, plan three actions, let them collide, and read the room again.",
      type: "website",
      images: [{ url: imageUrl, width: 1764, height: 909, alt: "One-Room Behavior Lab social-tactics tableau" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "One-Room Behavior Lab v0.3.0",
      description: "A deterministic one-room social-tactics prototype.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

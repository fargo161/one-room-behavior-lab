import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trapstar Quick Scene Maker",
  description: "Build and export Apt. 305 scenes with the Trapstar visual library.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Trapstar Quick Scene Maker",
    description: "Choose a room, cast three actors, stage poses, and export a scene.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trapstar Quick Scene Maker",
    description: "Build Apt. 305 scenes fast.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

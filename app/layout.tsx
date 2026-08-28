import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Living Comic Engine v0.1",
  description: "A deterministic social world expressed as a playable living comic.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Living Comic Engine v0.1",
    description: "Act, observe, interpret, and live with what everyone thinks happened.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Living Comic Engine v0.1",
    description: "A deterministic social world expressed as a living comic.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

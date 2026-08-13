import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Room Behavior Lab · v0.2.1",
  description: "A structured-message behavior lab with explicit perception, epistemic state, joint action, and exact causal traces.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

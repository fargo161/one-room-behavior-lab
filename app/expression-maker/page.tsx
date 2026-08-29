import type { Metadata } from "next";
import "../expression-maker.css";
import ExpressionMakerApp from "../../src/expression-maker/ExpressionMakerApp";

export const metadata: Metadata = {
  title: "Trapstar Expression Maker v0.1",
  description: "Assemble, order, save, and export registered Marcus facial expressions.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Trapstar Expression Maker v0.1",
    description: "A focused Marcus facial-expression workbench.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trapstar Expression Maker v0.1",
    description: "Assemble and export registered Marcus expressions.",
    images: ["/og.png"],
  },
};

export default function ExpressionMakerPage() {
  return <ExpressionMakerApp />;
}

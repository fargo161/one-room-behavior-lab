import type { Metadata } from "next";
import "../expression-maker.css";
import ExpressionMakerApp from "../../src/expression-maker/ExpressionMakerApp";

export const metadata: Metadata = {
  title: "Trapstar Expression Maker v0.2",
  description: "Assemble, order, save, and export registered multi-character facial expressions.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Trapstar Expression Maker v0.2",
    description: "A focused multi-character facial-expression workbench for Marcus and Goose.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trapstar Expression Maker v0.2",
    description: "Assemble and export registered character-pack expressions.",
    images: ["/og.png"],
  },
};

export default function ExpressionMakerPage() {
  return <ExpressionMakerApp />;
}

import type { Metadata } from "next";
import "../npc-encounter.css";
import NpcEncounterApp from "../../src/living-comic/web/NpcEncounterApp";

export const metadata: Metadata = {
  title: "Trapstar NPC Encounter v0.1.1",
  description: "A late-night negotiation in Apartment 305.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function NpcEncounterPage() {
  return <NpcEncounterApp />;
}

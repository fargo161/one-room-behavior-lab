import { stableRuntimeId } from "../core/ids";
import { SeededRng } from "../core/rng";
import type {
  ContentManifest,
  Proposition,
  RealizedMessage,
  SemanticMessage,
} from "../schemas";
import type { ActionPackage } from "../actions";

export interface DeliveryOption {
  id: string;
  label: string;
  basedVibeId: string;
  description: string;
}

const deliveryLabels: Record<string, Omit<DeliveryOption, "id" | "basedVibeId">> = {
  vibe_ab: { label: "Make the stakes unmistakable", description: "Hard consequence, loud emphasis, assertive posture." },
  vibe_as: { label: "State it plainly", description: "Direct wording, controlled intensity, no softening." },
  vibe_sd: { label: "Invite their cooperation", description: "Offer room to choose, with a warmer approach." },
  vibe_se: { label: "Lead with care", description: "Acknowledge difficulty and keep the delivery gentle." },
  vibe_eb: { label: "Set a calm boundary", description: "Measured wording with an immovable condition." },
  vibe_ad: { label: "Push with urgency", description: "Fast delivery with interruption and raised volume." },
  vibe_db: { label: "Project certainty", description: "Confident leverage with visible guardedness." },
  vibe_de: { label: "Mask it with warmth", description: "Indirect, sympathetic delivery with ambiguous intent." },
};

const optionsByTactic: Record<SemanticMessage["tactic"], string[]> = {
  ASK: ["vibe_sd", "vibe_se", "vibe_eb", "vibe_as"],
  PRESSURE: ["vibe_ab", "vibe_as", "vibe_eb", "vibe_ad", "vibe_db"],
  DEAL: ["vibe_sd", "vibe_se", "vibe_eb", "vibe_db"],
};

export function deliveryOptionsFor(tactic: SemanticMessage["tactic"], content: ContentManifest): DeliveryOption[] {
  return optionsByTactic[tactic].flatMap((basedVibeId) => {
    const vibe = content.basedVibes.find(({ id }) => id === basedVibeId);
    const copy = deliveryLabels[basedVibeId];
    return vibe && copy ? [{ id: stableRuntimeId("delivery", tactic, basedVibeId), basedVibeId, ...copy }] : [];
  });
}

const words: Record<string, string> = {
  HELD_BY: "be held by",
  OWNED_BY: "belong to",
  LOCATED_AT: "move to",
  LOCATED_IN: "be inside",
  ACCESSIBLE_TO: "be accessible to",
  ACCESS_DENIED_TO: "be kept from",
  AVAILABLE_TO: "be made available to",
  OFFERED_TO: "be offered to",
  ATTENDING_TO: "pay attention to",
  VISIBLE: "be visible",
  VISIBLE_TO: "be shown to",
  OPEN: "be opened",
  EXPOSED: "be exposed",
};

export function describeProposition(proposition: Proposition): string {
  const relation = words[proposition.predicate] ?? proposition.predicate.toLowerCase().replaceAll("_", " ");
  const object = proposition.objectId?.replaceAll("_", " ") ?? String(proposition.value);
  return `${proposition.subjectId.replaceAll("_", " ")} ${relation} ${object}`;
}

const hashText = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const sentenceForVibe = (base: string, vibeId: string): string => {
  const lower = `${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  switch (vibeId) {
    // Wording realization may alter cadence, emphasis, politeness, and
    // discourse markers, but it must not invent a new claim, motive, threat,
    // or promise that is absent from the authoritative SemanticMessage.
    case "vibe_ab": return base.replace(/[.?]\s*$/, "!");
    case "vibe_as": return base.replace(/^Could you /, "Please ").replace(/^Will you /, "Please ");
    case "vibe_sd": return `Maybe—${lower}`;
    case "vibe_se": return `Please—${lower}`;
    case "vibe_eb": return `Still: ${lower}`;
    case "vibe_ad": return `Now—${lower}`;
    case "vibe_db": return `So: ${lower}`;
    case "vibe_de": return `Well... ${lower}`;
    default: return base;
  }
};

export function realizeMessage(
  message: SemanticMessage,
  content: ContentManifest,
  seed: number,
  variantIndex = 0,
): RealizedMessage {
  const vibe = content.basedVibes.find(({ id }) => id === message.basedVibeId);
  if (!vibe) throw new Error(`Unknown BASED Vibe: ${message.basedVibeId}`);
  const pool = content.messageFragments.find(({ tactic }) => tactic === message.tactic);
  if (!pool) throw new Error(`No wording fragments for ${message.tactic}`);
  const rng = new SeededRng((seed ^ hashText(message.id) ^ Math.imul(variantIndex + 1, 0x9e3779b9)) | 0);
  const template = pool.fragments[rng.integer(pool.fragments.length)]!;
  const requested = message.claims.find(({ kind }) => kind === "REQUESTED_CHANGE")?.proposition ?? message.desiredStateChange;
  const consequence = message.claims.find(({ kind }) => kind === "THREATENED_CONSEQUENCE")?.proposition;
  const offered = message.claims.find(({ kind }) => kind === "OFFERED_CHANGE")?.proposition;
  const base = template
    .replaceAll("{change}", describeProposition(requested))
    .replaceAll("{consequence}", consequence ? describeProposition(consequence) : "the situation changes")
    .replaceAll("{offer}", offered ? describeProposition(offered) : "do my part");
  const label = deliveryLabels[vibe.id]?.label ?? vibe.name;
  return {
    id: stableRuntimeId("realization", message.id, vibe.id, variantIndex),
    messageId: message.id,
    variantIndex,
    wording: sentenceForVibe(base, vibe.id),
    deliveryLabel: label,
    basedVibeId: vibe.id,
    paralanguageCueIds: [...new Set([...message.paralanguageCueIds, ...vibe.paralanguageCueIds])],
    poseId: vibe.poseId,
    faceId: vibe.faceId,
    balloonId: message.delivery === "PRIVATE" ? "balloon_private" : vibe.balloonId,
    interpretationCueIds: vibe.interpretationCueIds,
  };
}

export function realizeActionPackage(
  actionPackage: ActionPackage,
  content: ContentManifest,
  seed: number,
  variantIndex = 0,
): ActionPackage {
  if (!actionPackage.message) return actionPackage;
  return {
    ...actionPackage,
    realizedMessage: realizeMessage(actionPackage.message, content, seed, variantIndex),
  };
}

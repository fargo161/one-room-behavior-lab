import type {
  AcknowledgmentId,
  ActorId,
  ConditionId,
  CoreContentId,
  EvidenceId,
  MessageCompatibilityResult,
  MessageComponentCategory,
  MessageDraftV3,
  OfferId,
  PackagingEvidence,
  PromiseId,
  QualificationId,
  ReasonId,
  StructuredMessageEvent,
  WarningId,
  WorldStateV3,
} from "./types";

type Piece<T extends string> = Record<T, string>;

const coreText: Piece<CoreContentId> = {
  ASK_FOR_ENVELOPE: "I need you to let me see the envelope",
  ASK_INTENTIONS: "Tell me what you intend to do next",
  OFFER_HELP: "I can help you get through this",
  SHARE_AUTHORIZATION: "I have authorization to handle the envelope",
  REQUEST_PRIVACY: "I need to speak with you privately",
  WARN_ABOUT_EXIT: "The situation at the door is changing",
  REPORT_DANGER: "There is a danger here that you need to notice",
};

const partialFragments: Piece<CoreContentId> = {
  ASK_FOR_ENVELOPE: "...the envelope...",
  ASK_INTENTIONS: "...what you intend...",
  OFFER_HELP: "...help you...",
  SHARE_AUTHORIZATION: "...authorization...envelope...",
  REQUEST_PRIVACY: "...speak...privately...",
  WARN_ABOUT_EXIT: "...the door...changing...",
  REPORT_DANGER: "...danger here...",
};

const reasons: Piece<ReasonId> = {
  NONE: "",
  SAFETY: "because it is the safest way through this",
  AUTHORIZATION: "because I am authorized to do it",
  TRUST: "because I am asking you to trust me",
  TIME_PRESSURE: "because we do not have much time",
};
const evidence: Piece<EvidenceId> = {
  NONE: "",
  SIGNED_NOTE: "The signed note supports that",
  OPEN_DOOR: "The open door is evidence that we need to act",
  MARA_STATEMENT: "Mara's own statement supports it",
  DREW_GLANCES: "I have seen Drew keep checking the envelope",
};
const acknowledgments: Piece<AcknowledgmentId> = {
  NONE: "",
  YOUR_CONCERN: "I understand why you are concerned",
  YOUR_CHOICE: "The decision is still yours",
  THE_RISK: "I recognize the risk you are carrying",
};
const promises: Piece<PromiseId> = {
  NONE: "",
  RETURN_ENVELOPE: "I will return it when we are done",
  KEEP_CONFIDENCE: "I will keep what you tell me in confidence",
  LEAVE_AFTER: "I will leave as soon as this is settled",
};
const offers: Piece<OfferId> = {
  NONE: "",
  SHOW_AUTHORIZATION: "I can show you the authorization",
  HELP_MARA: "I can help Mara reach the door safely",
  STEP_BACK: "I can step back while you decide",
};
const qualifications: Piece<QualificationId> = {
  NONE: "",
  IF_I_AM_RIGHT: "If I am reading this correctly",
  ONLY_FOR_A_MOMENT: "Only for a moment",
  AS_FAR_AS_I_KNOW: "As far as I know",
};
const conditions: Piece<ConditionId> = {
  NONE: "",
  IF_MARA_AGREES: "This only happens if Mara agrees",
  IF_DREW_STEPS_AWAY: "This only happens if Drew steps away",
  IF_DOOR_STAYS_OPEN: "This only happens while the door stays open",
};
const warnings: Piece<WarningId> = {
  NONE: "",
  MARA_MAY_LEAVE: "If we wait, Mara may leave",
  ENVELOPE_MAY_BE_LOST: "If we delay, the envelope may be lost",
  OTHERS_MAY_NOTICE: "If we continue openly, others may notice",
};

export const messageOptions = { coreText, reasons, evidence, acknowledgments, promises, offers, qualifications, conditions, warnings };

export const messageComponentLabels: Record<MessageComponentCategory, string> = {
  reasonId: "Give a reason",
  evidenceId: "Cite evidence",
  acknowledgmentId: "Acknowledge concern",
  promiseId: "Make a promise",
  offerId: "Make an offer",
  qualificationId: "Add a qualification",
  conditionId: "Add a condition",
  warningId: "Add a warning",
  refusalSpace: "Leave room to refuse",
};

interface MessageRule {
  allowed: MessageComponentCategory[];
  required: MessageComponentCategory[];
}

/** PROVISIONAL / PROTOTYPE-LOCAL compatibility data shared by engine and UI. */
export const messageCompatibilityRules: Record<CoreContentId, MessageRule> = {
  ASK_FOR_ENVELOPE: { allowed: ["reasonId", "evidenceId", "acknowledgmentId", "promiseId", "offerId", "qualificationId", "conditionId", "refusalSpace"], required: [] },
  ASK_INTENTIONS: { allowed: ["reasonId", "acknowledgmentId", "qualificationId", "refusalSpace"], required: [] },
  OFFER_HELP: { allowed: ["reasonId", "acknowledgmentId", "promiseId", "offerId", "qualificationId", "conditionId", "refusalSpace"], required: [] },
  SHARE_AUTHORIZATION: { allowed: ["reasonId", "evidenceId", "acknowledgmentId", "offerId", "qualificationId", "refusalSpace"], required: ["evidenceId"] },
  REQUEST_PRIVACY: { allowed: ["reasonId", "acknowledgmentId", "promiseId", "qualificationId", "conditionId", "warningId", "refusalSpace"], required: [] },
  WARN_ABOUT_EXIT: { allowed: ["reasonId", "evidenceId", "acknowledgmentId", "conditionId", "warningId", "refusalSpace"], required: [] },
  REPORT_DANGER: { allowed: ["reasonId", "evidenceId", "qualificationId", "warningId", "refusalSpace"], required: [] },
};

const componentValue = (draft: MessageDraftV3, category: MessageComponentCategory): string | boolean => draft[category];
const componentActive = (draft: MessageDraftV3, category: MessageComponentCategory): boolean => {
  const value = componentValue(draft, category);
  return typeof value === "boolean" ? value : value !== "NONE";
};

const worldAvailability = (world: WorldStateV3, draft: MessageDraftV3, category: MessageComponentCategory): string | null => {
  if (!componentActive(draft, category)) return null;
  if (category === "evidenceId" && draft.evidenceId === "OPEN_DOOR" && !world.room.doorOpen) return "The door is not currently open.";
  if (category === "evidenceId" && draft.evidenceId === "MARA_STATEMENT" && !world.actors.MARA.active) return "Mara is no longer present to verify the statement.";
  if (category === "evidenceId" && draft.evidenceId === "DREW_GLANCES" && !world.actors.DREW.active) return "Drew is no longer present for the cited behavior to be checked.";
  if (category === "conditionId" && draft.conditionId === "IF_DOOR_STAYS_OPEN" && !world.room.doorOpen) return "The door is not currently open.";
  if (category === "conditionId" && draft.conditionId === "IF_DREW_STEPS_AWAY" && !world.actors.DREW.active) return "Drew is no longer in the room.";
  return null;
};

const risky = (world: WorldStateV3, draft: MessageDraftV3, category: MessageComponentCategory): boolean => {
  if (category === "evidenceId" && draft.evidenceId === "SIGNED_NOTE") return !world.actors.PLAYER.observations.some((item) => item.evidence.some((line) => line.toLowerCase().includes("signed note")));
  if (category === "evidenceId" && draft.evidenceId === "MARA_STATEMENT") return !world.messages.some((item) => item.senderId === "MARA");
  if (category === "promiseId" && draft.promiseId === "RETURN_ENVELOPE") return world.envelope.state === "LOCKED_AWAY" || world.envelope.holderId !== "PLAYER";
  if (category === "offerId" && draft.offerId === "SHOW_AUTHORIZATION") return draft.evidenceId !== "SIGNED_NOTE";
  return false;
};

export function validateMessageDraft(world: WorldStateV3, draft: MessageDraftV3): MessageCompatibilityResult {
  const rule = messageCompatibilityRules[draft.coreContentId];
  const invalidReasons: string[] = [];
  const unavailableComponents: MessageComponentCategory[] = [];
  const riskyComponents: MessageComponentCategory[] = [];
  for (const category of Object.keys(messageComponentLabels) as MessageComponentCategory[]) {
    if (!componentActive(draft, category)) continue;
    if (!rule.allowed.includes(category)) invalidReasons.push(`${messageComponentLabels[category]} is not relevant to ${draft.coreContentId}.`);
    const unavailable = worldAvailability(world, draft, category);
    if (unavailable) {
      unavailableComponents.push(category);
      invalidReasons.push(`${messageComponentLabels[category]} is unavailable: ${unavailable}`);
    }
    if (risky(world, draft, category)) riskyComponents.push(category);
  }
  const requiredMissing = rule.required.filter((category) => !componentActive(draft, category) || unavailableComponents.includes(category));
  for (const category of requiredMissing) invalidReasons.push(`${messageComponentLabels[category]} is required for ${draft.coreContentId}.`);
  return { valid: invalidReasons.length === 0, invalidReasons, requiredMissing, unavailableComponents, riskyComponents };
}

export function getMessageOptionState(world: WorldStateV3, draft: MessageDraftV3, category: MessageComponentCategory, value: string | boolean): { enabled: boolean; reason: string | null; risky: boolean } {
  if (!messageCompatibilityRules[draft.coreContentId].allowed.includes(category)) return { enabled: false, reason: "Not relevant to this core message.", risky: false };
  const candidate = { ...draft, [category]: value } as MessageDraftV3;
  const unavailable = worldAvailability(world, candidate, category);
  return { enabled: !unavailable, reason: unavailable, risky: risky(world, candidate, category) };
}

export const contextualMessageCategories = (coreContentId: CoreContentId): MessageComponentCategory[] => [...messageCompatibilityRules[coreContentId].allowed];

export const clearIncompatibleMessageComponents = (draft: MessageDraftV3): MessageDraftV3 => {
  const allowed = messageCompatibilityRules[draft.coreContentId].allowed;
  const next = { ...draft };
  const defaults = defaultPlayerMessageDraft();
  for (const category of Object.keys(messageComponentLabels) as MessageComponentCategory[]) {
    if (!allowed.includes(category)) Object.assign(next, { [category]: defaults[category] });
  }
  return next;
};

export const messageToDraft = (message: StructuredMessageEvent): MessageDraftV3 => ({
  recipientId: message.intendedRecipients[0],
  coreContentId: message.coreContentId,
  ...message.components,
  deliveryMode: message.deliveryMode,
});

const canonicalize = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const fnv = (text: string, seed: number): string => {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

export const messagePayloadFingerprint = (payload: unknown): string => {
  const text = canonicalize(payload);
  return [2166136261, 2246822519, 3266489917, 668265263].map((seed) => fnv(text, seed)).join("");
};

export const derivePackagingEvidence = (draft: MessageDraftV3): PackagingEvidence => {
  const explanationDensity = [draft.reasonId, draft.evidenceId, draft.promiseId, draft.offerId].filter((value) => value !== "NONE").length;
  const qualification = draft.qualificationId !== "NONE";
  const warning = draft.warningId !== "NONE";
  return {
    directness: draft.directness,
    delivery: draft.deliveryMode,
    explicitness: explanationDensity >= 3 ? "HIGH" : explanationDensity >= 1 ? "MEDIUM" : "LOW",
    qualification,
    hedging: qualification,
    closure: draft.refusalSpace ? "OPEN" : draft.conditionId !== "NONE" ? "CONDITIONAL" : "CLOSED",
    emphasis: warning || draft.directness === "BLUNT" ? "HIGH" : draft.directness === "PLAIN" ? "MEDIUM" : "LOW",
    acknowledgment: draft.acknowledgmentId !== "NONE",
    refusalSpace: draft.refusalSpace,
    explanationDensity,
    turnBehavior: draft.refusalSpace ? "YIELDS" : "HOLDS",
  };
};

export const renderMessage = (draft: MessageDraftV3): string => {
  const pieces = [
    draft.acknowledgmentId !== "NONE" ? acknowledgments[draft.acknowledgmentId] : "",
    qualifications[draft.qualificationId],
    coreText[draft.coreContentId],
    reasons[draft.reasonId],
    evidence[draft.evidenceId],
    promises[draft.promiseId],
    offers[draft.offerId],
    conditions[draft.conditionId],
    warnings[draft.warningId],
  ].filter(Boolean);
  if (draft.refusalSpace) pieces.push("You can say no");
  return `${pieces.join(". ").replace(/\.\s*$/, "")}.`;
};

export function createStructuredMessage(senderId: ActorId, beat: number, draft: MessageDraftV3): StructuredMessageEvent {
  const payload = {
    version: "0.3.0",
    beat,
    senderId,
    intendedRecipients: [draft.recipientId] as ActorId[],
    coreContentId: draft.coreContentId,
    components: {
      reasonId: draft.reasonId,
      evidenceId: draft.evidenceId,
      acknowledgmentId: draft.acknowledgmentId,
      promiseId: draft.promiseId,
      offerId: draft.offerId,
      qualificationId: draft.qualificationId,
      conditionId: draft.conditionId,
      warningId: draft.warningId,
      directness: draft.directness,
      refusalSpace: draft.refusalSpace,
    },
    deliveryMode: draft.deliveryMode,
  } as const;
  return { ...payload, id: `MSG_B${String(beat).padStart(2, "0")}_${messagePayloadFingerprint(payload)}`, packagingEvidence: derivePackagingEvidence(draft), surfaceText: renderMessage(draft) };
}

export const partialMessageFragment = (message: StructuredMessageEvent): string => partialFragments[message.coreContentId];

export const defaultPlayerMessageDraft = (): MessageDraftV3 => ({
  recipientId: "MARA",
  coreContentId: "ASK_INTENTIONS",
  reasonId: "NONE",
  evidenceId: "NONE",
  acknowledgmentId: "NONE",
  promiseId: "NONE",
  offerId: "NONE",
  qualificationId: "NONE",
  conditionId: "NONE",
  warningId: "NONE",
  directness: "PLAIN",
  refusalSpace: false,
  deliveryMode: "NORMAL",
});

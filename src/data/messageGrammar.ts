import type { BuilderFieldIntegrity, CharacterId, Dpa, MessageDraft, PlayerFunctionId, StructuredMessage, SubjectId, ValidationIssue, Visibility, VibeCode } from "../core/types";
import { getVibe } from "./based";
import { getFunction } from "./functions";
import { getProposition, propositions } from "./propositions";

export const recipients: Array<{ id: CharacterId; label: string; help: string }> = [
  { id: "MARA", label: "Mara", help: "Mara receives the full message." },
  { id: "DREW", label: "Drew", help: "Drew receives the full message." },
];

export const subjects: Array<{ id: SubjectId; label: string; help: string }> = ["MARA", "DREW", "ENVELOPE", "PLAYER", "AUTHORIZATION", "TRANSFER", "ATTENTION", "EXIT"].map((id) => ({ id: id as SubjectId, label: id.replaceAll("_", " ").toLowerCase(), help: "Semantic metadata and validation context; no independent numeric modifier in v0.2.1." }));
const playerFunctionOptions: Array<{ id: PlayerFunctionId; label: string; help: string }> = [
  { id: "CREATE_OPPORTUNITY", label: "Create opportunity", help: "Try to establish monitoring or conditions for a later opening; it does not award opportunity directly." },
  { id: "VERIFY_INFORMATION", label: "Verify information", help: "Try to make evidence-seeking behavior useful." },
  { id: "REDUCE_UNCERTAINTY", label: "Reduce uncertainty", help: "Try to narrow a relevant unknown before commitment." },
  { id: "PRESERVE_RELATIONSHIP", label: "Preserve relationship", help: "Try to avoid unnecessary damage to cooperation." },
  { id: "DISCHARGE_OBLIGATION", label: "Discharge obligation", help: "Try to settle accepted terms or a recognized commitment." },
  { id: "MAINTAIN_CONTROL", label: "Maintain control", help: "Try to keep access and decisions inside tolerable bounds." },
  { id: "REDUCE_RISK", label: "Reduce risk", help: "Try to lower believed danger or personal consequence." },
  { id: "EXIT_SITUATION", label: "Exit situation", help: "Try to end participation under current conditions." },
];
export const functions: Array<{ id: PlayerFunctionId; label: string; help: string; operationalStatus: "OPERATIONAL" | "PARTIAL" }> = playerFunctionOptions.map((entry) => ({ ...entry, operationalStatus: getFunction(entry.id).operationalStatus as "OPERATIONAL" | "PARTIAL" }));

export const reasons = [
  { id: "REASON_SAFER", label: "It is safer", fragment: "because it keeps the room safer" },
  { id: "REASON_CLARITY", label: "We need clarity", fragment: "because we need a clear account" },
  { id: "REASON_TRUST", label: "On trust", fragment: "on the trust already between us" },
];
export const offeredValues = [
  { id: "PLAYER_PROTECTS_DREW", label: "Player protects Drew", fragment: "and I will protect you from the fallout" },
  { id: "MARA_PROVIDES_INFORMATION", label: "Mara provides information", fragment: "and Mara will give you the information you need" },
  { id: "PLAYER_ACCEPTS_RESPONSIBILITY", label: "Player accepts responsibility", fragment: "and I will carry the report" },
  { id: "FUTURE_RECIPROCITY", label: "Future reciprocity", fragment: "and the favor will be returned" },
];
export const consequences = [
  { id: "REFUSAL_REPORTED", label: "Refusal reported", fragment: "or your refusal will be reported" },
  { id: "RESPONSIBILITY_ASSIGNED", label: "Responsibility assigned", fragment: "or the responsibility stays with you" },
  { id: "ACCESS_WITHDRAWN", label: "Access withdrawn", fragment: "or your access will be withdrawn" },
  { id: "SECRET_REVEALED", label: "Secret revealed", fragment: "or what you concealed will be revealed" },
  { id: "RELATIONSHIP_DAMAGED", label: "Relationship damaged", fragment: "or this relationship changes" },
];

export const emptyDraft = (): MessageDraft => ({ recipientId: null, subjectId: null, dpa: null, functionId: null, visibility: null, deliveryVibe: null, propositionId: null });

export function validateDraft(draft: MessageDraft): { valid: boolean; issues: ValidationIssue[]; validationRefs: string[] } {
  const issues: ValidationIssue[] = [];
  const required: Array<[keyof MessageDraft, unknown, string]> = [
    ["recipientId", draft.recipientId, "Choose who receives the full message."], ["subjectId", draft.subjectId, "Choose who or what the message concerns."],
    ["dpa", draft.dpa, "Choose Ask, Deal, or Pressure."], ["functionId", draft.functionId, "Choose one intended function."],
    ["visibility", draft.visibility, "Choose Private or Public."], ["deliveryVibe", draft.deliveryVibe, "Choose an enabled provisional delivery Vibe."],
    ["propositionId", draft.propositionId, "Choose a proposition."],
  ];
  for (const [field, value, explanation] of required) if (!value) issues.push({ field, code: `REQUIRED_${String(field).toUpperCase()}`, explanation });
  if (draft.deliveryVibe && getVibe(draft.deliveryVibe).status !== "PROTOTYPE_PROVISIONAL") issues.push({ field: "deliveryVibe", code: "VIBE_UNMAPPED", explanation: "This structurally valid Vibe has no supplied prototype mapping and cannot be selected." });
  if (draft.propositionId) {
    const proposition = getProposition(draft.propositionId);
    if (draft.recipientId && !proposition.allowedRecipients.includes(draft.recipientId)) issues.push({ field: "propositionId", code: "PROP_RECIPIENT_MISMATCH", explanation: `${proposition.label} is not authored for ${draft.recipientId}.` });
    if (draft.subjectId && !proposition.subjectIds.includes(draft.subjectId)) issues.push({ field: "subjectId", code: "PROP_SUBJECT_MISMATCH", explanation: `${proposition.label} is not about ${draft.subjectId.toLowerCase()}.` });
    if (draft.dpa && !proposition.allowedDpa.includes(draft.dpa)) issues.push({ field: "dpa", code: "PROP_DPA_MISMATCH", explanation: `${proposition.label} cannot currently be framed as ${draft.dpa}.` });
    if (draft.functionId && !proposition.compatibleFunctions.includes(draft.functionId)) issues.push({ field: "functionId", code: "PROP_FUNCTION_MISMATCH", explanation: `${draft.functionId.replaceAll("_", " ").toLowerCase()} is not a declared application for ${proposition.label}.` });
  }
  if (draft.dpa === "DEAL" && !draft.dealPayload?.offeredValueId) issues.push({ field: "dealPayload", code: "DEAL_REQUIRES_OFFER", explanation: "A Deal must name what the recipient receives in exchange." });
  if (draft.dpa === "PRESSURE" && !draft.pressurePayload?.consequenceId) issues.push({ field: "pressurePayload", code: "PRESSURE_REQUIRES_CONSEQUENCE", explanation: "Pressure must name the consequence that makes refusal costly." });
  return { valid: issues.length === 0, issues, validationRefs: issues.length ? [] : ["RULE_MESSAGE_REQUIRED_FIELDS", "RULE_PROPOSITION_RELATIONS", "RULE_DPA_TERMS", "RULE_ENABLED_VIBE"] };
}

export function compatiblePropositions(draft: MessageDraft) {
  return propositions.map((proposition) => {
    const reasons: string[] = [];
    if (draft.recipientId && !proposition.allowedRecipients.includes(draft.recipientId)) reasons.push(`Not authored for ${draft.recipientId.toLowerCase()}.`);
    if (draft.subjectId && !proposition.subjectIds.includes(draft.subjectId)) reasons.push(`Not about ${draft.subjectId.toLowerCase()}.`);
    if (draft.dpa && !proposition.allowedDpa.includes(draft.dpa)) reasons.push(`Cannot be framed as ${draft.dpa.toLowerCase()}.`);
    if (draft.functionId && !proposition.compatibleFunctions.includes(draft.functionId)) reasons.push(`Does not apply ${draft.functionId.replaceAll("_", " ").toLowerCase()}.`);
    return { proposition, enabled: reasons.length === 0, reasons };
  });
}

export function renderMessage(draft: MessageDraft): string {
  if (!draft.propositionId || !draft.dpa || !draft.recipientId) return "Complete the message to generate a line.";
  const proposition = getProposition(draft.propositionId);
  const base = proposition.renderFragments[draft.dpa];
  if (!base) return "This proposition cannot use the selected social structure.";
  const reason = draft.dpa === "ASK" && draft.askPayload?.reasonId ? reasons.find((entry) => entry.id === draft.askPayload?.reasonId)?.fragment : null;
  const offer = draft.dpa === "DEAL" ? offeredValues.find((entry) => entry.id === draft.dealPayload?.offeredValueId)?.fragment : null;
  const consequence = draft.dpa === "PRESSURE" ? consequences.find((entry) => entry.id === draft.pressurePayload?.consequenceId)?.fragment : null;
  const body = [base, reason, offer, consequence].filter(Boolean).join(", ");
  const punctuation = draft.deliveryVibe === "AD" || draft.deliveryVibe === "BE" ? "." : draft.dpa === "ASK" ? "?" : ".";
  return `${draft.recipientId === "MARA" ? "Mara" : "Drew"}—${body}${punctuation}`;
}

function payloadFingerprint(payload: object): string {
  const normalized = JSON.stringify(payload);
  let hashA = 0x811c9dc5, hashB = 0x9e3779b9;
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    hashA ^= code; hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + index; hashB = Math.imul(hashB, 0x85ebca6b); hashB ^= hashB >>> 13;
  }
  return `${(hashA >>> 0).toString(16).padStart(8, "0")}${(hashB >>> 0).toString(16).padStart(8, "0")}`;
}

export function builderFieldIntegrity(message: StructuredMessage | null): BuilderFieldIntegrity[] {
  const functionStatus = message ? getFunction(message.functionId).operationalStatus : "OPERATIONAL";
  return [
    { field: "RECIPIENT", role: "MECHANICAL", contributesTo: ["content access", "acceptance authority", "reception profile"], canAffectBehavior: true, provisional: false, explanation: "Determines who receives full content and may accept the intervention." },
    { field: "SUBJECT", role: "SEMANTIC_METADATA", contributesTo: ["validation", "message identity", "trace metadata"], canAffectBehavior: false, provisional: true, explanation: "Constrains proposition compatibility but has no independent numeric modifier in v0.2.1." },
    { field: "DPA", role: "MECHANICAL", contributesTo: ["value", "threat", "burden", "voluntariness", "urgency", "resistance", "commitment rules"], canAffectBehavior: true, provisional: true, explanation: "Ask, Deal, and Pressure have distinct scenario-local interpretation rules." },
    { field: "FUNCTION", role: functionStatus === "PARTIAL" ? "CONDITIONAL" : "MECHANICAL", contributesTo: ["Functional Application", "pressure", "behavior score"], canAffectBehavior: true, provisional: true, explanation: message ? `${getFunction(message.functionId).operationalStatus}: ${getFunction(message.functionId).operationalNote} Function reinterpretation is not implemented.` : "Function status depends on the selected Function." },
    { field: "VISIBILITY", role: "MECHANICAL", contributesTo: ["event salience", "content access", "bounded inference"], canAffectBehavior: true, provisional: false, explanation: "Controls who can access content; private contact may still be noticed." },
    { field: "DELIVERY_VIBE", role: "MECHANICAL", contributesTo: ["recipient-sensitive reception", "generated punctuation"], canAffectBehavior: true, provisional: true, explanation: "Uses an enabled prototype mapping; canonical name and room alias remain separate." },
    { field: "PROPOSITION", role: "MECHANICAL", contributesTo: ["content", "requested action", "reported belief", "commitment specificity"], canAffectBehavior: true, provisional: true, explanation: "Carries the authored semantic request or claim; generated wording never controls mechanics." },
    { field: "DPA_TERMS", role: message?.dpa === "ASK" ? "PRESENTATIONAL" : "MECHANICAL", contributesTo: message?.dpa === "ASK" ? ["generated wording", "message identity"] : message?.dpa === "DEAL" ? ["exchange value", "message identity"] : ["consequence severity", "enforceability", "message identity"], canAffectBehavior: message?.dpa !== "ASK", provisional: true, explanation: message?.dpa === "ASK" ? "Ask reason changes wording and provenance only in v0.2.1." : "Deal offer or Pressure consequence enters interpretation mechanically." },
  ];
}

export function buildStructuredMessage(draft: MessageDraft, beat: number): StructuredMessage {
  const validation = validateDraft(draft);
  if (!validation.valid) throw new Error(validation.issues.map((issue) => issue.explanation).join(" "));
  const recipientId = draft.recipientId as CharacterId;
  const subjectId = draft.subjectId as SubjectId;
  const dpa = draft.dpa as Dpa;
  const functionId = draft.functionId as PlayerFunctionId;
  const visibility = draft.visibility as Visibility;
  const deliveryVibe = draft.deliveryVibe as VibeCode;
  const propositionId = draft.propositionId as string;
  const fingerprint = payloadFingerprint({ beat, recipientId, subjectId, dpa, functionId, visibility, deliveryVibe, propositionId, askReasonId: draft.askPayload?.reasonId ?? null, dealOfferedValueId: draft.dealPayload?.offeredValueId ?? null, dealConditionId: draft.dealPayload?.conditionId ?? null, pressureConsequenceId: draft.pressurePayload?.consequenceId ?? null, pressureLeverageId: draft.pressurePayload?.leverageId ?? null });
  const id = `MSG_B${String(beat).padStart(2, "0")}_${fingerprint}`;
  return { id, version: "0.2", beat, senderId: "PLAYER", recipientId, subjectId, dpa, functionId, visibility, deliveryVibe, propositionId, askPayload: draft.askPayload, dealPayload: draft.dealPayload, pressurePayload: draft.pressurePayload, surfaceText: renderMessage(draft), validationRefs: validation.validationRefs };
}

import type { PropositionDefinition } from "../core/types";

export const propositions: PropositionDefinition[] = [
  {
    id: "MARA_MONITOR_DREW", version: "0.2-provisional", label: "Mara monitors Drew", kind: "REQUESTED_ACTION",
    subjectIds: ["DREW", "ATTENTION"], allowedRecipients: ["MARA"], allowedDpa: ["ASK", "DEAL", "PRESSURE"],
    compatibleFunctions: ["CREATE_OPPORTUNITY", "REDUCE_RISK"], referencedEntities: ["MARA", "DREW"], requestedBehavior: "MONITOR_DREW",
    renderFragments: { ASK: "Watch Drew and wait for a real opening", DEAL: "Watch Drew and hold for an opening", PRESSURE: "Keep your eyes on Drew and do not move early" },
    boundaryNotes: ["This asks for monitoring. It does not directly grant opportunity or command a later take."],
  },
  {
    id: "DREW_VERIFY_WITH_PLAYER", version: "0.2-provisional", label: "Drew verifies with the player", kind: "REQUESTED_ACTION",
    subjectIds: ["PLAYER", "ATTENTION"], allowedRecipients: ["DREW"], allowedDpa: ["ASK", "DEAL", "PRESSURE"],
    compatibleFunctions: ["VERIFY_INFORMATION", "REDUCE_UNCERTAINTY"], referencedEntities: ["DREW", "PLAYER"], requestedBehavior: "QUESTION_PLAYER",
    renderFragments: { ASK: "Check the authorization with me before you decide", DEAL: "Verify the authorization with me before you decide", PRESSURE: "Verify the authorization with me before you make this your responsibility" },
    boundaryNotes: ["This can redirect attention through verification; it does not set attention directly."],
  },
  {
    id: "DREW_RELEASE_ENVELOPE_TO_MARA", version: "0.2-provisional", label: "Release the envelope to Mara", kind: "REQUESTED_ACTION",
    subjectIds: ["TRANSFER", "ENVELOPE"], allowedRecipients: ["DREW"], allowedDpa: ["ASK", "DEAL", "PRESSURE"],
    compatibleFunctions: ["DISCHARGE_OBLIGATION", "PRESERVE_RELATIONSHIP", "REDUCE_RISK"], referencedEntities: ["DREW", "MARA", "ENVELOPE"], requestedBehavior: "OFFER_TRANSFER",
    renderFragments: { ASK: "Will you release the envelope to Mara", DEAL: "Release the envelope to Mara", PRESSURE: "Release the envelope to Mara" },
    boundaryNotes: ["Acceptance can make an offer competitive. The message itself never changes possession."],
  },
  {
    id: "MARA_IS_AUTHORIZED", version: "0.2-provisional", label: "Mara is authorized", kind: "CLAIM",
    subjectIds: ["MARA", "AUTHORIZATION"], allowedRecipients: ["DREW", "MARA"], allowedDpa: ["ASK", "DEAL", "PRESSURE"],
    compatibleFunctions: ["VERIFY_INFORMATION", "REDUCE_UNCERTAINTY", "PRESERVE_RELATIONSHIP"], referencedEntities: ["MARA", "ENVELOPE"], beliefPredicate: "authorized", reportedValue: true,
    worldEvaluationRule: "RULE_WORLD_AUTHORIZATION_UNKNOWN", renderFragments: { ASK: "Treat Mara as authorized for this handoff", DEAL: "Recognize Mara's authorization for this handoff", PRESSURE: "Mara is authorized for this handoff" },
    boundaryNotes: ["World evaluation is not consulted during credibility. Acceptance creates a reported belief only."],
  },
  {
    id: "MARA_WAIT", version: "0.2-provisional", label: "Mara waits", kind: "REQUESTED_ACTION",
    subjectIds: ["MARA", "ATTENTION"], allowedRecipients: ["MARA"], allowedDpa: ["ASK", "DEAL", "PRESSURE"],
    compatibleFunctions: ["REDUCE_RISK", "CREATE_OPPORTUNITY"], referencedEntities: ["MARA"], requestedBehavior: "WAIT",
    renderFragments: { ASK: "Wait until the room changes", DEAL: "Wait until the room changes", PRESSURE: "Do not move before the room changes" },
    boundaryNotes: ["Waiting preserves a later choice; it is not a hidden command to steal."],
  },
  {
    id: "MARA_LEAVE_WITH_ENVELOPE", version: "0.2-provisional", label: "Mara leaves with the envelope", kind: "DESIRED_STATE",
    subjectIds: ["EXIT", "ENVELOPE"], allowedRecipients: ["MARA"], allowedDpa: ["ASK", "DEAL", "PRESSURE"],
    compatibleFunctions: ["EXIT_SITUATION", "REDUCE_RISK"], referencedEntities: ["MARA", "ENVELOPE", "EXIT"], requestedBehavior: "LEAVE",
    renderFragments: { ASK: "Leave with the envelope when you judge it safe", DEAL: "Leave with the envelope when the exchange is complete", PRESSURE: "Get out with the envelope before the situation closes" },
    boundaryNotes: ["Eligibility still requires possession and an accessible exit."],
  },
  {
    id: "PLAYER_WILL_PROTECT_DREW", version: "0.2-provisional", label: "Player protects Drew", kind: "CLAIM",
    subjectIds: ["PLAYER", "DREW"], allowedRecipients: ["DREW"], allowedDpa: ["ASK", "DEAL"],
    compatibleFunctions: ["REDUCE_RISK", "PRESERVE_RELATIONSHIP"], referencedEntities: ["PLAYER", "DREW"], beliefPredicate: "playerWillProtect", reportedValue: true,
    worldEvaluationRule: "RULE_WORLD_PROTECTION_CONDITIONAL", renderFragments: { ASK: "Trust that I will protect you from the fallout", DEAL: "I will protect you from the fallout", PRESSURE: null },
    boundaryNotes: ["The claim remains reported and conditional; it is not objectively guaranteed."],
  },
  {
    id: "MARA_WILL_REPAY_DREW", version: "0.2-provisional", label: "Mara will repay Drew", kind: "CLAIM",
    subjectIds: ["MARA", "DREW"], allowedRecipients: ["DREW"], allowedDpa: ["ASK", "DEAL"],
    compatibleFunctions: ["DISCHARGE_OBLIGATION", "PRESERVE_RELATIONSHIP"], referencedEntities: ["MARA", "DREW"], beliefPredicate: "futureReciprocity", reportedValue: true,
    worldEvaluationRule: "RULE_WORLD_RECIPROCITY_CONDITIONAL", renderFragments: { ASK: "Consider that Mara will repay the favor", DEAL: "Mara will repay the favor", PRESSURE: null },
    boundaryNotes: ["Future reciprocity is proposed value, not an existing debt."],
  },
  {
    id: "REFUSAL_WILL_BE_REPORTED", version: "0.2-provisional", label: "Refusal will be reported", kind: "WARNING",
    subjectIds: ["DREW", "PLAYER"], allowedRecipients: ["DREW"], allowedDpa: ["PRESSURE"],
    compatibleFunctions: ["MAINTAIN_CONTROL", "REDUCE_RISK"], referencedEntities: ["DREW", "PLAYER"], beliefPredicate: "refusalReported", reportedValue: true,
    worldEvaluationRule: "RULE_WORLD_REPORT_ENFORCEABILITY_UNKNOWN", renderFragments: { ASK: null, DEAL: null, PRESSURE: "Your refusal will be recorded" },
    boundaryNotes: ["The consequence must be evaluated for credibility and enforceability."],
  },
];

export function getProposition(id: string): PropositionDefinition {
  const result = propositions.find((entry) => entry.id === id);
  if (!result) throw new Error(`Unknown proposition ${id}`);
  return result;
}

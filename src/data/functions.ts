import type { BehaviorId, FunctionalDefinition, FunctionalElementId } from "../core/types";

const status: Record<FunctionalElementId, { operationalStatus: FunctionalDefinition["operationalStatus"]; operationalNote: string }> = {
  ACQUIRE_TARGET: { operationalStatus: "OPERATIONAL", operationalNote: "World/goal pressure; not player-selectable." },
  PROTECT_TARGET: { operationalStatus: "OPERATIONAL", operationalNote: "World/goal pressure; not player-selectable." },
  CREATE_OPPORTUNITY: { operationalStatus: "OPERATIONAL", operationalNote: "Accepted application creates a monitoring plan; observation later creates opportunity." },
  REDUCE_RISK: { operationalStatus: "PARTIAL", operationalNote: "Accepted application contributes risk-reduction pressure; no universal risk mutation is implied." },
  VERIFY_INFORMATION: { operationalStatus: "OPERATIONAL", operationalNote: "Accepted application supports explicit questioning and verification behavior." },
  REDUCE_UNCERTAINTY: { operationalStatus: "OPERATIONAL", operationalNote: "Accepted application changes uncertainty pressure and behavior competition." },
  MAINTAIN_CONTROL: { operationalStatus: "OPERATIONAL", operationalNote: "Accepted application contributes control pressure and can increase resistance under coercion." },
  PRESERVE_RELATIONSHIP: { operationalStatus: "PARTIAL", operationalNote: "Accepted application contributes relationship pressure; effects remain scenario-local." },
  DISCHARGE_OBLIGATION: { operationalStatus: "PARTIAL", operationalNote: "Only a relevant accepted commitment can activate transfer discharge behavior." },
  CONCEAL_STATE: { operationalStatus: "OPERATIONAL", operationalNote: "Behavior-facing Function; not player-selectable." },
  EXPOSE_DECEPTION: { operationalStatus: "OPERATIONAL", operationalNote: "Behavior-facing Function; not player-selectable." },
  EXIT_SITUATION: { operationalStatus: "OPERATIONAL", operationalNote: "Accepted relevant application contributes exit pressure; eligibility still requires world conditions." },
};

const define = (id: FunctionalElementId, label: string, meaning: string, boundary: string, behaviors: BehaviorId[], applications: FunctionalDefinition["messageApplications"], compatible: FunctionalElementId[] = [], conflicting: FunctionalElementId[] = []): FunctionalDefinition => ({
  id, version: "0.2-provisional", label, conciseDefinition: meaning, boundary,
  activationRuleIds: [`RULE_FUNCTION_${id}_ACTIVATE`], satisfactionRuleIds: [`RULE_FUNCTION_${id}_SATISFY`],
  compatibleFunctions: compatible, conflictingFunctions: conflicting, commonlyServedBy: behaviors,
  messageApplications: applications, ...status[id], provenance: "PROTOTYPE_PROVISIONAL",
});

export const functionalDefinitions: FunctionalDefinition[] = [
  define("ACQUIRE_TARGET", "Acquire target", "Increase access to or possession of the envelope.", "Does not prescribe theft or guarantee possession.", ["APPROACH_ENVELOPE", "TAKE_ENVELOPE", "ACCEPT_TRANSFER"], [], ["CREATE_OPPORTUNITY"], ["PROTECT_TARGET"]),
  define("PROTECT_TARGET", "Protect target", "Preserve controlled possession of the envelope.", "Situational responsibility, not identity.", ["GUARD_ENVELOPE", "WATCH_MARA", "MOVE_ENVELOPE", "LOCK_DOWN_ROOM"], [], ["VERIFY_INFORMATION", "MAINTAIN_CONTROL"], ["ACQUIRE_TARGET"]),
  define("CREATE_OPPORTUNITY", "Create opportunity", "Establish monitoring or conditions that can reveal a later opening.", "Never awards opportunity directly from a message.", ["MONITOR_DREW", "APPROACH_ENVELOPE"], [{ recipientId: "MARA", result: "Create MONITOR_FOR_OPENING plan when accepted.", ruleId: "RULE_APP_CREATE_OPPORTUNITY_MONITOR" }], ["ACQUIRE_TARGET", "REDUCE_RISK"], []),
  define("REDUCE_RISK", "Reduce risk", "Lower believed danger, exposure, or personal consequence.", "Encounter-scoped, not a general anxiety model.", ["WAIT", "MONITOR_DREW", "REFUSE", "MOVE_ENVELOPE", "ABANDON_OBJECTIVE"], [{ recipientId: "ANY", result: "Raise risk-reduction pressure if the message is accepted as relevant.", ruleId: "RULE_APP_REDUCE_RISK" }], ["VERIFY_INFORMATION", "PRESERVE_RELATIONSHIP"], []),
  define("VERIFY_INFORMATION", "Verify information", "Seek evidence that can confirm or challenge a relevant claim.", "Verification is not disbelief or curiosity as identity.", ["QUESTION_DREW", "QUESTION_MARA", "QUESTION_PLAYER", "VERIFY_CLAIM"], [{ recipientId: "ANY", result: "Raise verification pressure and create a question/claim focus.", ruleId: "RULE_APP_VERIFY_INFORMATION" }], ["REDUCE_UNCERTAINTY", "PROTECT_TARGET"], []),
  define("REDUCE_UNCERTAINTY", "Reduce uncertainty", "Narrow a material unknown before commitment.", "Only uncertainty relevant to this room is represented.", ["MONITOR_DREW", "QUESTION_MARA", "QUESTION_PLAYER", "VERIFY_CLAIM"], [{ recipientId: "ANY", result: "Raise uncertainty-reduction pressure for the proposition subject.", ruleId: "RULE_APP_REDUCE_UNCERTAINTY" }], ["VERIFY_INFORMATION"], []),
  define("MAINTAIN_CONTROL", "Maintain control", "Keep asset access and decisions inside tolerable bounds.", "Not a permanent control trait.", ["GUARD_ENVELOPE", "WATCH_MARA", "MOVE_ENVELOPE", "REFUSE", "LOCK_DOWN_ROOM"], [{ recipientId: "DREW", result: "Raise control pressure; may invert into resistance under coercion.", ruleId: "RULE_APP_MAINTAIN_CONTROL" }], ["PROTECT_TARGET"], ["DISCHARGE_OBLIGATION"]),
  define("PRESERVE_RELATIONSHIP", "Preserve relationship", "Avoid unnecessary damage to useful cooperation.", "Does not imply affection or generic agreeableness.", ["QUESTION_DREW", "QUESTION_MARA", "OFFER_TRANSFER", "FEIGN_COMPLIANCE"], [{ recipientId: "ANY", result: "Raise relationship-preservation pressure when delivery preserves choice.", ruleId: "RULE_APP_PRESERVE_RELATIONSHIP" }], ["REDUCE_RISK", "DISCHARGE_OBLIGATION"], ["EXPOSE_DECEPTION"]),
  define("DISCHARGE_OBLIGATION", "Discharge obligation", "Settle accepted terms or a recognized commitment.", "A sent or rejected Deal creates no obligation.", ["OFFER_TRANSFER", "COMPLETE_TRANSFER", "ACCEPT_TRANSFER"], [{ recipientId: "DREW", result: "Raise discharge pressure only from an accepted exchange/commitment.", ruleId: "RULE_APP_DISCHARGE_ACCEPTED_COMMITMENT" }], ["PRESERVE_RELATIONSHIP"], ["MAINTAIN_CONTROL"]),
  define("CONCEAL_STATE", "Conceal state", "Prevent another actor from accurately reading intention or possession.", "An enacted function, not a moral diagnosis.", ["CONCEAL_ENVELOPE", "FEIGN_COMPLIANCE"], [], [], ["EXPOSE_DECEPTION"]),
  define("EXPOSE_DECEPTION", "Expose deception", "Make suspected manipulation legible or costly.", "Suspicion is not proof.", ["QUESTION_PLAYER", "QUESTION_MARA", "CONFRONT_MARA"], [], ["VERIFY_INFORMATION"], ["CONCEAL_STATE", "PRESERVE_RELATIONSHIP"]),
  define("EXIT_SITUATION", "Exit situation", "End participation under current conditions.", "Can serve successful exit or abandonment.", ["LEAVE", "ABANDON_OBJECTIVE"], [{ recipientId: "MARA", result: "Raise exit pressure only when the proposition is accepted and exit is relevant.", ruleId: "RULE_APP_EXIT_SITUATION" }], ["REDUCE_RISK"], []),
];

export function getFunction(id: FunctionalElementId): FunctionalDefinition {
  const result = functionalDefinitions.find((entry) => entry.id === id);
  if (!result) throw new Error(`Unknown function ${id}`);
  return result;
}

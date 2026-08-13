import type { BehaviorDefinition, BehaviorId, CharacterId, FunctionalElementId, VibeCode } from "../core/types";

const behavior = (id: BehaviorId, actorId: CharacterId, label: string, description: string, baseScore: number, servesFunctions: FunctionalElementId[], executionVibe: VibeCode, effectRuleIds: string[], visibleAction: string, line: string): BehaviorDefinition => ({
  id, version: "0.2", actorId, label, description, baseScore, servesFunctions,
  allowedExecutionVibes: [executionVibe], defaultExecutionVibe: executionVibe, effectRuleIds,
  visibleAction, line, status: "ACTIVE",
});

export const maraBehaviors: BehaviorDefinition[] = [
  behavior("WAIT", "MARA", "Wait", "Hold position without abandoning the objective.", 0.24, ["REDUCE_RISK"], "SE", ["RULE_EFFECT_WAIT"], "holds at the chair and reads the room", "Not yet."),
  behavior("MONITOR_DREW", "MARA", "Monitor Drew", "Attend to Drew so a later attention change can be observed.", 0.2, ["CREATE_OPPORTUNITY", "REDUCE_UNCERTAINTY"], "ES", ["RULE_EFFECT_MONITOR_DREW"], "tracks Drew's gaze and posture", "I'm watching."),
  behavior("QUESTION_DREW", "MARA", "Question Drew", "Create a pending social request for clarification.", 0.04, ["VERIFY_INFORMATION", "PRESERVE_RELATIONSHIP"], "SE", ["RULE_EFFECT_QUESTION_DREW"], "asks Drew to account for his position", "What are you protecting yourself from?"),
  behavior("APPROACH_ENVELOPE", "MARA", "Approach envelope", "Move to the table, increasing access and visibility risk.", 0.02, ["ACQUIRE_TARGET", "CREATE_OPPORTUNITY"], "DS", ["RULE_EFFECT_APPROACH_ENVELOPE"], "moves from the chair toward the table", "Just a closer look."),
  behavior("ACCEPT_TRANSFER", "MARA", "Accept transfer", "Signal acceptance of an open transfer offer.", -0.06, ["ACQUIRE_TARGET", "DISCHARGE_OBLIGATION"], "ES", ["RULE_EFFECT_ACCEPT_TRANSFER"], "extends a hand to accept Drew's offer", "I'll take responsibility for receiving it."),
  behavior("TAKE_ENVELOPE", "MARA", "Take envelope", "Acquire the envelope when observation supports a real opening.", -0.08, ["ACQUIRE_TARGET", "CREATE_OPPORTUNITY"], "DS", ["RULE_EFFECT_TAKE_ENVELOPE"], "takes the envelope while Drew's attention remains elsewhere", ""),
  behavior("CONCEAL_ENVELOPE", "MARA", "Conceal envelope", "Hide current possession from ordinary observation.", 0, ["CONCEAL_STATE", "REDUCE_RISK"], "DS", ["RULE_EFFECT_CONCEAL_ENVELOPE"], "folds the envelope out of ordinary view", ""),
  behavior("LEAVE", "MARA", "Leave", "Exit with the envelope when possession and access allow it.", 0.18, ["EXIT_SITUATION", "REDUCE_RISK"], "AS", ["RULE_EFFECT_LEAVE"], "moves through the exit with the envelope", "I'm leaving now."),
  behavior("ABANDON_OBJECTIVE", "MARA", "Abandon objective", "Leave without the envelope when risk overwhelms the goal.", -0.2, ["EXIT_SITUATION", "REDUCE_RISK"], "AS", ["RULE_EFFECT_ABANDON"], "leaves the envelope and exits", "This has gone too far."),
];

export const drewBehaviors: BehaviorDefinition[] = [
  behavior("GUARD_ENVELOPE", "DREW", "Guard envelope", "Maintain direct control at the table.", 0.3, ["PROTECT_TARGET", "MAINTAIN_CONTROL"], "BE", ["RULE_EFFECT_GUARD"], "anchors himself beside the envelope", "It stays here."),
  behavior("WATCH_MARA", "DREW", "Watch Mara", "Direct primary attention to Mara and her visible behavior.", 0.16, ["PROTECT_TARGET", "VERIFY_INFORMATION"], "DS", ["RULE_EFFECT_WATCH_MARA"], "keeps Mara in his direct line of sight", "I see you."),
  behavior("QUESTION_MARA", "DREW", "Question Mara", "Create a pending question addressed to Mara.", 0.02, ["VERIFY_INFORMATION", "EXPOSE_DECEPTION"], "BE", ["RULE_EFFECT_QUESTION_MARA"], "questions Mara without yielding the table", "Who told you this was yours?"),
  behavior("QUESTION_PLAYER", "DREW", "Question player", "Create a pending question and shift attention to the player channel.", 0.02, ["VERIFY_INFORMATION", "REDUCE_UNCERTAINTY"], "EA", ["RULE_EFFECT_QUESTION_PLAYER"], "turns his attention toward the unseen operator", "Give me one reason to believe that."),
  behavior("VERIFY_CLAIM", "DREW", "Verify claim", "Hold attention on a reported claim and test it against belief.", 0, ["VERIFY_INFORMATION", "PROTECT_TARGET"], "EA", ["RULE_EFFECT_VERIFY_CLAIM"], "rechecks the claim against what he knows", "That needs verification."),
  behavior("MOVE_ENVELOPE", "DREW", "Move envelope", "Move the envelope from the table into Drew's possession.", -0.08, ["PROTECT_TARGET", "REDUCE_RISK"], "AS", ["RULE_EFFECT_MOVE_ENVELOPE"], "takes the envelope into his own control", "We're not leaving it exposed."),
  behavior("OFFER_TRANSFER", "DREW", "Offer transfer", "Create an open transfer offer without changing possession.", -0.14, ["DISCHARGE_OBLIGATION", "PRESERVE_RELATIONSHIP"], "ES", ["RULE_EFFECT_OFFER_TRANSFER"], "holds the envelope out to Mara without releasing it", "If you accept the terms, take it."),
  behavior("COMPLETE_TRANSFER", "DREW", "Complete transfer", "Attempt completion of an open offer; physical release occurs only after a compatible joint match.", -0.2, ["DISCHARGE_OBLIGATION", "PRESERVE_RELATIONSHIP"], "ES", ["RULE_EFFECT_COMPLETE_TRANSFER"], "holds the offered envelope pending Mara's matching acceptance", "Your acceptance completes it."),
  behavior("REFUSE", "DREW", "Refuse", "Record a boundary against the current request.", 0.02, ["PROTECT_TARGET", "MAINTAIN_CONTROL"], "BE", ["RULE_EFFECT_REFUSE"], "sets a clear boundary without moving", "No."),
  behavior("CONFRONT_MARA", "DREW", "Confront Mara", "Address suspected coordination directly and raise room pressure.", -0.12, ["PROTECT_TARGET", "EXPOSE_DECEPTION"], "AS", ["RULE_EFFECT_CONFRONT"], "steps into Mara's route and confronts her", "What did the player tell you?"),
  behavior("LOCK_DOWN_ROOM", "DREW", "Lock down room", "Block exit and secure the envelope under full alert.", -0.28, ["PROTECT_TARGET", "MAINTAIN_CONTROL", "EXPOSE_DECEPTION"], "AD", ["RULE_EFFECT_LOCK_DOWN"], "blocks the exit and locks down access", "Nobody leaves."),
  behavior("FEIGN_COMPLIANCE", "DREW", "Acknowledge without yielding", "Present cooperation while retaining resistance and surveillance.", -0.12, ["CONCEAL_STATE", "VERIFY_INFORMATION", "PROTECT_TARGET"], "DS", ["RULE_EFFECT_FEIGN_COMPLIANCE"], "appears to acknowledge the demand without releasing control", "All right… I hear you."),
];

export const allBehaviors = [...maraBehaviors, ...drewBehaviors];
export function getBehavior(id: BehaviorId): BehaviorDefinition {
  const result = allBehaviors.find((entry) => entry.id === id);
  if (!result) throw new Error(`Unknown behavior ${id}`);
  return result;
}

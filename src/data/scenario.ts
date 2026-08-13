import type { Belief, CharacterId, GoalState, ScenarioDefinition, WorldState } from "../core/types";

const belief = (id: string, subjectId: string, predicate: string, value: Belief["value"], confidence: number, status: Belief["status"] = "OBSERVED"): Belief => ({
  id, version: "0.2", subjectId, predicate, value, confidence,
  source: status === "OBSERVED" ? "OBSERVATION" : "INITIAL", acquiredBeat: 0,
  lastConfirmedBeat: status === "OBSERVED" ? 0 : undefined, status, sourceRefs: ["SCENARIO_INITIAL"],
});

const goal = (id: string, ownerId: CharacterId, description: string, priority: number, satisfactionRuleId: string, failureRuleId: string): GoalState => ({
  id, version: "0.2", ownerId, description, priority, activation: 1, status: "ACTIVE",
  satisfactionRuleId, failureRuleId, sourceRefs: ["SCENARIO_INITIAL"],
});

const initialWorld: Omit<WorldState, "history"> = {
  scenarioId: "one-room-v0.2", version: "0.2", beat: 1, maxBeats: 8, phase: "PLAYER_COMPOSING", terminalState: null,
  characters: {
    MARA: {
      id: "MARA", name: "Mara", role: "the waiting claimant", location: "CHAIR", hasEnvelope: false,
      metrics: { trustInPlayer: 0.64, suspicionOfOther: 0.34, alert: 0.18, nerve: 0.42, perceivedRisk: 0.62, perceivedOpportunity: 0.16, commitmentToDuty: 0.18 },
      beliefs: [
        belief("BELIEF_MARA_ENVELOPE_TABLE", "ENVELOPE", "location", "TABLE", 0.96),
        belief("BELIEF_MARA_DREW_ATTENTION", "DREW", "attention", "MARA", 0.82),
        belief("BELIEF_MARA_EXIT", "EXIT", "accessible", true, 0.92),
        belief("BELIEF_MARA_PLAYER_RELIABLE", "PLAYER", "reliable", true, 0.62, "ASSUMED"),
      ],
      inferences: [],
      goals: [
        goal("GOAL_MARA_ACQUIRE", "MARA", "Acquire the envelope.", 0.94, "RULE_GOAL_MARA_ACQUIRE_SATISFY", "RULE_GOAL_MARA_ACQUIRE_FAIL"),
        goal("GOAL_MARA_EXIT", "MARA", "Reach the exit with the envelope.", 0.9, "RULE_GOAL_MARA_EXIT_SATISFY", "RULE_GOAL_MARA_EXIT_FAIL"),
        goal("GOAL_MARA_AVOID_CONFRONTATION", "MARA", "Avoid a direct confrontation that closes the route.", 0.7, "RULE_GOAL_MARA_AVOID_SATISFY", "RULE_GOAL_MARA_AVOID_FAIL"),
      ],
      plans: [], attention: { primaryTarget: "DREW", secondaryTarget: "ENVELOPE", strength: 0.78, reasonRefs: ["SCENARIO_INITIAL"], lastChangedBeat: 0 },
      intent: { behaviorId: null, commitment: 0, announced: false, concealed: false, sourcePressureRefs: [] },
      lastBehavior: null, visibleAction: "waits, reading Drew's line of sight", visibleLine: "",
    },
    DREW: {
      id: "DREW", name: "Drew", role: "the reluctant custodian", location: "TABLE", hasEnvelope: false,
      metrics: { trustInPlayer: 0.58, suspicionOfOther: 0.46, alert: 0.3, nerve: 0.68, perceivedRisk: 0.46, perceivedOpportunity: 0.18, commitmentToDuty: 0.86 },
      beliefs: [
        belief("BELIEF_DREW_ENVELOPE_TABLE", "ENVELOPE", "location", "TABLE", 0.98),
        belief("BELIEF_DREW_MARA_UNAUTHORIZED", "MARA", "authorized", false, 0.72, "ASSUMED"),
        belief("BELIEF_DREW_PLAYER_RELIABLE", "PLAYER", "reliable", true, 0.56, "ASSUMED"),
        belief("BELIEF_DREW_EXIT", "EXIT", "accessible", true, 0.94),
      ],
      inferences: [],
      goals: [
        goal("GOAL_DREW_CONTROL", "DREW", "Keep the envelope controlled.", 0.92, "RULE_GOAL_DREW_CONTROL_SATISFY", "RULE_GOAL_DREW_CONTROL_FAIL"),
        goal("GOAL_DREW_AVOID_BLAME", "DREW", "Avoid responsibility for a preventable loss.", 0.78, "RULE_GOAL_DREW_BLAME_SATISFY", "RULE_GOAL_DREW_BLAME_FAIL"),
        goal("GOAL_DREW_RELATIONSHIP", "DREW", "Preserve a workable relationship with the player when possible.", 0.46, "RULE_GOAL_DREW_RELATIONSHIP_SATISFY", "RULE_GOAL_DREW_RELATIONSHIP_FAIL"),
      ],
      plans: [], attention: { primaryTarget: "MARA", secondaryTarget: "ENVELOPE", strength: 0.76, reasonRefs: ["SCENARIO_INITIAL"], lastChangedBeat: 0 },
      intent: { behaviorId: null, commitment: 0, announced: false, concealed: false, sourcePressureRefs: [] },
      lastBehavior: null, visibleAction: "guards the table while watching Mara", visibleLine: "",
    },
  },
  envelope: { id: "ENVELOPE", location: "TABLE", holder: null, visible: true }, exitAccessible: true,
  player: { exposure: 0.1, reliabilityBeliefSeed: 0.6 },
  social: { exchanges: [], commitments: [], transferOffers: [], pendingQuestions: [], refusals: [] },
  eventLog: ["Drew watches Mara from the table. Mara waits for a condition she can trust."],
};

export const scenario: ScenarioDefinition = {
  id: "one-room-v0.2", version: "0.2", maxBeats: 8,
  thresholds: { fullAlert: 0.92, fullExposure: 0.9, noticeCommunication: 0.6, takeOpportunity: 0.66, takeNerve: 0.46, abandonRisk: 0.9 },
  initialWorld,
};

export function createInitialWorld(): WorldState { return { ...structuredClone(scenario.initialWorld), history: [] }; }

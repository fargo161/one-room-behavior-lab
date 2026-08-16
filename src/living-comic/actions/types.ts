import type {
  ActionDraft,
  Belief,
  Character,
  Deal,
  DealTerm,
  Goal,
  NpcDecisionTrace,
  Obligation,
  Obstacle,
  Reason,
  RealizedMessage,
  RuntimeSnapshot,
  ScenePressure,
  SemanticMessage,
} from "../schemas";

export interface ActionPackage {
  action: ActionDraft;
  message?: SemanticMessage;
  realizedMessage?: RealizedMessage;
  proposedDeal?: Deal;
  dealTerms?: DealTerm[];
}

export interface ActionBuildContext {
  sceneId: string;
  beat: number;
  baselineVibeByActorId: Record<string, string>;
}

export interface FunctionRoutingDecision {
  intention: ActionDraft["intention"];
  compatibleFunctionIds: ActionDraft["functionIds"];
  candidateOperationIds: string[];
  status: "RESOLVED" | "UNSUPPORTED";
  unsupportedPredicates: string[];
  ruleId: "route_intention_by_predicate_semantics";
}

/**
 * Deliberately excludes worldFacts, other actors' private Goals/Reasons, the
 * player draft, and same-Beat action choices. NPC selection can only accept
 * this pre-Beat epistemic projection.
 */
export interface ActorDecisionView {
  actionBuildContext: ActionBuildContext;
  decisionSnapshotId: string;
  beat: number;
  actor: Character;
  actorIds: string[];
  primaryGoal: Goal;
  secondaryGoals: Goal[];
  reason: Reason | null;
  obstacle: Obstacle | null;
  beliefs: Belief[];
  obligations: Obligation[];
  relevantDeals: Deal[];
  dealTerms: DealTerm[];
  scenePressure: ScenePressure;
  primaryObjectId: string;
  roomId: string;
  exitZoneId: string;
}

export interface SelectedNpcAction {
  package: ActionPackage;
  trace: NpcDecisionTrace;
}

export interface LivingComicEngineState {
  snapshot: RuntimeSnapshot;
  reports: import("../schemas").BeatResolutionReport[];
}

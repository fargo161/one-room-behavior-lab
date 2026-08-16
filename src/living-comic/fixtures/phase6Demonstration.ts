import {
  actionBuildContext,
  makeAskPackage,
  makeDealPackage,
  makeDirectPackage,
  makePressurePackage,
  makeWaitPackage,
  type LivingComicEngineState,
} from "../actions";
import { loadDefaultContent } from "../content";
import { resolveBeat, startScene } from "../engine";
import { generateScene } from "../generation";
import type { BeatResolutionReport, Proposition } from "../schemas";

export interface CausalChainReview {
  goalId: string;
  goalTarget: Proposition;
  intention: Proposition[];
  functionIds: string[];
  actionId: string;
  eventIds: string[];
  perceptionIds: string[];
  interpretationIds: string[];
  beliefUpdateIds: string[];
}

export interface Phase6Demonstration {
  seed: number;
  state: LivingComicEngineState;
  playerActionKinds: string[];
  dealLifecycle: string[];
  causalChain: CausalChainReview;
}

const actionKind = (report: BeatResolutionReport): string => {
  const action = report.committedActions.find(({ action: candidate }) => candidate.actorId === "actor_player")!.action;
  if (action.family === "SOCIAL") return action.tactic;
  if (action.family === "DIRECT") return action.operationId;
  if (action.family === "DEAL_RESPONSE") return action.response;
  return "WAIT";
};

const causalChainFor = (state: LivingComicEngineState, report: BeatResolutionReport, actorId: string): CausalChainReview => {
  const action = report.committedActions.find(({ action: candidate }) => candidate.actorId === actorId)!.action;
  const character = state.snapshot.characters.find(({ id }) => id === actorId)!;
  const goal = state.snapshot.goals.find(({ id }) => id === character.primaryGoalId)!;
  const eventIds = report.observableEvents.filter(({ sourceActionId }) => sourceActionId === action.id).map(({ id }) => id);
  const perceptionIds = report.perceptions.filter(({ eventId }) => eventIds.includes(eventId)).map(({ id }) => id);
  const interpretationIds = report.interpretations.filter(({ perceptionIds: refs }) => refs.some((id) => perceptionIds.includes(id))).map(({ id }) => id);
  const beliefUpdateIds = report.beliefUpdates.filter(({ sourceInterpretationId, sourcePerceptionIds }) => (
    (sourceInterpretationId !== null && interpretationIds.includes(sourceInterpretationId))
    || sourcePerceptionIds.some((id) => perceptionIds.includes(id))
  )).map(({ id }) => id);
  return {
    goalId: goal.id,
    goalTarget: goal.target,
    intention: action.intention,
    functionIds: action.functionIds,
    actionId: action.id,
    eventIds,
    perceptionIds,
    interpretationIds,
    beliefUpdateIds,
  };
};

export function runPhase6Demonstration(): Phase6Demonstration {
  const seed = 14;
  const content = loadDefaultContent();
  const generated = generateScene(seed, content);
  let state = startScene(generated, generated.playerOptions[0]!.id);
  state.snapshot.scenePressure.beatsRemaining = 9;

  const attentionRequest: Proposition = { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" };
  state = resolveBeat(
    state,
    makeAskPackage(actionBuildContext(state.snapshot), content, "actor_player", "actor_counterpart", attentionRequest, { delivery: "PRIVATE" }),
    content,
  );

  const counterpart = state.snapshot.characters.find(({ id }) => id === "actor_counterpart")!;
  const counterpartGoal = state.snapshot.goals.find(({ id }) => id === counterpart.primaryGoalId)!;
  const requested: Proposition = { subjectId: "primary_object", predicate: "AVAILABLE_TO", objectId: "actor_player" };
  state = resolveBeat(
    state,
    makeDealPackage(actionBuildContext(state.snapshot), content, "actor_player", counterpart.id, requested, counterpartGoal.target, { delivery: "OPEN" }),
    content,
  );

  state = resolveBeat(state, makeWaitPackage(actionBuildContext(state.snapshot), "actor_player"), content);

  const pressureRequest: Proposition = { subjectId: "primary_object", predicate: "VISIBLE", value: true };
  const threat: Proposition = { subjectId: "actor_third_party", predicate: "EXPOSED", value: true };
  state = resolveBeat(
    state,
    makePressurePackage(actionBuildContext(state.snapshot), content, "actor_player", "actor_third_party", pressureRequest, threat),
    content,
  );

  const player = state.snapshot.characters.find(({ id }) => id === "actor_player")!;
  const approachIntention: Proposition = { subjectId: player.id, predicate: "LOCATED_AT", objectId: state.snapshot.objects[0]!.zoneId };
  state = resolveBeat(
    state,
    makeDirectPackage(
      actionBuildContext(state.snapshot),
      content,
      player.id,
      "action_approach",
      "primary_object",
      [approachIntention],
    ),
    content,
  );

  const firstReport = state.reports[0]!;
  return {
    seed,
    state,
    playerActionKinds: state.reports.map(actionKind),
    dealLifecycle: state.reports.flatMap((report) => report.dealLifecycleChanges.map(({ nextStatus }) => nextStatus)),
    causalChain: causalChainFor(state, firstReport, "actor_counterpart"),
  };
}

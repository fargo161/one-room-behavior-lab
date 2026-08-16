import { stableRuntimeId } from "../core/ids";
import { worldHas } from "../core/worldFacts";
import { actionBuildContext } from "../actions/factories";
import { evaluateAcceptedDeals } from "../actions/deals";
import { buildActorDecisionView, selectNpcAction } from "../actions/npcSelection";
import type { ActionPackage, LivingComicEngineState } from "../actions/types";
import { buildPerceptions, interpretNpcPerceptions, updateBeliefs } from "../cognition";
import {
  beatResolutionReportSchema,
  type ActionResolution,
  type BeatResolutionReport,
  type CommittedAction,
  type ContentManifest,
  type DealLifecycleChange,
  type HistoricalEvent,
  type ObservableEvent,
  type Proposition,
  type RuntimeSnapshot,
} from "../schemas";
import { actionPriority, resolveActionPackage } from "./resolution";
import { advanceScenePressure } from "./scenePressure";
import { realizeActionPackage } from "../realization";

export function startScene(
  generated: { snapshot: RuntimeSnapshot; playerOptions: Array<{ id: string; goal: RuntimeSnapshot["goals"][number]; reason: RuntimeSnapshot["reasons"][number] }> },
  playerOptionId: string,
): LivingComicEngineState {
  const snapshot = structuredClone(generated.snapshot);
  const option = generated.playerOptions.find(({ id }) => id === playerOptionId);
  if (!option) throw new Error(`Unknown player Goal/Reason option: ${playerOptionId}`);
  const player = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!;
  player.primaryGoalId = option.goal.id;
  player.reasonId = option.reason.id;
  snapshot.goals.forEach((goal) => {
    if (goal.actorId === player.id) goal.primary = goal.id === option.goal.id;
  });
  snapshot.phase = "PLAYER_DRAFT";
  snapshot.stateId = stableRuntimeId("state", snapshot.sceneId, "beat", snapshot.beat, "ready");
  return { snapshot, reports: [] };
}

const resolveSkeletonTerminal = (snapshot: RuntimeSnapshot, content: ContentManifest): Proposition[] => {
  const skeleton = content.conflictSkeletons.find(({ id }) => id === snapshot.skeletonDefinitionId);
  if (!skeleton) return [];
  const refs: Record<string, string> = {
    SELF: snapshot.stableActorOrder[0]!,
    COUNTERPART: snapshot.stableActorOrder[1]!,
    THIRD_PARTY: snapshot.stableActorOrder[2]!,
    PRIMARY_OBJECT: snapshot.objects[0]!.id,
    ROOM: snapshot.room.id,
    EXIT_ZONE: snapshot.room.zoneIds.find((id) => id.includes("exit")) ?? snapshot.room.zoneIds.at(-1)!,
  };
  return skeleton.terminalPredicateTemplates.map((template) => template.objectRef
    ? { subjectId: refs[template.subjectRef]!, predicate: template.predicate, objectId: refs[template.objectRef]! }
    : { subjectId: refs[template.subjectRef]!, predicate: template.predicate, value: template.value! });
};

const centralConflictIsImpossible = (snapshot: RuntimeSnapshot): boolean => {
  const activeActors = snapshot.characters.filter(({ active }) => active);
  const primaryObject = snapshot.objects[0];
  return activeActors.length < 2
    || !primaryObject
    || !snapshot.room.zoneIds.includes(primaryObject.zoneId);
};

const promoteHistory = (snapshot: RuntimeSnapshot, events: ObservableEvent[], goalPredicates: Set<string>): string[] => {
  const meaningful = events.filter((event) => event.salient || event.resultPropositions.some(({ predicate }) => (
    goalPredicates.has(predicate)
    || ["HELD_BY", "OWNED_BY", "VISIBLE", "OPEN", "DEAL_STATUS", "ATTEMPT_FAILED"].includes(predicate)
  )));
  const promoted: string[] = [];
  for (const event of meaningful) {
    const result = event.resultPropositions[0];
    if (!result) continue;
    const id = stableRuntimeId("history_event", snapshot.sceneId, "beat", snapshot.beat + 1, event.id);
    if (snapshot.history.some((historyEvent) => historyEvent.id === id)) continue;
    const historyEvent: HistoricalEvent = {
      id,
      actionId: stableRuntimeId("runtime", event.observableCueIds[0] ?? "event"),
      actorId: event.actorId,
      targetId: event.targetEntityIds[0] ?? null,
      locationId: snapshot.room.id,
      result,
      secondaryParticipantIds: snapshot.characters.map(({ id: actorId }) => actorId).filter((actorId) => actorId !== event.actorId),
    };
    snapshot.history.push(historyEvent);
    promoted.push(id);
  }
  return promoted;
};

export function resolveBeat(
  state: LivingComicEngineState,
  playerPackage: ActionPackage,
  content: ContentManifest,
): LivingComicEngineState {
  if (state.snapshot.phase !== "PLAYER_DRAFT") throw new Error("A Beat can resolve only from PLAYER_DRAFT phase");
  const preBeat = structuredClone(state.snapshot);
  const player = preBeat.characters.find(({ role }) => role === "PLAYER_ROLE")!;
  if (playerPackage.action.actorId !== player.id) throw new Error("Player draft actor does not match the player role");

  // Both NPC decisions are computed from the exact same immutable pre-Beat
  // epistemic projection before any action is committed or resolved.
  const npcSelections = preBeat.characters
    .filter(({ role, active }) => role !== "PLAYER_ROLE" && active)
    .map(({ id }) => selectNpcAction(buildActorDecisionView(preBeat, id), content));
  if (npcSelections.length !== 2) throw new Error("Living Comic v0.1 requires two active NPC choices per Beat");

  const packages = [playerPackage, ...npcSelections.map((selection) => selection.package)]
    .map((actionPackage, index) => actionPackage.realizedMessage
      ? actionPackage
      : realizeActionPackage(actionPackage, content, preBeat.seed, index));
  const packageByActionId = new Map(packages.map((actionPackage) => [actionPackage.action.id, actionPackage]));
  const committedActions: CommittedAction[] = packages.map(({ action }) => ({
    action: structuredClone(action),
    committedAtBeat: preBeat.beat + 1,
    priority: actionPriority(action),
    stableActorOrder: preBeat.stableActorOrder.indexOf(action.actorId),
    commitSnapshotId: preBeat.stateId,
  }));
  committedActions.sort((left, right) => (
    left.priority - right.priority
    || left.stableActorOrder - right.stableActorOrder
    || left.action.id.localeCompare(right.action.id)
  ));

  const current = structuredClone(preBeat);
  const events: ObservableEvent[] = [];
  const stateChanges: Proposition[] = [];
  const actionResolutions: ActionResolution[] = [];
  const dealLifecycleChanges: DealLifecycleChange[] = [];
  committedActions.forEach((committed, index) => {
    const actionPackage = packageByActionId.get(committed.action.id)!;
    const result = resolveActionPackage(preBeat, current, actionPackage, index + 1);
    actionResolutions.push(result.resolution);
    events.push(result.event);
    stateChanges.push(...result.stateChanges);
    dealLifecycleChanges.push(...result.dealChanges);
  });

  const pressure = advanceScenePressure(current, content, events.length + 1);
  if (pressure.event) events.push(pressure.event);
  stateChanges.push(...pressure.stateChanges);
  dealLifecycleChanges.push(...evaluateAcceptedDeals(current, actionResolutions, committedActions.map(({ action }) => action)));

  const goalSatisfiedIds = current.goals.filter(({ target }) => worldHas(current, target)).map(({ id }) => id);
  const perceptionResult = buildPerceptions(current, events);
  current.attentionStates = perceptionResult.attentionAfter;
  const interpretations = interpretNpcPerceptions(current, perceptionResult.perceptions, events, content);
  const beliefUpdates = updateBeliefs(current, perceptionResult.perceptions, interpretations);
  const historyPromotionIds = promoteHistory(current, events, new Set(current.goals.map(({ target }) => target.predicate)));

  const nextBeat = preBeat.beat + 1;
  const skeletonTerminal = resolveSkeletonTerminal(current, content).some((proposition) => worldHas(current, proposition));
  const terminalReason = skeletonTerminal
    ? "skeleton_terminal_predicate"
    : !current.scenePressure.active && current.scenePressure.beatsRemaining === 0
      ? "scene_pressure_terminal"
      : centralConflictIsImpossible(current)
        ? "central_conflict_impossible"
        : nextBeat >= 10
          ? "beat_ten_safety_cap"
          : null;
  current.beat = nextBeat;
  current.terminalReason = terminalReason;
  current.phase = terminalReason ? "TERMINAL" : "PLAYER_DRAFT";
  current.stateId = stableRuntimeId("state", current.sceneId, "beat", current.beat, terminalReason ? "terminal" : "ready");

  const report: BeatResolutionReport = beatResolutionReportSchema.parse({
    beat: nextBeat,
    preBeatSnapshotId: preBeat.stateId,
    postBeatSnapshotId: current.stateId,
    committedActions,
    npcDecisions: npcSelections.map(({ trace }) => trace),
    resolutionOrder: committedActions.map(({ action }) => action.id),
    actionResolutions,
    stateChanges,
    observableEvents: events,
    perceptions: perceptionResult.perceptions,
    interpretations,
    beliefUpdates,
    attentionAfter: current.attentionStates,
    dealLifecycleChanges,
    goalSatisfiedIds,
    scenePressureEventIds: pressure.event ? [pressure.event.id] : [],
    realizedMessageIds: packages.flatMap(({ realizedMessage }) => realizedMessage ? [realizedMessage.id] : []),
    historyPromotionIds,
    terminalReason,
  });
  return { snapshot: current, reports: [...state.reports, report] };
}

export const playerActionContext = (state: LivingComicEngineState) => actionBuildContext(state.snapshot);

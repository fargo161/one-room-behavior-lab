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
import { createReplaySpec, replayFromSpec, resolveBeat, startScene } from "../engine";
import { generateScene } from "../generation";
import type {
  BeatResolutionReport,
  ContentManifest,
  GeneratedScene,
  Proposition,
} from "../schemas";

export const PHASE9_ACCEPTANCE_SEED = 2;
export const PHASE9_ACCEPTANCE_PLAYER_OPTION_ID = "player_option_1";

export const phase9ManualScript = [
  "Ask the Third Party to pay attention to you. Set content delivery to Private, then End Beat & Observe.",
  "Ask the Counterpart to pay attention to you. Set content delivery to Open, then End Beat & Observe.",
  "Deal with the Counterpart: THEY DO = Stay at the room center; I DO = Give them my attention. End the Beat.",
  "Wait. The Counterpart should reject the conflicting Deal.",
  "Deal with the Counterpart: THEY DO = Pay attention to me; I DO = Help them reach the exit. End the Beat.",
  "Wait. The Counterpart should accept, creating obligations.",
  "Act directly and approach the primary object at the table.",
  "Pressure the Counterpart to pay attention to you, with exposure as the threatened consequence.",
  "Act directly and move to the exit. This should satisfy the EXIT skeleton terminal predicate.",
] as const;

export interface Phase9AcceptanceSetup {
  generated: GeneratedScene;
  state: LivingComicEngineState;
  playerOptionId: string;
}

export interface Phase9AcceptanceSummary {
  seed: number;
  beatCount: number;
  terminalReason: string | null;
  playerActionKinds: string[];
  dealStatuses: string[];
  obligationStatuses: string[];
  historyActionIds: string[];
  privateOccurrenceWithoutContent: boolean;
  privateRecipientReceivedContent: boolean;
  attentionWasDiverted: boolean;
  falseBeliefWasWeakened: boolean;
  falseBeliefWasRevised: boolean;
  finalCorrectedBelief: Proposition | null;
  differentInterpretationEventCount: number;
  replayEquivalent: boolean;
}

export interface Phase9AcceptanceRun extends Phase9AcceptanceSetup {
  reports: BeatResolutionReport[];
  summary: Phase9AcceptanceSummary;
}

const actionKind = (report: BeatResolutionReport): string => {
  const action = report.committedActions.find(({ action: candidate }) => candidate.actorId === "actor_player")!.action;
  if (action.family === "SOCIAL") return action.tactic;
  if (action.family === "DIRECT") return action.operationId;
  if (action.family === "DEAL_RESPONSE") return action.response;
  return "WAIT";
};

const sameEventDifferentInterpretations = (report: BeatResolutionReport): number => {
  const byEvent = new Map<string, Set<string>>();
  for (const interpretation of report.interpretations) {
    const perception = report.perceptions.find(({ id }) => interpretation.perceptionIds.includes(id));
    if (!perception) continue;
    const signature = JSON.stringify([
      interpretation.inferredGoal,
      interpretation.inferredFunctionIds,
      interpretation.inferredReasonId,
    ]);
    const signatures = byEvent.get(perception.eventId) ?? new Set<string>();
    signatures.add(signature);
    byEvent.set(perception.eventId, signatures);
  }
  return [...byEvent.values()].filter((signatures) => signatures.size > 1).length;
};

export function createPhase9AcceptanceSetup(content: ContentManifest = loadDefaultContent()): Phase9AcceptanceSetup {
  const generated = generateScene(PHASE9_ACCEPTANCE_SEED, content);
  const option = generated.playerOptions.find(({ id }) => id === PHASE9_ACCEPTANCE_PLAYER_OPTION_ID) ?? generated.playerOptions[0]!;
  const state = startScene(generated, option.id);

  // The acceptance fixture needs enough runway to exercise the complete
  // interaction chain. This remains below the hard 10-Beat safety cap and
  // does not change the Scene Pressure definition or terminal semantics.
  state.snapshot.scenePressure.beatsRemaining = 10;

  // Preserve the generator's Goal/Reason-relevant asymmetry and add a single
  // controlled false factual belief whose correction can be observed through
  // ordinary Direct movement. No Goal, Reason, Obstacle, or world truth is
  // rewritten for the fixture.
  state.snapshot.beliefs = state.snapshot.beliefs.filter((belief) => !(
    belief.actorId === "actor_third_party"
    && belief.proposition.subjectId === "actor_player"
    && belief.proposition.predicate === "LOCATED_AT"
  ));
  state.snapshot.beliefs.push({
    id: "belief_acceptance_false_player_location",
    actorId: "actor_third_party",
    proposition: { subjectId: "actor_player", predicate: "LOCATED_AT", objectId: "zone_center" },
    certainty: "CERTAIN",
    sourceEventIds: [state.snapshot.history[0]!.id],
  });

  // Replay authority begins from the exact fixture starting state, including
  // the controlled acceptance-only belief and pressure duration.
  state.replay.initialSnapshot = structuredClone(state.snapshot);
  return { generated, state, playerOptionId: option.id };
}

export function runPhase9Acceptance(content: ContentManifest = loadDefaultContent()): Phase9AcceptanceRun {
  const setup = createPhase9AcceptanceSetup(content);
  let state = setup.state;
  const context = () => actionBuildContext(state.snapshot);

  state = resolveBeat(state, makeAskPackage(
    context(), content, "actor_player", "actor_third_party",
    { subjectId: "actor_third_party", predicate: "ATTENDING_TO", objectId: "actor_player" },
    { delivery: "PRIVATE", basedVibeId: "vibe_sd" },
  ), content);

  state = resolveBeat(state, makeAskPackage(
    context(), content, "actor_player", "actor_counterpart",
    { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" },
    { delivery: "OPEN", basedVibeId: "vibe_se" },
  ), content);

  state = resolveBeat(state, makeDealPackage(
    context(), content, "actor_player", "actor_counterpart",
    { subjectId: "actor_counterpart", predicate: "LOCATED_AT", objectId: "zone_center" },
    { subjectId: "actor_player", predicate: "ATTENDING_TO", objectId: "actor_counterpart" },
    { delivery: "OPEN", basedVibeId: "vibe_eb" },
  ), content);

  state = resolveBeat(state, makeWaitPackage(context(), "actor_player"), content);

  const counterpart = state.snapshot.characters.find(({ id }) => id === "actor_counterpart")!;
  const counterpartGoal = state.snapshot.goals.find(({ id }) => id === counterpart.primaryGoalId)!;
  state = resolveBeat(state, makeDealPackage(
    context(), content, "actor_player", "actor_counterpart",
    { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" },
    counterpartGoal.target,
    { delivery: "OPEN", basedVibeId: "vibe_sd" },
  ), content);

  state = resolveBeat(state, makeWaitPackage(context(), "actor_player"), content);

  state = resolveBeat(state, makeDirectPackage(
    context(), content, "actor_player", "action_approach", "primary_object",
    [{ subjectId: "actor_player", predicate: "LOCATED_AT", objectId: "zone_table" }],
  ), content);

  state = resolveBeat(state, makePressurePackage(
    context(), content, "actor_player", "actor_counterpart",
    { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" },
    { subjectId: "actor_counterpart", predicate: "EXPOSED", value: true },
    { delivery: "OPEN", basedVibeId: "vibe_ab" },
  ), content);

  state = resolveBeat(state, makeDirectPackage(
    context(), content, "actor_player", "action_withdraw", "zone_exit",
    [{ subjectId: "actor_player", predicate: "LOCATED_AT", objectId: "zone_exit" }],
    { destinationZoneId: "zone_exit" },
  ), content);

  const firstReport = state.reports[0]!;
  const firstPlayerEvent = firstReport.observableEvents.find(({ actorId }) => actorId === "actor_player")!;
  const counterpartOccurrence = firstReport.perceptions.find(({ observerId, eventId }) => (
    observerId === "actor_counterpart" && eventId === firstPlayerEvent.id
  ));
  const thirdPartyContent = firstReport.perceptions.find(({ observerId, eventId }) => (
    observerId === "actor_third_party" && eventId === firstPlayerEvent.id
  ));
  const locationUpdates = state.reports.flatMap((report) => report.beliefUpdates).filter(({ actorId, nextBelief }) => (
    actorId === "actor_third_party"
    && nextBelief.proposition.subjectId === "actor_player"
    && nextBelief.proposition.predicate === "LOCATED_AT"
  ));
  const finalLocationBelief = state.snapshot.beliefs.find(({ actorId, proposition }) => (
    actorId === "actor_third_party"
    && proposition.subjectId === "actor_player"
    && proposition.predicate === "LOCATED_AT"
  ));
  const replayed = replayFromSpec(createReplaySpec(state), content);

  const summary: Phase9AcceptanceSummary = {
    seed: PHASE9_ACCEPTANCE_SEED,
    beatCount: state.reports.length,
    terminalReason: state.snapshot.terminalReason,
    playerActionKinds: state.reports.map(actionKind),
    dealStatuses: state.snapshot.deals.map(({ status }) => status),
    obligationStatuses: state.snapshot.obligations.map(({ status }) => status),
    historyActionIds: state.snapshot.history.map(({ actionId }) => actionId),
    privateOccurrenceWithoutContent: Boolean(
      counterpartOccurrence
      && !counterpartOccurrence.channelsReceived.includes("COMMUNICATION_CONTENT")
      && counterpartOccurrence.registeredPropositions.some(({ predicate }) => predicate === "COMMUNICATED_WITH")
    ),
    privateRecipientReceivedContent: Boolean(thirdPartyContent?.channelsReceived.includes("COMMUNICATION_CONTENT")),
    attentionWasDiverted: firstReport.attentionAfter.some(({ actorId, primaryFocusId }) => (
      actorId === "actor_third_party" && primaryFocusId === "actor_player"
    )),
    falseBeliefWasWeakened: locationUpdates.some(({ updateKind }) => updateKind === "WEAKENED"),
    falseBeliefWasRevised: locationUpdates.some(({ updateKind }) => updateKind === "REVISED"),
    finalCorrectedBelief: finalLocationBelief?.proposition ?? null,
    differentInterpretationEventCount: state.reports.reduce((total, report) => total + sameEventDifferentInterpretations(report), 0),
    replayEquivalent: JSON.stringify(replayed) === JSON.stringify(state),
  };

  return { ...setup, state, reports: state.reports, summary };
}

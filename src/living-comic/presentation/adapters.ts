import { propositionIdentity } from "../core/propositions";
import { stableRuntimeId } from "../core/ids";
import { presentationViewModelSchema, type ContentManifest, type GeneratedScene, type PresentationViewModel } from "../schemas";
import type { LivingComicEngineState } from "../actions";

export interface DebugPresentationModel {
  mode: "DEBUG";
  seed: number;
  generationTrace: GeneratedScene["generationTrace"];
  validationTrace: GeneratedScene["validationTrace"];
  snapshot: LivingComicEngineState["snapshot"];
  reports: LivingComicEngineState["reports"];
}

const uniqueBy = <T>(values: T[], key: (value: T) => string): T[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const entityLabeler = (state: LivingComicEngineState, content: ContentManifest) => {
  const labels = new Map<string, string>();
  state.snapshot.characters.forEach((character) => labels.set(character.id, content.characters.find(({ id }) => id === character.definitionId)?.displayName ?? character.id));
  state.snapshot.objects.forEach((object) => labels.set(object.id, content.objects.find(({ id }) => id === object.definitionId)?.label ?? object.id));
  state.snapshot.room.zoneIds.forEach((id) => labels.set(id, id.replace(/^zone_/, "").replaceAll("_", " ")));
  labels.set(state.snapshot.room.id, content.roomPresets.find(({ id }) => id === state.snapshot.room.presetId)?.label ?? "the room");
  return (id: string): string => labels.get(id) ?? id.replaceAll("_", " ");
};

const propositionLabel = (proposition: Parameters<typeof propositionIdentity>[0], label: (id: string) => string): string => {
  const relation = proposition.predicate.toLowerCase().replaceAll("_", " ");
  const value = proposition.objectId ? label(proposition.objectId) : String(proposition.value);
  return `${label(proposition.subjectId)} ${relation} ${value}`;
};

const perceivedEventLabel = (
  perception: LivingComicEngineState["reports"][number]["perceptions"][number],
  event: LivingComicEngineState["reports"][number]["observableEvents"][number],
  label: (id: string) => string,
): string => perception.registeredPropositions.map((proposition) => {
  if (proposition.predicate === "ATTEMPT_FAILED") return `${label(event.actorId)} tried to act, but could not complete it`;
  if (proposition.predicate === "COMMUNICATED_WITH" && proposition.objectId) return `${label(proposition.subjectId)} spoke with ${label(proposition.objectId)}`;
  if (proposition.predicate === "EXPOSED" && proposition.value === true) return `${label(proposition.subjectId)} was left exposed`;
  if (proposition.predicate.endsWith("_NEARS") && typeof proposition.value === "number") return `${label(proposition.subjectId)} will change in ${proposition.value} Beats`;
  return propositionLabel(proposition, label);
}).join(". ");

export function buildPlayerSafeView(
  state: LivingComicEngineState,
  content: ContentManifest,
): PresentationViewModel {
  const snapshot = state.snapshot;
  const player = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!;
  const goal = snapshot.goals.find(({ id }) => id === player.primaryGoalId)!;
  const reason = snapshot.reasons.find(({ id }) => id === player.reasonId)!;
  const label = entityLabeler(state, content);
  const latest = state.reports.at(-1);
  const playerPerceptions = state.reports.flatMap((report) => report.perceptions.filter(({ observerId }) => observerId === player.id));
  const latestPerceptions = latest?.perceptions.filter(({ observerId }) => observerId === player.id) ?? [];
  const perceptualKnowledge = uniqueBy(playerPerceptions.flatMap((perception) => perception.registeredPropositions.map((proposition) => ({ perception, proposition }))), ({ proposition }) => propositionIdentity(proposition));
  const beliefKnowledge = snapshot.beliefs.filter(({ actorId }) => actorId === player.id);
  const relationshipKnowledge = snapshot.relationships.filter(({ actorIds }) => actorIds.includes(player.id));
  const relationshipHistoryIds = new Set(relationshipKnowledge.flatMap(({ sharedHistoryEventIds }) => sharedHistoryEventIds));
  const knownHistory = snapshot.history.filter(({ id }) => relationshipHistoryIds.has(id));
  const playerObligations = snapshot.obligations.filter(({ actorId }) => actorId === player.id);

  const resultPanels = latestPerceptions.map((perception) => {
    const event = latest!.observableEvents.find(({ id }) => id === perception.eventId)!;
    const realized = event.messageId && perception.channelsReceived.includes("COMMUNICATION_CONTENT")
      ? snapshot.realizedMessages.find(({ messageId }) => messageId === event.messageId)
      : undefined;
    const presentation = realized ? {
      wording: realized.wording,
      deliveryLabel: realized.deliveryLabel,
      poseLabel: content.presentation.poses.find(({ id }) => id === realized.poseId)?.label ?? realized.poseId,
      faceLabel: content.presentation.faces.find(({ id }) => id === realized.faceId)?.label ?? realized.faceId,
      balloonLabel: content.presentation.balloons.find(({ id }) => id === realized.balloonId)?.label ?? realized.balloonId,
    } : null;
    const body = perception.registeredPropositions.length > 0
      ? perceivedEventLabel(perception, event, label)
      : `${label(event.actorId)} did something you could not make out.`;
    return { id: `panel_${perception.id}`, eventId: event.id, actorLabel: label(event.actorId), body, message: presentation };
  });

  const openDeals = snapshot.deals.filter((deal) => (
    [deal.proposerId, deal.recipientId].includes(player.id)
    && ["PROPOSED", "ACCEPTED"].includes(deal.status)
  )).map((deal) => {
    const terms = snapshot.dealTerms.filter(({ id }) => [...deal.requestedTermIds, ...deal.offeredTermIds].includes(id));
    return { id: deal.id, status: deal.status, summary: terms.map(({ responsibleActorId, desiredChange }) => `${label(responsibleActorId)}: ${propositionLabel(desiredChange, label)}`).join(" / ") };
  });

  return presentationViewModelSchema.parse({
    sceneId: snapshot.sceneId,
    beat: snapshot.beat,
    roomLabel: label(snapshot.room.id),
    visibleEntityIds: [
      ...snapshot.characters.filter(({ active }) => active).map(({ id }) => id),
      ...snapshot.objects.filter(({ visible }) => visible).map(({ id }) => id),
    ],
    knownPropositions: uniqueBy([...beliefKnowledge.map(({ proposition }) => proposition), ...perceptualKnowledge.map(({ proposition }) => proposition)], propositionIdentity),
    noticedEventIds: latestPerceptions.map(({ eventId }) => eventId),
    openDealIds: openDeals.map(({ id }) => id),
    resultPanelIds: resultPanels.map(({ id }) => id),
    terminalSummary: snapshot.terminalReason ? `The scene ended: ${snapshot.terminalReason.replaceAll("_", " ")}.` : null,
    playerGoal: { id: goal.id, label: content.goals.find(({ id }) => id === goal.definitionId)?.label ?? "Your goal", target: goal.target },
    playerReason: { id: reason.id, label: content.reasons.find(({ id }) => id === reason.definitionId)?.label ?? "Your reason" },
    characters: snapshot.characters.filter(({ active }) => active).map((character) => ({ id: character.id, label: label(character.id), roleLabel: character.role === "PLAYER_ROLE" ? "You" : "In the room", zoneId: character.zoneId })),
    objects: snapshot.objects.filter(({ visible }) => visible).map((object) => ({ id: object.id, label: label(object.id), zoneId: object.zoneId, holderLabel: object.holderId ? label(object.holderId) : null, visible: object.visible })),
    whatIKnow: [
      ...beliefKnowledge.map((belief) => ({ id: belief.id, label: propositionLabel(belief.proposition, label), certainty: belief.certainty, sourceKind: "BELIEF" as const })),
      ...perceptualKnowledge.map(({ perception, proposition }) => ({ id: stableRuntimeId("known", perception.id, propositionIdentity(proposition)), label: propositionLabel(proposition, label), certainty: null, sourceKind: "PERCEPTION" as const })),
      ...relationshipKnowledge.map((relationship) => ({ id: relationship.id, label: `${content.relationshipTypes.find(({ id }) => id === relationship.typeId)?.label ?? "Shared history"}: ${relationship.actorIds.map(label).join(" and ")}`, certainty: null, sourceKind: "RELATIONSHIP" as const })),
      ...knownHistory.map((event) => ({ id: event.id, label: `${label(event.actorId)} previously ${event.actionId.replace(/^history_action_/, "").replaceAll("_", " ")}`, certainty: null, sourceKind: "HISTORY" as const })),
      ...playerObligations.map((obligation) => ({ id: obligation.id, label: `Your Deal obligation is ${obligation.status.toLowerCase()}.`, certainty: null, sourceKind: "OBLIGATION" as const })),
    ],
    whatINoticed: latestPerceptions.map((perception) => ({
      id: `noticed_${perception.id}`,
      eventId: perception.eventId,
      label: perceivedEventLabel(perception, latest!.observableEvents.find(({ id }) => id === perception.eventId)!, label) || "You noticed activity without enough detail.",
    })),
    openDeals,
    resultPanels,
  });
}

export function buildDebugView(
  state: LivingComicEngineState,
  generated: GeneratedScene,
): DebugPresentationModel {
  return {
    mode: "DEBUG",
    seed: state.snapshot.seed,
    generationTrace: structuredClone(generated.generationTrace),
    validationTrace: structuredClone(generated.validationTrace),
    snapshot: structuredClone(state.snapshot),
    reports: structuredClone(state.reports),
  };
}

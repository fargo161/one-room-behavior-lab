import { stableRuntimeId } from "../core/ids";
import { propositionKey, propositionsEqual } from "../core/propositions";
import { routeIntention } from "../actions/functionRouting";
import type {
  Belief,
  Character,
  ContentManifest,
  Goal,
  Interpretation,
  InterpretationCandidate,
  ObservableEvent,
  Perception,
  Proposition,
  Relationship,
  ScenePressure,
} from "../schemas";

export interface ObserverInterpretationView {
  sceneId: string;
  beat: number;
  observer: Character;
  beliefs: Belief[];
  goal: Goal | null;
  relationships: Relationship[];
  scenePressure: ScenePressure;
  primaryObjectId: string;
}

export function buildObserverInterpretationView(
  snapshot: {
    sceneId: string;
    beat: number;
    characters: Character[];
    beliefs: Belief[];
    goals: Goal[];
    relationships: Relationship[];
    scenePressure: ScenePressure;
    objects: Array<{ id: string }>;
  },
  observerId: string,
): ObserverInterpretationView {
  const observer = snapshot.characters.find(({ id }) => id === observerId);
  if (!observer) throw new Error(`Unknown interpretation observer: ${observerId}`);
  return {
    sceneId: snapshot.sceneId,
    beat: snapshot.beat,
    observer: structuredClone(observer),
    beliefs: structuredClone(snapshot.beliefs.filter(({ actorId }) => actorId === observerId)),
    goal: structuredClone(snapshot.goals.find(({ id }) => id === observer.primaryGoalId) ?? null),
    relationships: structuredClone(snapshot.relationships.filter(({ actorIds }) => actorIds.includes(observerId))),
    scenePressure: structuredClone(snapshot.scenePressure),
    primaryObjectId: snapshot.objects[0]?.id ?? "primary_object",
  };
}

const priorBeliefScore = (view: ObserverInterpretationView, proposition: Proposition): number => {
  const beliefs = view.beliefs.filter((belief) => propositionKey(belief.proposition) === propositionKey(proposition));
  if (beliefs.some((belief) => propositionsEqual(belief.proposition, proposition))) return 30;
  if (beliefs.length > 0) return -10;
  return 0;
};

const candidate = (
  view: ObserverInterpretationView,
  event: ObservableEvent,
  ordinal: number,
  proposition: Proposition,
  content: ContentManifest,
  baseScore: number,
  evidenceRefs: string[],
): InterpretationCandidate => {
  const routing = routeIntention([proposition], content);
  let score = baseScore + priorBeliefScore(view, proposition);
  if (view.goal && proposition.predicate === view.goal.target.predicate) score += 15;
  if (view.relationships.some(({ actorIds }) => actorIds.includes(event.actorId))) score += 5;
  if (view.scenePressure.beatsRemaining <= 2 && routing.compatibleFunctionIds.includes("ESCAPE")) score += 10;
  return {
    id: stableRuntimeId("interpretation_candidate", view.sceneId, view.beat + 1, view.observer.id, event.id, ordinal),
    inferredIntention: [proposition],
    inferredFunctionIds: routing.compatibleFunctionIds,
    inferredGoal: proposition,
    score,
    evidenceRefs,
  };
};

export function interpretPerception(
  view: ObserverInterpretationView,
  perception: Perception,
  event: ObservableEvent,
  content: ContentManifest,
): Interpretation {
  const candidates: InterpretationCandidate[] = [];
  const communicated = perception.registeredPropositions.find(({ predicate }) => predicate === "COMMUNICATED_WITH");
  const contentPropositions = perception.registeredPropositions.filter(({ predicate }) => predicate !== "COMMUNICATED_WITH");

  contentPropositions.forEach((proposition, index) => {
    candidates.push(candidate(view, event, index + 1, proposition, content, 60, [perception.id, event.id]));
  });

  if (communicated || event.observableCueIds.includes("ambiguous_social_occurrence")) {
    const accessHypothesis: Proposition = {
      subjectId: view.primaryObjectId,
      predicate: "HELD_BY",
      objectId: event.actorId,
    };
    const attentionTarget = event.targetEntityIds[0] ?? view.observer.id;
    const attentionHypothesis: Proposition = {
      subjectId: attentionTarget,
      predicate: "ATTENDING_TO",
      objectId: event.actorId,
    };
    candidates.push(candidate(view, event, candidates.length + 1, accessHypothesis, content, 20, [perception.id, event.id]));
    candidates.push(candidate(view, event, candidates.length + 1, attentionHypothesis, content, view.goal?.target.predicate.startsWith("EXIT") ? 40 : 20, [perception.id, event.id]));
  }

  if (candidates.length === 0) {
    const visibleResult = perception.registeredPropositions[0] ?? {
      subjectId: event.actorId,
      predicate: "ACTED",
      value: true,
    };
    candidates.push(candidate(view, event, 1, visibleResult, content, 40, [perception.id, event.id]));
  }

  candidates.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const selected = candidates[0]!;
  return {
    id: stableRuntimeId("interpretation", view.sceneId, view.beat + 1, view.observer.id, event.id),
    observerId: view.observer.id,
    perceptionIds: [perception.id],
    inferredIntention: selected.inferredIntention,
    inferredFunctionIds: selected.inferredFunctionIds,
    inferredGoal: selected.inferredGoal,
    inferredReasonId: null,
    certainty: selected.score >= 70 ? "CERTAIN" : "UNCERTAIN",
    evidenceRefs: selected.evidenceRefs,
    candidateScores: candidates,
  };
}

export function interpretNpcPerceptions(
  snapshot: Parameters<typeof buildObserverInterpretationView>[0],
  perceptions: Perception[],
  events: ObservableEvent[],
  content: ContentManifest,
): Interpretation[] {
  const npcIds = snapshot.characters.filter(({ role }) => role !== "PLAYER_ROLE").map(({ id }) => id);
  return perceptions.flatMap((perception) => {
    if (!npcIds.includes(perception.observerId)) return [];
    const event = events.find(({ id }) => id === perception.eventId);
    if (!event) return [];
    return [interpretPerception(buildObserverInterpretationView(snapshot, perception.observerId), perception, event, content)];
  });
}

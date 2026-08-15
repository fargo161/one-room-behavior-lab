import { stableRuntimeId } from "./ids";
import { propositionIdentity, propositionKey, propositionsEqual } from "./propositions";
import type { Proposition, RuntimeSnapshot, WorldFact } from "../schemas";

export const worldHas = (snapshot: RuntimeSnapshot, proposition: Proposition): boolean => snapshot.worldFacts
  .some((fact) => propositionsEqual(fact.proposition, proposition));

export const worldValue = (snapshot: RuntimeSnapshot, subjectId: string, predicate: string): Proposition | undefined => snapshot.worldFacts
  .find((fact) => fact.proposition.subjectId === subjectId && fact.proposition.predicate === predicate)
  ?.proposition;

const synchronizeProjection = (snapshot: RuntimeSnapshot, proposition: Proposition): void => {
  const object = snapshot.objects.find(({ id }) => id === proposition.subjectId);
  const character = snapshot.characters.find(({ id }) => id === proposition.subjectId);
  if (object) {
    if (proposition.predicate === "HELD_BY") object.holderId = proposition.objectId ?? null;
    if (proposition.predicate === "OWNED_BY") object.ownerId = proposition.objectId ?? null;
    if (proposition.predicate === "VISIBLE" && typeof proposition.value === "boolean") object.visible = proposition.value;
    if (proposition.predicate === "OPEN" && typeof proposition.value === "boolean") object.open = proposition.value;
    if (proposition.predicate === "LOCATED_AT" && proposition.objectId) object.zoneId = proposition.objectId;
  }
  if (character) {
    if (proposition.predicate === "LOCATED_AT" && proposition.objectId) character.zoneId = proposition.objectId;
    if (proposition.predicate === "ACTIVE_IN_ROOM" && typeof proposition.value === "boolean") character.active = proposition.value;
  }
};

export function assertWorldFact(
  snapshot: RuntimeSnapshot,
  proposition: Proposition,
  sourceHistoryEventIds: string[] = [],
): { fact: WorldFact; prior: Proposition | null; changed: boolean } {
  const exact = snapshot.worldFacts.find((fact) => propositionsEqual(fact.proposition, proposition));
  if (exact) return { fact: exact, prior: exact.proposition, changed: false };
  const priorFact = snapshot.worldFacts.find((fact) => propositionKey(fact.proposition) === propositionKey(proposition));
  if (priorFact) snapshot.worldFacts = snapshot.worldFacts.filter(({ id }) => id !== priorFact.id);
  const fact: WorldFact = {
    id: stableRuntimeId("fact", snapshot.sceneId, "beat", snapshot.beat + 1, snapshot.worldFacts.length + 1, propositionIdentity(proposition)),
    proposition,
    truth: true,
    sourceHistoryEventIds,
  };
  snapshot.worldFacts.push(fact);
  synchronizeProjection(snapshot, proposition);
  return { fact, prior: priorFact?.proposition ?? null, changed: true };
}

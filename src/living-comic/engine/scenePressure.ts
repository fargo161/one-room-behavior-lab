import { stableRuntimeId } from "../core/ids";
import { assertWorldFact } from "../core/worldFacts";
import { narrativeRoleRefs } from "../core/roles";
import type { ContentManifest, ObservableEvent, Proposition, RuntimeSnapshot } from "../schemas";

const pressureTerminalProposition = (snapshot: RuntimeSnapshot, content: ContentManifest): Proposition | null => {
  const definition = content.scenePressures.find(({ id }) => id === snapshot.scenePressure.definitionId);
  if (!definition) return null;
  const refs = narrativeRoleRefs(snapshot);
  const template = definition.terminalPredicateTemplate;
  return template.objectRef
    ? { subjectId: refs[template.subjectRef]!, predicate: template.predicate, objectId: refs[template.objectRef]! }
    : { subjectId: refs[template.subjectRef]!, predicate: template.predicate, value: template.value! };
};

export function advanceScenePressure(
  snapshot: RuntimeSnapshot,
  content: ContentManifest,
  ordinal: number,
): { event: ObservableEvent | null; stateChanges: Proposition[] } {
  if (!snapshot.scenePressure.active) return { event: null, stateChanges: [] };
  const definition = content.scenePressures.find(({ id }) => id === snapshot.scenePressure.definitionId);
  if (!definition) return { event: null, stateChanges: [] };
  snapshot.scenePressure.beatsRemaining = Math.max(0, snapshot.scenePressure.beatsRemaining - 1);
  const resultPropositions: Proposition[] = [{
    subjectId: snapshot.room.id,
    predicate: definition.tickEventPredicate,
    value: snapshot.scenePressure.beatsRemaining,
  }];
  if (snapshot.scenePressure.beatsRemaining === 0) {
    snapshot.scenePressure.active = false;
    const terminal = pressureTerminalProposition(snapshot, content);
    if (terminal) {
      resultPropositions.push(terminal);
      assertWorldFact(snapshot, terminal);
    }
  }
  const event: ObservableEvent = {
    id: stableRuntimeId("event", snapshot.sceneId, "beat", snapshot.beat + 1, ordinal, "scene_pressure"),
    beat: snapshot.beat + 1,
    sourceActionId: stableRuntimeId("action", snapshot.sceneId, snapshot.beat + 1, "scene_pressure"),
    historyActionId: null,
    actorId: snapshot.room.id,
    resultPropositions,
    channels: ["VISUAL", "AUDITORY"],
    contentPropositionIds: [],
    targetEntityIds: snapshot.scenePressure.targetEntityIds,
    observableCueIds: ["scene_pressure_tick", ...(snapshot.scenePressure.active ? [] : ["scene_pressure_terminal"])],
    messageId: null,
    salient: snapshot.scenePressure.beatsRemaining <= 1,
  };
  return { event, stateChanges: resultPropositions.slice(1) };
}

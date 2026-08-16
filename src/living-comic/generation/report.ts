import type { ContentManifest, GeneratedScene, Proposition } from "../schemas";

export interface HumanReadableScene {
  seed: number;
  acceptedAttempt: number;
  sceneId: string;
  skeleton: string;
  room: string;
  cast: Array<Record<string, string | null>>;
  objects: Array<Record<string, string | string[] | null>>;
  scenePressure: Record<string, string | number | boolean>;
  history: Array<Record<string, string | string[] | null>>;
  relationships: Array<Record<string, string | string[]>>;
  beliefs: Array<Record<string, string>>;
  npcMotivations: Array<Record<string, string>>;
  playerOptions: Array<Record<string, string>>;
  initialWorldFacts: string[];
  generationTrace: GeneratedScene["generationTrace"];
  validatorTrace: GeneratedScene["validationTrace"];
}

const labelOf = (values: readonly { id: string; label?: string; displayName?: string }[], id: string | null): string => {
  if (id === null) return "none";
  const value = values.find((candidate) => candidate.id === id);
  return value?.label ?? value?.displayName ?? id;
};

export function serializeSceneForReview(scene: GeneratedScene, content: ContentManifest): HumanReadableScene {
  const characterLabels = new Map(scene.snapshot.characters.map((character) => [
    character.id,
    labelOf(content.characters, character.definitionId),
  ]));
  const objectLabels = new Map(scene.snapshot.objects.map((object) => [
    object.id,
    labelOf(content.objects, object.definitionId),
  ]));
  const entityLabel = (id: string): string => characterLabels.get(id) ?? objectLabels.get(id) ?? (
    id === scene.snapshot.room.id ? labelOf(content.roomPresets, scene.snapshot.room.definitionId) : id
  );
  const propositionText = (proposition: Proposition): string => (
    `${entityLabel(proposition.subjectId)} ${proposition.predicate} ${proposition.objectId ? entityLabel(proposition.objectId) : JSON.stringify(proposition.value)}`
  );
  const reasonByGoalId = new Map(scene.snapshot.reasons.map((reason) => [reason.goalId, reason]));

  return {
    seed: scene.snapshot.seed,
    acceptedAttempt: scene.attempt + 1,
    sceneId: scene.snapshot.sceneId,
    skeleton: labelOf(content.conflictSkeletons, scene.snapshot.skeletonDefinitionId),
    room: `${labelOf(content.roomPresets, scene.snapshot.room.definitionId)} (${labelOf(content.roomCategories, scene.snapshot.room.categoryId)})`,
    cast: scene.snapshot.characters.map((character) => ({
      role: character.role,
      actor: entityLabel(character.id),
      actorId: character.id,
      definitionId: character.definitionId,
      vibe: labelOf(content.basedVibes, character.baselineVibeId),
      zone: character.zoneId,
    })),
    objects: scene.snapshot.objects.map((object) => ({
      object: entityLabel(object.id),
      objectId: object.id,
      definitionId: object.definitionId,
      categories: object.categoryIds.map((id) => labelOf(content.objectCategories, id)),
      zone: object.zoneId,
      holder: object.holderId ? entityLabel(object.holderId) : null,
      owner: object.ownerId ? entityLabel(object.ownerId) : null,
    })),
    scenePressure: {
      pressure: labelOf(content.scenePressures, scene.snapshot.scenePressure.definitionId),
      beatsRemaining: scene.snapshot.scenePressure.beatsRemaining,
      active: scene.snapshot.scenePressure.active,
    },
    history: scene.snapshot.history.map((event) => ({
      eventId: event.id,
      action: labelOf(content.historyActions, event.actionId),
      actor: entityLabel(event.actorId),
      target: event.targetId ? entityLabel(event.targetId) : null,
      result: propositionText(event.result),
      participants: event.secondaryParticipantIds.map(entityLabel),
    })),
    relationships: scene.snapshot.relationships.map((relationship) => ({
      relationship: labelOf(content.relationshipTypes, relationship.typeId),
      actors: relationship.actorIds.map(entityLabel),
      groundedBy: relationship.sharedHistoryEventIds,
    })),
    beliefs: scene.snapshot.beliefs.map((belief) => ({
      actor: entityLabel(belief.actorId),
      belief: propositionText(belief.proposition),
      certainty: belief.certainty,
      evidence: belief.sourceEventIds.join(", "),
    })),
    npcMotivations: scene.snapshot.characters
      .filter(({ role }) => role !== "PLAYER_ROLE")
      .map((character) => {
        const goal = scene.snapshot.goals.find(({ id }) => id === character.primaryGoalId);
        const reason = goal ? reasonByGoalId.get(goal.id) : undefined;
        return {
          actor: entityLabel(character.id),
          goal: goal ? labelOf(content.goals, goal.definitionId) : "none",
          target: goal ? propositionText(goal.target) : "none",
          reason: reason ? labelOf(content.reasons, reason.definitionId) : "none",
        };
      }),
    playerOptions: scene.playerOptions.map((option, index) => ({
      option: String(index + 1),
      goal: labelOf(content.goals, option.goal.definitionId),
      target: propositionText(option.goal.target),
      reason: labelOf(content.reasons, option.reason.definitionId),
      groundedBy: option.reason.groundingHistoryEventIds.join(", "),
    })),
    initialWorldFacts: scene.snapshot.worldFacts.map(({ proposition }) => propositionText(proposition)),
    generationTrace: scene.generationTrace,
    validatorTrace: scene.validationTrace,
  };
}

import { z } from "zod";
import type { ContentManifest } from "../schemas";
import {
  generationTraceEntrySchema,
  playerGoalReasonOptionSchema,
  runtimeSnapshotSchema,
  type GeneratedScene,
  type RuntimeSnapshot,
  type PlayerGoalReasonOption,
  type GenerationTraceEntry,
  type ValidationTraceEntry,
} from "../schemas";
import {
  containsProposition,
  contradictoryPropositionPairs,
  propositionIdentity,
  propositionKey,
} from "../core/propositions";

export interface SceneCandidate {
  snapshot: RuntimeSnapshot;
  playerOptions: PlayerGoalReasonOption[];
  generationTrace: GenerationTraceEntry[];
  attempt: number;
}

export interface SceneValidationResult {
  valid: boolean;
  trace: ValidationTraceEntry[];
  issues: string[];
}

const pairKey = (left: string, right: string): string => [left, right].sort().join("|");

const zodMessage = (error: z.ZodError): string => error.issues
  .map((issue) => `${issue.path.join(".") || "scene"}: ${issue.message}`)
  .join("; ");

export function validateSceneCandidate(
  candidate: SceneCandidate,
  content: ContentManifest,
): SceneValidationResult {
  const trace: ValidationTraceEntry[] = [];
  const issues: string[] = [];
  const record = (checkId: string, passed: boolean, message: string, refs: string[] = []) => {
    trace.push({ checkId, passed, message, refs });
    if (!passed) issues.push(`${checkId}: ${message}`);
  };

  const snapshotResult = runtimeSnapshotSchema.safeParse(candidate.snapshot);
  const optionsResult = playerGoalReasonOptionSchema.array().min(2).max(3).safeParse(candidate.playerOptions);
  const generationTraceResult = generationTraceEntrySchema.array().min(10).safeParse(candidate.generationTrace);
  const schemaPassed = snapshotResult.success && optionsResult.success && generationTraceResult.success;
  const schemaMessages = [
    snapshotResult.success ? null : zodMessage(snapshotResult.error),
    optionsResult.success ? null : zodMessage(optionsResult.error),
    generationTraceResult.success ? null : zodMessage(generationTraceResult.error),
  ].filter(Boolean);
  record(
    "check_schema_contracts",
    schemaPassed,
    schemaPassed ? "Runtime, option, and trace contracts parse." : schemaMessages.join(" | "),
  );
  if (!schemaPassed) return { valid: false, trace, issues };

  const snapshot = snapshotResult.data;
  const options = optionsResult.data;
  const skeleton = content.conflictSkeletons.find(({ id }) => id === snapshot.skeletonDefinitionId);
  const roomCompatible = Boolean(skeleton?.compatibleRoomCategoryIds.includes(snapshot.room.categoryId));
  record(
    "check_skeleton_room",
    Boolean(skeleton) && roomCompatible,
    roomCompatible ? "Conflict skeleton and room category are compatible." : "Skeleton is missing or incompatible with the room category.",
    [snapshot.skeletonDefinitionId, snapshot.room.categoryId],
  );

  const primaryObject = snapshot.objects[0];
  const requiredObjectCompatible = Boolean(primaryObject && skeleton && (
    skeleton.requiredObjectCategoryIds.length === 0
    || primaryObject.categoryIds.some((id) => skeleton.requiredObjectCategoryIds.includes(id))
  ));
  record(
    "check_primary_object",
    requiredObjectCompatible,
    requiredObjectCompatible ? "Primary object satisfies the skeleton category requirement." : "Primary object does not satisfy the skeleton category requirement.",
    primaryObject ? [primaryObject.id, ...primaryObject.categoryIds] : [],
  );

  const pressureDefinition = content.scenePressures.find(({ id }) => id === snapshot.scenePressure.definitionId);
  const pressureCompatible = Boolean(pressureDefinition?.compatibleSkeletonIds.includes(snapshot.skeletonDefinitionId));
  record(
    "check_scene_pressure",
    pressureCompatible && snapshot.scenePressure.active && snapshot.scenePressure.beatsRemaining > 0,
    pressureCompatible ? "Active scene pressure is compatible and time-bounded." : "Scene pressure is missing, inactive, or incompatible.",
    [snapshot.scenePressure.definitionId, snapshot.skeletonDefinitionId],
  );

  const allGoals = [...snapshot.goals, ...options.map(({ goal }) => goal)];
  const allReasons = [...snapshot.reasons, ...options.map(({ reason }) => reason)];
  const uniqueGoals = [...new Map(allGoals.map((goal) => [goal.id, goal])).values()];
  const uniqueReasons = [...new Map(allReasons.map((reason) => [reason.id, reason])).values()];
  const worldPropositions = snapshot.worldFacts.map(({ proposition }) => proposition);
  const goalsValid = uniqueGoals.every((goal) => {
    const definition = content.goals.find(({ id }) => id === goal.definitionId);
    return Boolean(
      definition
      && definition.compatibleSkeletonIds.includes(snapshot.skeletonDefinitionId)
      && !containsProposition(worldPropositions, goal.target)
      && (definition.compatibleObjectCategoryIds.length === 0
        || primaryObject?.categoryIds.some((id) => definition.compatibleObjectCategoryIds.includes(id))),
    );
  });
  record(
    "check_goals_unsatisfied",
    goalsValid,
    goalsValid ? "Every candidate goal is compatible, object-grounded, and initially unsatisfied." : "A goal is incompatible, already satisfied, or lacks an object-category grounding.",
    uniqueGoals.map(({ id }) => id),
  );

  const obstacleById = new Map(snapshot.obstacles.map((obstacle) => [obstacle.id, obstacle]));
  const factById = new Map(snapshot.worldFacts.map((fact) => [fact.id, fact]));
  const obstaclesValid = uniqueGoals.every((goal) => goal.obstacleIds.every((obstacleId) => {
    const obstacle = obstacleById.get(obstacleId);
    return Boolean(
      obstacle
      && obstacle.goalId === goal.id
      && obstacle.sourceFactIds.some((factId) => {
        const fact = factById.get(factId);
        return fact && propositionIdentity(fact.proposition) === propositionIdentity(obstacle.blockingCondition);
      }),
    );
  }));
  record(
    "check_obstacles",
    obstaclesValid,
    obstaclesValid ? "Every goal has a blocking obstacle grounded in a true world fact." : "A goal obstacle is missing or not grounded in the initial world.",
    snapshot.obstacles.map(({ id }) => id),
  );

  const eventById = new Map(snapshot.history.map((event) => [event.id, event]));
  const reasonsGrounded = uniqueReasons.every((reason) => {
    const definition = content.reasons.find(({ id }) => id === reason.definitionId);
    return Boolean(
      definition
      && definition.compatibleGoalIds.includes(uniqueGoals.find(({ id }) => id === reason.goalId)?.definitionId ?? "")
      && reason.groundingHistoryEventIds.some((eventId) => {
        const event = eventById.get(eventId);
        return event && definition.groundingHistoryActionIds.includes(event.actionId);
      }),
    );
  });
  record(
    "check_reason_history",
    reasonsGrounded,
    reasonsGrounded ? "Every reason is compatible with its goal and grounded in shared history." : "A reason is ungrounded or incompatible with its goal.",
    uniqueReasons.map(({ id }) => id),
  );

  const worldByKey = new Map(snapshot.worldFacts.map((fact) => [propositionKey(fact.proposition), fact.proposition]));
  const beliefsByKey = new Map<string, typeof snapshot.beliefs>();
  for (const belief of snapshot.beliefs) {
    const key = propositionKey(belief.proposition);
    beliefsByKey.set(key, [...(beliefsByKey.get(key) ?? []), belief]);
  }
  const asymmetricBeliefs = [...beliefsByKey.entries()].some(([key, beliefs]) => {
    const actors = new Set(beliefs.map(({ actorId }) => actorId));
    const identities = new Set(beliefs.map(({ proposition }) => propositionIdentity(proposition)));
    const trueWorldValue = worldByKey.get(key);
    return actors.size >= 2
      && identities.size >= 2
      && Boolean(trueWorldValue)
      && beliefs.some(({ proposition }) => propositionIdentity(proposition) === propositionIdentity(trueWorldValue!))
      && beliefs.some(({ proposition }) => propositionIdentity(proposition) !== propositionIdentity(trueWorldValue!));
  });
  record(
    "check_information_asymmetry",
    asymmetricBeliefs,
    asymmetricBeliefs ? "At least two actors hold different beliefs and one belief matches reality." : "No grounded asymmetric belief set exists.",
    snapshot.beliefs.map(({ id }) => id),
  );

  const contradictoryFacts = contradictoryPropositionPairs(worldPropositions);
  record(
    "check_world_consistency",
    contradictoryFacts.length === 0,
    contradictoryFacts.length === 0 ? "Initial world facts contain no same-key contradictions." : "Initial world facts contain contradictory values.",
    contradictoryFacts.flatMap(([left, right]) => [propositionIdentity(left), propositionIdentity(right)]),
  );

  const entityIds = new Set(snapshot.entities.map(({ id }) => id));
  const entityRefsValid = snapshot.characters.every(({ id, zoneId }) => entityIds.has(id) && entityIds.has(zoneId))
    && snapshot.objects.every(({ id, zoneId, holderId, ownerId }) => (
      entityIds.has(id)
      && entityIds.has(zoneId)
      && (holderId === null || entityIds.has(holderId))
      && (ownerId === null || entityIds.has(ownerId))
    ))
    && snapshot.room.zoneIds.every((id) => entityIds.has(id));
  record(
    "check_entity_references",
    entityRefsValid,
    entityRefsValid ? "All character, object, room, and zone references resolve." : "An entity or zone reference is dangling.",
    [...entityIds],
  );

  const expectedPairs = new Set([
    pairKey(snapshot.characters[0].id, snapshot.characters[1].id),
    pairKey(snapshot.characters[0].id, snapshot.characters[2].id),
    pairKey(snapshot.characters[1].id, snapshot.characters[2].id),
  ]);
  const relationshipPairs = new Set(snapshot.relationships.map(({ actorIds }) => pairKey(...actorIds)));
  const relationshipsValid = relationshipPairs.size === 3
    && [...expectedPairs].every((pair) => relationshipPairs.has(pair))
    && snapshot.relationships.every((relationship) => {
      const definition = content.relationshipTypes.find(({ id }) => id === relationship.typeId);
      return relationship.sharedHistoryEventIds.some((eventId) => {
        const event = eventById.get(eventId);
        return Boolean(definition && event && definition.compatibleHistoryActionIds.includes(event.actionId));
      });
    });
  record(
    "check_relationship_history",
    relationshipsValid,
    relationshipsValid ? "All three actor pairs have history-grounded relationships." : "An actor pair or relationship-history grounding is missing.",
    snapshot.relationships.map(({ id }) => id),
  );

  const playerId = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")?.id;
  const optionGoalIds = new Set(options.map(({ goal }) => goal.definitionId));
  const optionsValid = Boolean(playerId)
    && optionGoalIds.size === options.length
    && options.every(({ goal, reason }) => goal.actorId === playerId && reason.actorId === playerId && reason.goalId === goal.id);
  record(
    "check_player_options",
    optionsValid,
    optionsValid ? "The player receives two or three distinct, fully grounded goal/reason choices." : "Player options are duplicated, malformed, or assigned to another actor.",
    options.map(({ id }) => id),
  );

  const holderFact = primaryObject && snapshot.worldFacts.find(({ proposition }) => (
    proposition.subjectId === primaryObject.id
    && proposition.predicate === "HELD_BY"
    && proposition.objectId === primaryObject.holderId
  ));
  const ownerFact = primaryObject && snapshot.worldFacts.find(({ proposition }) => (
    proposition.subjectId === primaryObject.id
    && proposition.predicate === "OWNED_BY"
    && proposition.objectId === primaryObject.ownerId
  ));
  const possessionOwnershipSeparate = Boolean(
    primaryObject
    && primaryObject.holderId
    && primaryObject.ownerId
    && primaryObject.holderId !== primaryObject.ownerId
    && holderFact
    && ownerFact,
  );
  record(
    "check_possession_ownership",
    possessionOwnershipSeparate,
    possessionOwnershipSeparate ? "HELD_BY and OWNED_BY are explicit and assigned independently." : "Possession and ownership are missing or collapsed.",
    primaryObject ? [primaryObject.id, primaryObject.holderId ?? "", primaryObject.ownerId ?? ""].filter(Boolean) : [],
  );

  const primaryObjectReachable = Boolean(primaryObject && snapshot.room.zoneIds.includes(primaryObject.zoneId));
  record(
    "check_reachability",
    primaryObjectReachable,
    primaryObjectReachable ? "Primary object occupies a reachable room zone." : "Primary object is outside the room topology.",
    primaryObject ? [primaryObject.id, primaryObject.zoneId] : [],
  );

  const genericSerialization = JSON.stringify(candidate).toLowerCase();
  const legacyTokens = ["mara", "drew", "envelope"].filter((token) => genericSerialization.includes(token));
  record(
    "check_generic_content",
    legacyTokens.length === 0,
    legacyTokens.length === 0 ? "Generated state is generic and contains no legacy scenario identity." : `Legacy scenario tokens leaked into generation: ${legacyTokens.join(", ")}`,
  );

  return { valid: issues.length === 0, trace, issues };
}

export function validateGeneratedScene(scene: GeneratedScene, content: ContentManifest): SceneValidationResult {
  return validateSceneCandidate(scene, content);
}

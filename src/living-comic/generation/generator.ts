import { SeededRng } from "../core/rng";
import { stableRuntimeId, unsignedSeedLabel } from "../core/ids";
import { containsProposition, propositionIdentity, propositionKey } from "../core/propositions";
import { loadDefaultContent } from "../content";
import {
  generatedSceneSchema,
  type Belief,
  type Character,
  type CharacterDefinition,
  type ContentManifest,
  type Entity,
  type GeneratedScene,
  type GenerationTraceEntry,
  type Goal,
  type GoalDefinition,
  type HistoricalEvent,
  type ObjectInstance,
  type Obstacle,
  type PlayerGoalReasonOption,
  type Proposition,
  type PropositionTemplate,
  type Reason,
  type ReasonDefinition,
  type Relationship,
  type RuntimeSnapshot,
  type WorldFact,
} from "../schemas";
import { validateSceneCandidate, type SceneCandidate } from "./validator";

type TemplateRef = PropositionTemplate["subjectRef"];
type TemplateContext = Record<TemplateRef, string>;

interface PlannedMotivation {
  goal: Goal;
  obstacle: Obstacle;
  reasonDefinition: ReasonDefinition;
  groundingActionId: string;
  actorId: string;
  optionId?: string;
}

interface CandidateBuild {
  candidate: SceneCandidate;
  selectedDefinitionIds: string[];
}

const ATTEMPT_INCREMENT = 0x9e3779b9;
const MAX_ATTEMPTS = 64;

export function resolveTemplate(template: PropositionTemplate, context: TemplateContext): Proposition {
  return template.objectRef
    ? { subjectId: context[template.subjectRef], predicate: template.predicate, objectId: context[template.objectRef] }
    : { subjectId: context[template.subjectRef], predicate: template.predicate, value: template.value! };
}

const makeContext = (actorId: string, actors: readonly string[], primaryObjectId: string): TemplateContext => {
  const [playerId, counterpartId, thirdPartyId] = actors as [string, string, string];
  if (actorId === playerId) {
    return {
      SELF: playerId,
      COUNTERPART: counterpartId,
      THIRD_PARTY: thirdPartyId,
      PRIMARY_OBJECT: primaryObjectId,
      ROOM: "scene_room",
      EXIT_ZONE: "zone_exit",
    };
  }
  if (actorId === counterpartId) {
    return {
      SELF: counterpartId,
      COUNTERPART: playerId,
      THIRD_PARTY: thirdPartyId,
      PRIMARY_OBJECT: primaryObjectId,
      ROOM: "scene_room",
      EXIT_ZONE: "zone_exit",
    };
  }
  return {
    SELF: thirdPartyId,
    COUNTERPART: counterpartId,
    THIRD_PARTY: playerId,
    PRIMARY_OBJECT: primaryObjectId,
    ROOM: "scene_room",
    EXIT_ZONE: "zone_exit",
  };
};

const isFactCompatible = (facts: readonly WorldFact[], proposition: Proposition): boolean => facts.every((fact) => (
  propositionKey(fact.proposition) !== propositionKey(proposition)
  || propositionIdentity(fact.proposition) === propositionIdentity(proposition)
));

const addFact = (
  facts: WorldFact[],
  sceneLabel: string,
  proposition: Proposition,
  sourceHistoryEventIds: string[] = [],
): WorldFact => {
  const existing = facts.find((fact) => propositionIdentity(fact.proposition) === propositionIdentity(proposition));
  if (existing) return existing;
  if (!isFactCompatible(facts, proposition)) {
    throw new Error(`Contradictory fact requested: ${propositionIdentity(proposition)}`);
  }
  const fact: WorldFact = {
    id: stableRuntimeId("fact", sceneLabel, facts.length + 1),
    proposition,
    truth: true,
    sourceHistoryEventIds,
  };
  facts.push(fact);
  return fact;
};

const reasonForGoal = (
  content: ContentManifest,
  rng: SeededRng,
  goalDefinitionId: string,
  groundingActionIds: string[],
): { definition: ReasonDefinition; actionId: string } => {
  const compatible = rng.shuffle(content.reasons.filter(({ compatibleGoalIds }) => compatibleGoalIds.includes(goalDefinitionId)));
  for (const definition of compatible) {
    const reusable = rng.shuffle(definition.groundingHistoryActionIds.filter((id) => groundingActionIds.includes(id)));
    if (reusable.length > 0) return { definition, actionId: reusable[0] as string };
    if (groundingActionIds.length < 4) {
      const actionId = rng.pick(definition.groundingHistoryActionIds);
      groundingActionIds.push(actionId);
      return { definition, actionId };
    }
  }
  throw new Error(`No four-event history grounding can support ${goalDefinitionId}`);
};

const historyResult = (actionId: string, actorId: string, targetId: string, roomId: string): Proposition => {
  const action = actionId.replace(/^history_action_/, "").toUpperCase();
  const noTarget = action === "LEFT" || action === "ENTERED";
  return noTarget
    ? { subjectId: actorId, predicate: `PREVIOUSLY_${action}`, objectId: roomId }
    : { subjectId: actorId, predicate: `PREVIOUSLY_${action}`, objectId: targetId };
};

const buildAttempt = (
  seed: number,
  attempt: number,
  content: ContentManifest,
  priorRejections: readonly GenerationTraceEntry[],
): CandidateBuild => {
  const attemptSeed = (seed + Math.imul(attempt + 1, ATTEMPT_INCREMENT)) | 0;
  const rng = new SeededRng(attemptSeed);
  const sceneLabel = `${unsignedSeedLabel(seed)}_${attempt + 1}`;
  const sceneId = stableRuntimeId("scene", sceneLabel);
  const trace: GenerationTraceEntry[] = priorRejections.map((entry) => ({ ...entry }));
  const traceStep = (kind: string, selectedIds: string[], explanation: string) => {
    trace.push({ step: trace.length + 1, kind, selectedIds, explanation });
  };

  traceStep("attempt_seed", [stableRuntimeId("seed", unsignedSeedLabel(seed)), stableRuntimeId("attempt", attempt + 1)], "Derived a language-portable xorshift32 stream for this deterministic attempt.");

  const skeleton = rng.pick(content.conflictSkeletons);
  const roomDefinition = rng.pick(content.roomPresets);
  const pressureDefinition = rng.pick(content.scenePressures);
  traceStep("conflict_skeleton", [skeleton.id], "Selected one structural conflict grammar without selecting a scenario.");
  traceStep("room_preset", [roomDefinition.id, roomDefinition.categoryId], "Selected room topology independently; compatibility is validator-owned.");

  const characterDefinitions = rng.shuffle(content.characters).slice(0, 3) as [CharacterDefinition, CharacterDefinition, CharacterDefinition];
  const actorIds = ["actor_player", "actor_counterpart", "actor_third_party"] as const;
  traceStep("cast", characterDefinitions.map(({ id }) => id), "Assigned three portable character definitions to stable narrative roles.");

  const objectCount = 1 + rng.integer(3);
  const objectDefinitions = rng.shuffle(content.objects).slice(0, objectCount);
  const primaryObjectDefinition = objectDefinitions[0];
  if (!primaryObjectDefinition) throw new Error("Content package has no objects");
  traceStep("objects", objectDefinitions.map(({ id }) => id), "Selected one primary and zero-to-two secondary objects independently of the skeleton.");
  traceStep("scene_pressure", [pressureDefinition.id], "Selected a ticking scene pressure; the validator decides whether it fits the conflict.");

  const objects: ObjectInstance[] = objectDefinitions.map((definition, index) => ({
    id: index === 0 ? "primary_object" : stableRuntimeId("secondary_object", index),
    definitionId: definition.id,
    entityType: "OBJECT",
    tags: definition.tags,
    categoryIds: definition.categoryIds,
    zoneId: index === 0 ? "zone_table" : rng.pick(roomDefinition.zones),
    holderId: index === 0 ? actorIds[1] : null,
    ownerId: index === 0 ? actorIds[2] : null,
    visible: index === 0 ? skeleton.kind !== "DISCLOSURE" : true,
    open: definition.categoryIds.includes("object_category_container") ? false : null,
  }));

  const facts: WorldFact[] = [];
  addFact(facts, sceneLabel, { subjectId: "primary_object", predicate: "HELD_BY", objectId: actorIds[1] });
  addFact(facts, sceneLabel, { subjectId: "primary_object", predicate: "OWNED_BY", objectId: actorIds[2] });
  addFact(facts, sceneLabel, { subjectId: "primary_object", predicate: "VISIBLE", value: skeleton.kind !== "DISCLOSURE" });
  addFact(facts, sceneLabel, { subjectId: "primary_object", predicate: "SEALED", value: true });
  addFact(facts, sceneLabel, { subjectId: actorIds[0], predicate: "LOCATED_AT", objectId: "zone_entry" });
  addFact(facts, sceneLabel, { subjectId: actorIds[1], predicate: "LOCATED_AT", objectId: "zone_center" });
  addFact(facts, sceneLabel, { subjectId: actorIds[2], predicate: "LOCATED_AT", objectId: "zone_table" });
  actorIds.forEach((actorId) => addFact(facts, sceneLabel, { subjectId: actorId, predicate: "LOCATED_IN", objectId: "scene_room" }));
  addFact(facts, sceneLabel, { subjectId: "scene_room", predicate: "EXIT_AVAILABLE", value: true });
  addFact(facts, sceneLabel, { subjectId: actorIds[1], predicate: "EXPOSED", value: true });

  const usedTargets: Proposition[] = [];
  const usedActions: string[] = [];
  const planned: PlannedMotivation[] = [];
  const obstacles: Obstacle[] = [];

  const createMotivation = (actorId: string, definition: GoalDefinition, optionIndex?: number): PlannedMotivation | null => {
    const context = makeContext(actorId, actorIds, "primary_object");
    const target = resolveTemplate(definition.targetTemplate, context);
    const blockingCondition = resolveTemplate(definition.obstacleTemplate, context);
    if (containsProposition(facts.map(({ proposition }) => proposition), target)) return null;
    if (!isFactCompatible(facts, blockingCondition)) return null;
    if (usedTargets.some((usedTarget) => propositionIdentity(usedTarget) === propositionIdentity(blockingCondition))) return null;
    const ordinal = planned.length + 1;
    const goalId = stableRuntimeId("goal", sceneLabel, actorId, ordinal);
    const obstacleId = stableRuntimeId("obstacle", sceneLabel, actorId, ordinal);
    const goal: Goal = {
      id: goalId,
      definitionId: definition.id,
      actorId,
      target,
      primary: optionIndex === undefined,
      obstacleIds: [obstacleId],
    };
    const sourceFact = addFact(facts, sceneLabel, blockingCondition);
    const obstacle: Obstacle = {
      id: obstacleId,
      goalId,
      blockingCondition,
      sourceFactIds: [sourceFact.id],
    };
    const reasonSelection = reasonForGoal(content, rng, definition.id, usedActions);
    usedTargets.push(target);
    obstacles.push(obstacle);
    const result: PlannedMotivation = {
      goal,
      obstacle,
      reasonDefinition: reasonSelection.definition,
      groundingActionId: reasonSelection.actionId,
      actorId,
      optionId: optionIndex === undefined ? undefined : stableRuntimeId("player_option", optionIndex + 1),
    };
    planned.push(result);
    return result;
  };

  const playerDefinitions = rng.shuffle(content.goals.filter(({ id }) => skeleton.compatibleGoalIds.includes(id)));
  // ACCESS has three individually valid player motivations, but instantiating all
  // three makes their obstacle facts satisfy every counterpart Goal. Two choices
  // preserve both the required player choice and an unsatisfied NPC motivation.
  const playerOptionCount = skeleton.kind === "ACCESS" ? 2 : Math.min(3, playerDefinitions.length);
  const playerPlans: PlannedMotivation[] = [];
  for (const definition of playerDefinitions) {
    if (playerPlans.length >= playerOptionCount) break;
    const motivation = createMotivation(actorIds[0], definition, playerPlans.length);
    if (motivation) playerPlans.push(motivation);
  }
  if (playerPlans.length < 2) throw new Error("Fewer than two compatible, blocked player motivations could be instantiated");
  traceStep("player_goal_options", playerPlans.map(({ goal }) => goal.definitionId), "Constructed two or three distinct player Goal candidates from the skeleton grammar.");

  const npcPlans: PlannedMotivation[] = [];
  for (const actorId of actorIds.slice(1)) {
    const definitions = rng.shuffle(content.goals.filter(({ id }) => skeleton.compatibleGoalIds.includes(id)));
    let motivation: PlannedMotivation | null = null;
    for (const definition of definitions) {
      motivation = createMotivation(actorId, definition);
      if (motivation) break;
    }
    if (!motivation) {
      throw new Error(`No valid NPC motivation could be instantiated for ${actorId} after player options ${playerPlans.map(({ goal }) => goal.definitionId).join(", ")}`);
    }
    npcPlans.push(motivation);
  }
  traceStep("npc_goals", npcPlans.map(({ goal }) => goal.definitionId), "Instantiated one primary Goal for each non-player actor.");
  traceStep("grounded_reasons", planned.map(({ reasonDefinition }) => reasonDefinition.id), "Selected Reason definitions whose claims can be grounded in at most four historical events.");

  if (usedActions.length < 2) {
    const relationshipSupportedActions = content.relationshipTypes.flatMap(({ compatibleHistoryActionIds }) => compatibleHistoryActionIds);
    const supplemental = rng.shuffle(content.historyActions.map(({ id }) => id))
      .find((id) => !usedActions.includes(id) && relationshipSupportedActions.includes(id));
    if (supplemental) usedActions.push(supplemental);
  }
  const history: HistoricalEvent[] = usedActions.slice(0, 4).map((actionId, index) => {
    const actionDefinition = content.historyActions.find(({ id }) => id === actionId);
    if (!actionDefinition) throw new Error(`Unknown history action ${actionId}`);
    const actorId = actorIds[index % actorIds.length] as string;
    return {
      id: stableRuntimeId("history_event", sceneLabel, index + 1),
      actionId,
      actorId,
      targetId: actionDefinition.requiresTarget ? "primary_object" : null,
      locationId: actionDefinition.supportsLocation ? "scene_room" : null,
      result: historyResult(actionId, actorId, "primary_object", "scene_room"),
      secondaryParticipantIds: actorIds.filter((id) => id !== actorId),
    };
  });
  if (history.length < 2) throw new Error("Scene history requires at least two grounded events");
  traceStep("shared_history", history.map(({ actionId }) => actionId), "Built a two-to-four event history shared by all three cast members.");

  const reasons: Reason[] = planned.map((motivation, index) => {
    const historyEvent = history.find(({ actionId }) => actionId === motivation.groundingActionId);
    if (!historyEvent) throw new Error(`No history event grounds ${motivation.reasonDefinition.id}`);
    return {
      id: stableRuntimeId("reason", sceneLabel, motivation.actorId, index + 1),
      definitionId: motivation.reasonDefinition.id,
      actorId: motivation.actorId,
      goalId: motivation.goal.id,
      groundingHistoryEventIds: [historyEvent.id],
    };
  });

  const actorPairs: Array<[string, string]> = [
    [actorIds[0], actorIds[1]],
    [actorIds[0], actorIds[2]],
    [actorIds[1], actorIds[2]],
  ];
  const relationships: Relationship[] = actorPairs.map((actorPair, index) => {
    const event = rng.pick(history.filter((candidate) => content.relationshipTypes.some(({ compatibleHistoryActionIds }) => compatibleHistoryActionIds.includes(candidate.actionId))));
    const type = rng.pick(content.relationshipTypes.filter(({ compatibleHistoryActionIds }) => compatibleHistoryActionIds.includes(event.actionId)));
    return {
      id: stableRuntimeId("relationship", sceneLabel, index + 1),
      typeId: type.id,
      actorIds: actorPair,
      sharedHistoryEventIds: [event.id],
    };
  });
  traceStep("relationships", relationships.map(({ typeId }) => typeId), "Grounded each actor-pair relationship in a compatible shared event.");

  const reasonByGoalId = new Map(planned.map((motivation, index) => [motivation.goal.id, reasons[index] as Reason]));
  const playerOptions: PlayerGoalReasonOption[] = playerPlans.map((motivation) => ({
    id: motivation.optionId!,
    goal: motivation.goal,
    reason: reasonByGoalId.get(motivation.goal.id)!,
    label: `${content.goals.find(({ id }) => id === motivation.goal.definitionId)?.label}: ${motivation.reasonDefinition.label}`,
  }));

  const roleByIndex = ["PLAYER_ROLE", "COUNTERPART_ROLE", "THIRD_PARTY_ROLE"] as const;
  const zoneByIndex = ["zone_entry", "zone_center", "zone_table"] as const;
  const characters: Character[] = characterDefinitions.map((definition, index) => {
    const npcPlan = index === 0 ? undefined : npcPlans[index - 1];
    return {
      id: actorIds[index] as string,
      definitionId: definition.id,
      entityType: "CHARACTER",
      tags: definition.tags,
      role: roleByIndex[index]!,
      primaryGoalId: npcPlan?.goal.id ?? null,
      reasonId: npcPlan ? reasonByGoalId.get(npcPlan.goal.id)?.id ?? null : null,
      secondaryGoalIds: [],
      baselineVibeId: definition.baselineVibeId,
      active: true,
      zoneId: zoneByIndex[index]!,
    };
  });

  const room = {
    id: "scene_room",
    definitionId: roomDefinition.id,
    entityType: "ROOM" as const,
    tags: [roomDefinition.categoryId],
    categoryId: roomDefinition.categoryId,
    presetId: roomDefinition.id,
    zoneIds: roomDefinition.zones,
  };
  const zoneEntities: Entity[] = roomDefinition.zones.map((id) => ({ id, definitionId: id, entityType: "ZONE", tags: ["room_zone"] }));
  const entities: Entity[] = [
    ...characters.map(({ id, definitionId, entityType, tags }) => ({ id, definitionId, entityType, tags })),
    ...objects.map(({ id, definitionId, entityType, tags }) => ({ id, definitionId, entityType, tags })),
    { id: room.id, definitionId: room.definitionId, entityType: room.entityType, tags: room.tags },
    ...zoneEntities,
  ];

  const trueHolderBelief: Proposition = { subjectId: "primary_object", predicate: "HELD_BY", objectId: actorIds[1] };
  const mistakenHolderBelief: Proposition = { subjectId: "primary_object", predicate: "HELD_BY", objectId: actorIds[0] };
  const beliefs: Belief[] = [
    {
      id: stableRuntimeId("belief", sceneLabel, "holder_correct"),
      actorId: actorIds[1],
      proposition: trueHolderBelief,
      certainty: "CERTAIN",
      sourceEventIds: [history[0]!.id],
    },
    {
      id: stableRuntimeId("belief", sceneLabel, "holder_mistaken"),
      actorId: actorIds[2],
      proposition: mistakenHolderBelief,
      certainty: "UNCERTAIN",
      sourceEventIds: [history[1]!.id],
    },
  ];
  traceStep("belief_asymmetry", beliefs.map(({ id }) => id), "Assigned evidence-linked, conflicting beliefs about one mechanically true proposition.");
  traceStep("possession_ownership", [objects[0]!.holderId!, objects[0]!.ownerId!], "Assigned physical holder and legal/social owner to different actors; neither relation implies the other.");

  const snapshot: RuntimeSnapshot = {
    version: "living_comic_runtime_v0_1",
    sceneId,
    seed,
    beat: 0,
    phase: "PLAYER_MOTIVATION_SELECTION",
    skeletonDefinitionId: skeleton.id,
    entities,
    characters,
    objects,
    room,
    worldFacts: facts,
    beliefs,
    goals: planned.map(({ goal }) => goal),
    reasons,
    obstacles,
    relationships,
    deals: [],
    dealTerms: [],
    obligations: [],
    scenePressure: {
      id: stableRuntimeId("pressure", sceneLabel),
      definitionId: pressureDefinition.id,
      beatsRemaining: pressureDefinition.initialBeatsRemaining,
      active: true,
      targetEntityIds: [skeleton.kind === "EXIT" ? "scene_room" : "primary_object"],
    },
    history,
    stableActorOrder: [...actorIds],
    terminalReason: null,
  };

  traceStep("runtime_snapshot", [sceneId], "Assembled a plain-data runtime snapshot with no hidden mutable generator state.");
  const candidate: SceneCandidate = { snapshot, playerOptions, generationTrace: trace, attempt };
  return {
    candidate,
    selectedDefinitionIds: [
      skeleton.id,
      roomDefinition.id,
      pressureDefinition.id,
      ...characterDefinitions.map(({ id }) => id),
      ...objectDefinitions.map(({ id }) => id),
    ],
  };
};

export function generateScene(seed: number, content: ContentManifest = loadDefaultContent()): GeneratedScene {
  if (!Number.isInteger(seed)) throw new Error("Living Comic seeds must be integers");
  const rejections: GenerationTraceEntry[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const { candidate, selectedDefinitionIds } = buildAttempt(seed, attempt, content, rejections);
      const validation = validateSceneCandidate(candidate, content);
      if (validation.valid) {
        const acceptedTrace = [
          ...candidate.generationTrace,
          {
            step: candidate.generationTrace.length + 1,
            kind: "attempt_accepted",
            selectedIds: [candidate.snapshot.sceneId],
            explanation: `Accepted attempt ${attempt + 1} after every structural and semantic validator check passed.`,
          },
        ];
        return generatedSceneSchema.parse({
          ...candidate,
          generationTrace: acceptedTrace,
          validationTrace: validation.trace,
        });
      }
      rejections.push({
        step: rejections.length + 1,
        kind: "attempt_rejected",
        selectedIds: selectedDefinitionIds,
        explanation: `Rejected attempt ${attempt + 1}: ${validation.issues.join(" | ")}`,
      });
    } catch (error) {
      rejections.push({
        step: rejections.length + 1,
        kind: "attempt_rejected",
        selectedIds: [stableRuntimeId("attempt", attempt + 1)],
        explanation: `Rejected attempt ${attempt + 1} during assembly: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const finalReasons = rejections.slice(-5).map(({ explanation }) => explanation).join(" | ");
  throw new Error(`No valid Living Comic scene found for seed ${seed} after ${MAX_ATTEMPTS} deterministic attempts. Final rejection reasons: ${finalReasons}`);
}

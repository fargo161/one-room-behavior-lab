import { z } from "zod";
import {
  certaintySchema,
  channelSchema,
  functionIdSchema,
  propositionSchema,
  stableIdSchema,
} from "./primitives";

export const worldFactSchema = z.object({
  id: stableIdSchema,
  proposition: propositionSchema,
  truth: z.literal(true),
  sourceHistoryEventIds: z.array(stableIdSchema),
});

export const beliefSchema = z.object({
  id: stableIdSchema,
  actorId: stableIdSchema,
  proposition: propositionSchema,
  certainty: certaintySchema,
  sourceEventIds: z.array(stableIdSchema),
});

export const goalSchema = z.object({
  id: stableIdSchema,
  definitionId: stableIdSchema,
  actorId: stableIdSchema,
  target: propositionSchema,
  primary: z.boolean(),
  obstacleIds: z.array(stableIdSchema).min(1),
});

export const reasonSchema = z.object({
  id: stableIdSchema,
  definitionId: stableIdSchema,
  actorId: stableIdSchema,
  goalId: stableIdSchema,
  groundingHistoryEventIds: z.array(stableIdSchema).min(1),
});

export const obstacleSchema = z.object({
  id: stableIdSchema,
  goalId: stableIdSchema,
  blockingCondition: propositionSchema,
  sourceFactIds: z.array(stableIdSchema).min(1),
});

export const entitySchema = z.object({
  id: stableIdSchema,
  definitionId: stableIdSchema,
  entityType: z.enum(["CHARACTER", "OBJECT", "ROOM", "ZONE", "INFORMATION"]),
  tags: z.array(stableIdSchema),
});

export const characterSchema = entitySchema.extend({
  entityType: z.literal("CHARACTER"),
  role: z.enum(["PLAYER_ROLE", "COUNTERPART_ROLE", "THIRD_PARTY_ROLE"]),
  primaryGoalId: stableIdSchema.nullable(),
  reasonId: stableIdSchema.nullable(),
  secondaryGoalIds: z.array(stableIdSchema),
  baselineVibeId: stableIdSchema,
  active: z.boolean(),
  zoneId: stableIdSchema,
});

export const objectInstanceSchema = entitySchema.extend({
  entityType: z.literal("OBJECT"),
  categoryIds: z.array(stableIdSchema).min(1),
  zoneId: stableIdSchema,
  holderId: stableIdSchema.nullable(),
  ownerId: stableIdSchema.nullable(),
  visible: z.boolean(),
  open: z.boolean().nullable(),
});

export const roomInstanceSchema = entitySchema.extend({
  entityType: z.literal("ROOM"),
  categoryId: stableIdSchema,
  presetId: stableIdSchema,
  zoneIds: z.array(stableIdSchema).min(3),
});

export const relationshipSchema = z.object({
  id: stableIdSchema,
  typeId: stableIdSchema,
  actorIds: z.tuple([stableIdSchema, stableIdSchema]),
  sharedHistoryEventIds: z.array(stableIdSchema).min(1),
});

export const historicalEventSchema = z.object({
  id: stableIdSchema,
  actionId: stableIdSchema,
  actorId: stableIdSchema,
  targetId: stableIdSchema.nullable(),
  locationId: stableIdSchema.nullable(),
  result: propositionSchema,
  secondaryParticipantIds: z.array(stableIdSchema),
});

export const scenePressureSchema = z.object({
  id: stableIdSchema,
  definitionId: stableIdSchema,
  beatsRemaining: z.number().int().min(1),
  active: z.boolean(),
  targetEntityIds: z.array(stableIdSchema).min(1),
});

export const dealTermSchema = z.object({
  id: stableIdSchema,
  responsibleActorId: stableIdSchema,
  desiredChange: propositionSchema,
});

export const dealSchema = z.object({
  id: stableIdSchema,
  proposerId: stableIdSchema,
  recipientId: stableIdSchema,
  requestedTermIds: z.array(stableIdSchema).min(1),
  offeredTermIds: z.array(stableIdSchema).min(1),
  status: z.enum(["PROPOSED", "ACCEPTED", "REJECTED", "SUPERSEDED", "FULFILLED", "BROKEN"]),
  supersedesDealId: stableIdSchema.nullable(),
});

export const obligationSchema = z.object({
  id: stableIdSchema,
  dealId: stableIdSchema,
  termId: stableIdSchema,
  actorId: stableIdSchema,
  status: z.enum(["OPEN", "FULFILLED", "BROKEN"]),
});

const actionBaseSchema = z.object({
  id: stableIdSchema,
  actorId: stableIdSchema,
  intention: z.array(propositionSchema).min(1),
  functionIds: z.array(functionIdSchema).min(1),
});

export const directActionSchema = actionBaseSchema.extend({
  family: z.literal("DIRECT"),
  operationId: stableIdSchema,
  targetId: stableIdSchema,
});

export const socialActionSchema = actionBaseSchema.extend({
  family: z.literal("SOCIAL"),
  tactic: z.enum(["ASK", "PRESSURE", "DEAL"]),
  targetActorId: stableIdSchema,
  messageId: stableIdSchema.nullable(),
});

export const dealResponseActionSchema = actionBaseSchema.extend({
  family: z.literal("DEAL_RESPONSE"),
  response: z.enum(["ACCEPT", "REJECT", "COUNTER"]),
  dealId: stableIdSchema,
  counterDealId: stableIdSchema.nullable(),
});

export const waitActionSchema = z.object({
  id: stableIdSchema,
  actorId: stableIdSchema,
  family: z.literal("WAIT"),
  intention: z.array(propositionSchema).length(0),
  functionIds: z.array(functionIdSchema).length(0),
});

export const actionDraftSchema = z.discriminatedUnion("family", [
  directActionSchema,
  socialActionSchema,
  dealResponseActionSchema,
  waitActionSchema,
]);

export const committedActionSchema = z.object({
  action: actionDraftSchema,
  committedAtBeat: z.number().int().min(1),
  priority: z.number().int().min(1).max(5),
  stableActorOrder: z.number().int().min(0),
});

export const observableEventSchema = z.object({
  id: stableIdSchema,
  beat: z.number().int().min(1),
  sourceActionId: stableIdSchema,
  actorId: stableIdSchema,
  resultPropositions: z.array(propositionSchema),
  channels: z.array(channelSchema).min(1),
  contentPropositionIds: z.array(stableIdSchema),
  salient: z.boolean(),
});

export const perceptionSchema = z.object({
  id: stableIdSchema,
  observerId: stableIdSchema,
  eventId: stableIdSchema,
  channelsReceived: z.array(channelSchema).min(1),
  registeredPropositions: z.array(propositionSchema),
});

export const interpretationSchema = z.object({
  id: stableIdSchema,
  observerId: stableIdSchema,
  perceptionIds: z.array(stableIdSchema).min(1),
  inferredIntention: z.array(propositionSchema),
  inferredFunctionIds: z.array(functionIdSchema),
  inferredGoal: propositionSchema.nullable(),
  inferredReasonId: stableIdSchema.nullable(),
  certainty: certaintySchema,
  evidenceRefs: z.array(stableIdSchema).min(1),
});

export const beliefUpdateSchema = z.object({
  id: stableIdSchema,
  actorId: stableIdSchema,
  priorBeliefId: stableIdSchema.nullable(),
  nextBelief: beliefSchema,
  sourceInterpretationId: stableIdSchema,
});

export const validationTraceEntrySchema = z.object({
  checkId: stableIdSchema,
  passed: z.boolean(),
  message: z.string().min(1),
  refs: z.array(stableIdSchema),
});

export const generationTraceEntrySchema = z.object({
  step: z.number().int().min(1),
  kind: stableIdSchema,
  selectedIds: z.array(stableIdSchema),
  explanation: z.string().min(1),
});

export const playerGoalReasonOptionSchema = z.object({
  id: stableIdSchema,
  goal: goalSchema,
  reason: reasonSchema,
  label: z.string().min(1),
});

export const runtimeSnapshotSchema = z.object({
  version: z.literal("living_comic_runtime_v0_1"),
  sceneId: stableIdSchema,
  seed: z.number().int(),
  beat: z.number().int().min(0),
  phase: z.enum(["PLAYER_MOTIVATION_SELECTION", "PLAYER_DRAFT", "TERMINAL"]),
  skeletonDefinitionId: stableIdSchema,
  entities: z.array(entitySchema),
  characters: z.array(characterSchema).length(3),
  objects: z.array(objectInstanceSchema).min(1).max(3),
  room: roomInstanceSchema,
  worldFacts: z.array(worldFactSchema),
  beliefs: z.array(beliefSchema),
  goals: z.array(goalSchema),
  reasons: z.array(reasonSchema),
  obstacles: z.array(obstacleSchema),
  relationships: z.array(relationshipSchema).length(3),
  deals: z.array(dealSchema),
  dealTerms: z.array(dealTermSchema),
  obligations: z.array(obligationSchema),
  scenePressure: scenePressureSchema,
  history: z.array(historicalEventSchema).min(2).max(4),
  stableActorOrder: z.array(stableIdSchema).length(3),
  terminalReason: z.string().nullable(),
});

export const beatResolutionReportSchema = z.object({
  beat: z.number().int().min(1),
  committedActions: z.array(committedActionSchema),
  stateChanges: z.array(propositionSchema),
  observableEvents: z.array(observableEventSchema),
  perceptions: z.array(perceptionSchema),
  interpretations: z.array(interpretationSchema),
  beliefUpdates: z.array(beliefUpdateSchema),
  historyPromotionIds: z.array(stableIdSchema),
  terminalReason: z.string().nullable(),
});

export const presentationViewModelSchema = z.object({
  sceneId: stableIdSchema,
  beat: z.number().int().min(0),
  roomLabel: z.string().min(1),
  visibleEntityIds: z.array(stableIdSchema),
  knownPropositions: z.array(propositionSchema),
  noticedEventIds: z.array(stableIdSchema),
  openDealIds: z.array(stableIdSchema),
  resultPanelIds: z.array(stableIdSchema),
  terminalSummary: z.string().nullable(),
});

export const generatedSceneSchema = z.object({
  snapshot: runtimeSnapshotSchema,
  playerOptions: z.array(playerGoalReasonOptionSchema).min(2).max(3),
  generationTrace: z.array(generationTraceEntrySchema).min(10),
  validationTrace: z.array(validationTraceEntrySchema).min(8),
  attempt: z.number().int().min(0),
});

export type WorldFact = z.infer<typeof worldFactSchema>;
export type Belief = z.infer<typeof beliefSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Reason = z.infer<typeof reasonSchema>;
export type Obstacle = z.infer<typeof obstacleSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Character = z.infer<typeof characterSchema>;
export type ObjectInstance = z.infer<typeof objectInstanceSchema>;
export type RoomInstance = z.infer<typeof roomInstanceSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type HistoricalEvent = z.infer<typeof historicalEventSchema>;
export type ScenePressure = z.infer<typeof scenePressureSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type DealTerm = z.infer<typeof dealTermSchema>;
export type Obligation = z.infer<typeof obligationSchema>;
export type ActionDraft = z.infer<typeof actionDraftSchema>;
export type CommittedAction = z.infer<typeof committedActionSchema>;
export type DirectAction = z.infer<typeof directActionSchema>;
export type SocialAction = z.infer<typeof socialActionSchema>;
export type DealResponseAction = z.infer<typeof dealResponseActionSchema>;
export type WaitAction = z.infer<typeof waitActionSchema>;
export type ObservableEvent = z.infer<typeof observableEventSchema>;
export type Perception = z.infer<typeof perceptionSchema>;
export type Interpretation = z.infer<typeof interpretationSchema>;
export type BeliefUpdate = z.infer<typeof beliefUpdateSchema>;
export type RuntimeSnapshot = z.infer<typeof runtimeSnapshotSchema>;
export type BeatResolutionReport = z.infer<typeof beatResolutionReportSchema>;
export type PresentationViewModel = z.infer<typeof presentationViewModelSchema>;
export type PlayerGoalReasonOption = z.infer<typeof playerGoalReasonOptionSchema>;
export type ValidationTraceEntry = z.infer<typeof validationTraceEntrySchema>;
export type GenerationTraceEntry = z.infer<typeof generationTraceEntrySchema>;
export type GeneratedScene = z.infer<typeof generatedSceneSchema>;

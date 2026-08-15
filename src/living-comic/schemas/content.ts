import { z } from "zod";
import {
  displayLabelSchema,
  functionIdSchema,
  propositionTemplateSchema,
  stableIdSchema,
} from "./primitives";

const idList = z.array(stableIdSchema).min(1);

export const characterDefinitionSchema = z.object({
  id: stableIdSchema,
  displayName: displayLabelSchema,
  description: displayLabelSchema,
  baselineVibeId: stableIdSchema,
  tags: z.array(stableIdSchema).min(1),
});

export const goalDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  compatibleSkeletonIds: idList,
  targetTemplate: propositionTemplateSchema,
  obstacleTemplate: propositionTemplateSchema,
  compatibleObjectCategoryIds: z.array(stableIdSchema),
});

export const secondaryGoalDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  targetTemplate: propositionTemplateSchema,
});

export const reasonDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  compatibleGoalIds: idList,
  groundingHistoryActionIds: idList,
  tags: z.array(stableIdSchema).min(1),
});

export const objectCategoryDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  affordances: z.array(stableIdSchema).min(1),
});

export const objectDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  categoryIds: idList,
  portableAssetId: stableIdSchema,
  tags: z.array(stableIdSchema).min(1),
});

export const roomCategoryDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  affordances: z.array(stableIdSchema).min(1),
});

export const roomPresetDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  categoryId: stableIdSchema,
  zones: idList,
  portableAssetId: stableIdSchema,
});

export const relationshipTypeDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  compatibleHistoryActionIds: idList,
});

export const historyActionDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  requiresTarget: z.boolean(),
  supportsLocation: z.boolean(),
});

export const conflictSkeletonDefinitionSchema = z.object({
  id: stableIdSchema,
  kind: z.enum(["CONTROL", "CONCEALMENT", "ACCESS", "DISCLOSURE", "EXIT"]),
  label: displayLabelSchema,
  requiredActorRoles: z.tuple([
    z.literal("PLAYER_ROLE"),
    z.literal("COUNTERPART_ROLE"),
    z.literal("THIRD_PARTY_ROLE"),
  ]),
  requiredNarrativeRoles: idList,
  compatibleGoalIds: idList,
  compatibleObstaclePredicates: z.array(z.string()).min(1),
  requiredObjectCategoryIds: z.array(stableIdSchema),
  compatibleRoomCategoryIds: idList,
  informationAsymmetryRequired: z.literal(true),
  terminalPredicateTemplates: z.array(propositionTemplateSchema).min(1),
});

export const scenePressureDefinitionSchema = z.object({
  id: stableIdSchema,
  label: displayLabelSchema,
  compatibleSkeletonIds: idList,
  initialBeatsRemaining: z.number().int().min(2).max(10),
  tickEventPredicate: z.string().regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/),
  terminalPredicateTemplate: propositionTemplateSchema,
});

export const basedVibeDefinitionSchema = z.object({
  id: stableIdSchema,
  code: z.enum(["AB", "AS", "SD", "SE", "EB", "AD", "DB", "DE"]),
  name: displayLabelSchema,
  lexicalStyle: displayLabelSchema,
  sentenceForm: displayLabelSchema,
  directness: z.enum(["LOW", "MEDIUM", "HIGH"]),
  intensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  paralanguageCueIds: idList,
  poseId: stableIdSchema,
  faceId: stableIdSchema,
  balloonId: stableIdSchema,
  interpretationCueIds: idList,
});

export const presentationDefinitionsSchema = z.object({
  faces: z.array(z.object({ id: stableIdSchema, label: displayLabelSchema })).min(6),
  poses: z.array(z.object({ id: stableIdSchema, label: displayLabelSchema })).min(6),
  balloons: z.array(z.object({ id: stableIdSchema, label: displayLabelSchema })).min(5),
  paralanguage: z.array(z.object({ id: stableIdSchema, label: displayLabelSchema })).min(5),
});

export const directActionDefinitionSchema = z.object({
  id: stableIdSchema,
  operation: z.enum([
    "TAKE",
    "OFFER_OBJECT",
    "SHOW",
    "HIDE",
    "OPEN",
    "CLOSE",
    "APPROACH",
    "WITHDRAW",
    "LEAVE",
  ]),
  label: displayLabelSchema,
  compatibleFunctions: z.array(functionIdSchema).min(1),
  targetTypes: z.array(z.enum(["ACTOR", "OBJECT", "ROOM", "ZONE"])).min(1),
  resultPredicates: z.array(z.string()).min(1),
  possessionTransferPolicy: z.enum(["NONE", "REQUIRES_ACCEPTANCE"]),
  ownershipTransferPolicy: z.literal("EXPLICIT_RULE_ONLY"),
});

export const messageFragmentPoolSchema = z.object({
  id: stableIdSchema,
  tactic: z.enum(["ASK", "PRESSURE", "DEAL"]),
  fragments: z.array(displayLabelSchema).min(3),
});

export const contentManifestSchema = z.object({
  version: z.literal("living_comic_content_v0_1"),
  characters: z.array(characterDefinitionSchema).min(5),
  goals: z.array(goalDefinitionSchema).min(8),
  secondaryGoals: z.array(secondaryGoalDefinitionSchema).min(3),
  reasons: z.array(reasonDefinitionSchema).min(8),
  conflictSkeletons: z.array(conflictSkeletonDefinitionSchema).length(5),
  objectCategories: z.array(objectCategoryDefinitionSchema).length(6),
  objects: z.array(objectDefinitionSchema).min(6),
  roomCategories: z.array(roomCategoryDefinitionSchema).length(3),
  roomPresets: z.array(roomPresetDefinitionSchema).min(3),
  relationshipTypes: z.array(relationshipTypeDefinitionSchema).min(5),
  historyActions: z.array(historyActionDefinitionSchema).min(12),
  scenePressures: z.array(scenePressureDefinitionSchema).min(4),
  basedVibes: z.array(basedVibeDefinitionSchema).length(8),
  presentation: presentationDefinitionsSchema,
  directActions: z.array(directActionDefinitionSchema).min(9),
  messageFragments: z.array(messageFragmentPoolSchema).min(3),
});

export type ContentManifest = z.infer<typeof contentManifestSchema>;
export type CharacterDefinition = z.infer<typeof characterDefinitionSchema>;
export type GoalDefinition = z.infer<typeof goalDefinitionSchema>;
export type ReasonDefinition = z.infer<typeof reasonDefinitionSchema>;
export type ConflictSkeletonDefinition = z.infer<typeof conflictSkeletonDefinitionSchema>;
export type ObjectDefinition = z.infer<typeof objectDefinitionSchema>;
export type RoomPresetDefinition = z.infer<typeof roomPresetDefinitionSchema>;

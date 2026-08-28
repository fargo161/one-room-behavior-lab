import { z } from "zod";
import { stableIdSchema } from "../schemas";

export const encounterDimensionSchema = z.enum(["trust", "tension"]);
export const encounterMoodSchema = z.enum(["neutral", "guarded", "angry", "agreement"]);
export const encounterOutcomeSchema = z.enum(["deal", "walk_away", "argument"]);

export const encounterConditionSchema = z.object({
  dimension: encounterDimensionSchema,
  comparison: z.enum(["GTE", "LTE"]),
  value: z.number().int(),
});

export const encounterEffectSchema = z.object({
  trust: z.number().int(),
  tension: z.number().int(),
});

export const encounterDialogueVariantSchema = z.object({
  id: stableIdSchema,
  text: z.string().min(1),
  when: z.array(encounterConditionSchema).min(1).optional(),
});

export const encounterChoiceSchema = z.object({
  id: stableIdSchema,
  text: z.string().min(1),
  effect: encounterEffectSchema,
});

export const encounterRoundSchema = z.object({
  id: stableIdSchema,
  ordinal: z.number().int().min(1).max(3),
  dialogue: z.array(encounterDialogueVariantSchema).min(1),
  choices: z.array(encounterChoiceSchema).length(3),
});

export const encounterEndingSchema = z.object({
  id: stableIdSchema,
  outcome: encounterOutcomeSchema,
  title: z.string().min(1),
  text: z.string().min(1),
  forcedMood: encounterMoodSchema.optional(),
  when: z.array(encounterConditionSchema).min(1).optional(),
});

export const encounterDefinitionSchema = z.object({
  version: z.literal("trapstar_npc_encounter_v0_1"),
  id: stableIdSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  npc: z.object({
    id: stableIdSchema,
    name: z.string().min(1),
  }),
  initialState: z.object({
    trust: z.number().int(),
    tension: z.number().int(),
  }),
  bounds: z.object({
    trust: z.object({ min: z.number().int(), max: z.number().int() }),
    tension: z.object({ min: z.number().int(), max: z.number().int() }),
  }),
  moodRules: z.array(z.object({
    mood: encounterMoodSchema,
    when: z.array(encounterConditionSchema).min(1),
  })).min(1),
  defaultMood: encounterMoodSchema,
  rounds: z.array(encounterRoundSchema).length(3),
  endings: z.array(encounterEndingSchema).length(3),
});

export const encounterEffectResultSchema = z.object({
  choiceId: stableIdSchema,
  authored: encounterEffectSchema,
  applied: encounterEffectSchema,
});

export const encounterStateSchema = z.object({
  version: z.literal("trapstar_npc_state_v0_1"),
  encounterId: stableIdSchema,
  stateId: stableIdSchema,
  roundIndex: z.number().int().min(0).max(3),
  trust: z.number().int(),
  tension: z.number().int(),
  mood: encounterMoodSchema,
  status: z.enum(["ACTIVE", "COMPLETE"]),
  endingId: stableIdSchema.nullable(),
  latestEffect: encounterEffectResultSchema.nullable(),
});

export type EncounterCondition = z.infer<typeof encounterConditionSchema>;
export type EncounterDefinition = z.infer<typeof encounterDefinitionSchema>;
export type EncounterDialogueVariant = z.infer<typeof encounterDialogueVariantSchema>;
export type EncounterEffect = z.infer<typeof encounterEffectSchema>;
export type EncounterEffectResult = z.infer<typeof encounterEffectResultSchema>;
export type EncounterEnding = z.infer<typeof encounterEndingSchema>;
export type EncounterMood = z.infer<typeof encounterMoodSchema>;
export type EncounterRound = z.infer<typeof encounterRoundSchema>;
export type EncounterState = z.infer<typeof encounterStateSchema>;

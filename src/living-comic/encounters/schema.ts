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
  intentLabel: z.string().min(1),
  outcomeInterpretation: z.string().min(1),
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
  outcomeLead: z.string().min(1),
  forcedMood: encounterMoodSchema.optional(),
  when: z.array(encounterConditionSchema).min(1).optional(),
});

export const encounterSetupSchema = z.object({
  location: z.string().min(1),
  time: z.string().min(1),
  problem: z.string().min(1),
  debt: z.string().min(1),
  payment: z.string().min(1),
  stakes: z.string().min(1),
  objective: z.string().min(1),
  ctaLabel: z.string().min(1),
});

export const encounterDefinitionSchema = z.object({
  version: z.literal("trapstar_npc_encounter_v0_1_1"),
  id: stableIdSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  setup: encounterSetupSchema,
  npc: z.object({
    id: stableIdSchema,
    name: z.string().min(1),
    role: z.string().min(1),
    motive: z.string().min(1),
    vulnerability: z.string().min(1),
    verbalHabit: z.string().min(1),
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
  version: z.literal("trapstar_npc_state_v0_1_1"),
  encounterId: stableIdSchema,
  stateId: stableIdSchema,
  roundIndex: z.number().int().min(0).max(3),
  trust: z.number().int(),
  tension: z.number().int(),
  mood: encounterMoodSchema,
  status: z.enum(["ACTIVE", "COMPLETE"]),
  endingId: stableIdSchema.nullable(),
  latestEffect: encounterEffectResultSchema.nullable(),
  selectedChoiceIds: z.array(stableIdSchema).max(3),
}).superRefine((state, context) => {
  if (new Set(state.selectedChoiceIds).size !== state.selectedChoiceIds.length) {
    context.addIssue({
      code: "custom",
      path: ["selectedChoiceIds"],
      message: "Encounter choice paths cannot contain duplicate IDs.",
    });
  }

  if (state.status === "ACTIVE") {
    if (state.roundIndex >= 3 || state.endingId !== null || state.selectedChoiceIds.length !== state.roundIndex) {
      context.addIssue({
        code: "custom",
        path: ["selectedChoiceIds"],
        message: "Active encounter path must match the current round and have no ending.",
      });
    }
    return;
  }

  if (state.roundIndex !== 3 || state.endingId === null || state.selectedChoiceIds.length !== 3) {
    context.addIssue({
      code: "custom",
      path: ["selectedChoiceIds"],
      message: "Completed encounter path must contain exactly three choices and an ending.",
    });
  }
});

export type ChoiceId = z.infer<typeof stableIdSchema>;
export type EncounterChoice = z.infer<typeof encounterChoiceSchema>;
export type EncounterCondition = z.infer<typeof encounterConditionSchema>;
export type EncounterDefinition = z.infer<typeof encounterDefinitionSchema>;
export type EncounterDialogueVariant = z.infer<typeof encounterDialogueVariantSchema>;
export type EncounterEffect = z.infer<typeof encounterEffectSchema>;
export type EncounterEffectResult = z.infer<typeof encounterEffectResultSchema>;
export type EncounterEnding = z.infer<typeof encounterEndingSchema>;
export type EncounterMood = z.infer<typeof encounterMoodSchema>;
export type EncounterRound = z.infer<typeof encounterRoundSchema>;
export type EncounterState = z.infer<typeof encounterStateSchema>;

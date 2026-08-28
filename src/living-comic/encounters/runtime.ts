import { stableRuntimeId } from "../core/ids";
import {
  encounterStateSchema,
  type ChoiceId,
  type EncounterChoice,
  type EncounterCondition,
  type EncounterDefinition,
  type EncounterDialogueVariant,
  type EncounterEffectResult,
  type EncounterEnding,
  type EncounterMood,
  type EncounterRound,
  type EncounterState,
} from "./schema";

type EncounterValues = Pick<EncounterState, "trust" | "tension">;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const signedValueId = (value: number): string => value < 0 ? `negative_${Math.abs(value)}` : `nonnegative_${value}`;

const valueFor = (values: EncounterValues, condition: EncounterCondition): number => values[condition.dimension];

export function conditionMatches(values: EncounterValues, condition: EncounterCondition): boolean {
  const value = valueFor(values, condition);
  return condition.comparison === "GTE" ? value >= condition.value : value <= condition.value;
}

const conditionsMatch = (values: EncounterValues, conditions?: EncounterCondition[]): boolean =>
  conditions === undefined || conditions.every((condition) => conditionMatches(values, condition));

export function resolveEncounterMood(
  definition: EncounterDefinition,
  values: EncounterValues,
): EncounterMood {
  return definition.moodRules.find((rule) => conditionsMatch(values, rule.when))?.mood
    ?? definition.defaultMood;
}

export function currentEncounterRound(
  definition: EncounterDefinition,
  state: EncounterState,
): EncounterRound | null {
  return state.status === "ACTIVE" ? definition.rounds[state.roundIndex] ?? null : null;
}

export function currentEncounterDialogue(
  definition: EncounterDefinition,
  state: EncounterState,
): EncounterDialogueVariant {
  const round = currentEncounterRound(definition, state);
  if (!round) throw new Error("A completed encounter has no active dialogue round.");
  const selected = round.dialogue.find((variant) => conditionsMatch(state, variant.when));
  if (!selected) throw new Error(`Encounter round ${round.id} has no matching dialogue fallback.`);
  return selected;
}

export function currentEncounterEnding(
  definition: EncounterDefinition,
  state: EncounterState,
): EncounterEnding | null {
  if (state.status !== "COMPLETE" || !state.endingId) return null;
  const ending = definition.endings.find(({ id }) => id === state.endingId);
  if (!ending) throw new Error(`Unknown encounter ending ${state.endingId}.`);
  return ending;
}

export function selectedEncounterChoices(
  definition: EncounterDefinition,
  state: EncounterState,
): EncounterChoice[] {
  return state.selectedChoiceIds.map((choiceId, roundIndex) => {
    const choice = definition.rounds[roundIndex]?.choices.find(({ id }) => id === choiceId);
    if (!choice) {
      throw new Error(`Choice ${choiceId} is not valid for prior round ${roundIndex + 1}.`);
    }
    return choice;
  });
}

function selectEnding(definition: EncounterDefinition, values: EncounterValues): EncounterEnding {
  const ending = definition.endings.find((candidate) => conditionsMatch(values, candidate.when));
  if (!ending) throw new Error(`Encounter ${definition.id} has no matching ending fallback.`);
  return ending;
}

function makeStateId(
  definition: EncounterDefinition,
  state: Omit<EncounterState, "stateId" | "version" | "encounterId">,
): string {
  const nodeId = state.status === "ACTIVE"
    ? definition.rounds[state.roundIndex]?.id ?? "missing_round"
    : state.endingId ?? "missing_ending";
  const pathSegments = state.selectedChoiceIds.flatMap((choiceId, index) => [
    `choice_${index + 1}`,
    choiceId,
  ]);

  return stableRuntimeId(
    "npc_state",
    "v0_1_1",
    definition.id,
    state.status,
    nodeId,
    "trust",
    signedValueId(state.trust),
    "tension",
    signedValueId(state.tension),
    "path_length",
    state.selectedChoiceIds.length,
    ...pathSegments,
  );
}

function finalizeState(
  definition: EncounterDefinition,
  state: Omit<EncounterState, "stateId" | "version" | "encounterId">,
): EncounterState {
  return encounterStateSchema.parse({
    version: "trapstar_npc_state_v0_1_1",
    encounterId: definition.id,
    ...state,
    stateId: makeStateId(definition, state),
  });
}

export function createInitialEncounterState(definition: EncounterDefinition): EncounterState {
  const { trust, tension } = definition.initialState;
  return finalizeState(definition, {
    roundIndex: 0,
    trust,
    tension,
    mood: resolveEncounterMood(definition, { trust, tension }),
    status: "ACTIVE",
    endingId: null,
    latestEffect: null,
    selectedChoiceIds: [],
  });
}

export function applyEncounterChoice(
  definition: EncounterDefinition,
  state: EncounterState,
  choiceId: ChoiceId,
): EncounterState {
  const currentState = encounterStateSchema.parse(state);
  if (currentState.encounterId !== definition.id) throw new Error("Encounter state belongs to another definition.");
  if (currentState.status !== "ACTIVE") throw new Error("Restart the encounter before applying another choice.");

  selectedEncounterChoices(definition, currentState);
  const round = currentEncounterRound(definition, currentState);
  if (!round) throw new Error(`Encounter round index ${currentState.roundIndex} is invalid.`);
  const choice = round.choices.find(({ id }) => id === choiceId);
  if (!choice) throw new Error(`Choice ${choiceId} is not valid for ${round.id}.`);

  const trust = clamp(
    currentState.trust + choice.effect.trust,
    definition.bounds.trust.min,
    definition.bounds.trust.max,
  );
  const tension = clamp(
    currentState.tension + choice.effect.tension,
    definition.bounds.tension.min,
    definition.bounds.tension.max,
  );
  const latestEffect: EncounterEffectResult = {
    choiceId: choice.id,
    authored: { ...choice.effect },
    applied: { trust: trust - currentState.trust, tension: tension - currentState.tension },
  };
  const roundIndex = currentState.roundIndex + 1;
  const selectedChoiceIds = [...currentState.selectedChoiceIds, choice.id];

  if (roundIndex === definition.rounds.length) {
    const ending = selectEnding(definition, { trust, tension });
    return finalizeState(definition, {
      roundIndex,
      trust,
      tension,
      mood: ending.forcedMood ?? resolveEncounterMood(definition, { trust, tension }),
      status: "COMPLETE",
      endingId: ending.id,
      latestEffect,
      selectedChoiceIds,
    });
  }

  return finalizeState(definition, {
    roundIndex,
    trust,
    tension,
    mood: resolveEncounterMood(definition, { trust, tension }),
    status: "ACTIVE",
    endingId: null,
    latestEffect,
    selectedChoiceIds,
  });
}

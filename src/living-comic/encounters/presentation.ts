import {
  currentEncounterDialogue,
  currentEncounterEnding,
  currentEncounterRound,
  selectedEncounterChoices,
} from "./runtime";
import type {
  ChoiceId,
  EncounterCondition,
  EncounterDefinition,
  EncounterEffect,
  EncounterEnding,
  EncounterMood,
  EncounterState,
} from "./schema";

const signed = (value: number): string => value > 0 ? `+${value}` : String(value);

const effectLabel = (effect: EncounterEffect): string =>
  `Trust ${signed(effect.trust)} · Tension ${signed(effect.tension)}`;

const outcomeLabel = (ending: EncounterEnding): string => {
  if (ending.outcome === "walk_away") return "Walk-away";
  return ending.outcome.charAt(0).toUpperCase() + ending.outcome.slice(1);
};

const conditionLabel = (condition: EncounterCondition): string => {
  const dimension = condition.dimension.charAt(0).toUpperCase() + condition.dimension.slice(1);
  const comparison = condition.comparison === "GTE" ? ">=" : "<=";
  return `${dimension} ${comparison} ${condition.value}`;
};

const endingRuleLabel = (ending: EncounterEnding, index: number): string => {
  if (!ending.when) return `Else → ${outcomeLabel(ending)}`;
  const conditions = ending.when.map(conditionLabel).join(" and ");
  return `${index === 0 ? "" : "Else "}${conditions} → ${outcomeLabel(ending)}`;
};

export interface EncounterPlayerView {
  encounterId: string;
  setup: {
    location: string;
    time: string;
    problem: string;
    debt: string;
    payment: string;
    stakes: string;
    objective: string;
    ctaLabel: string;
  };
  npc: {
    id: string;
    name: string;
    role: string;
    visualMoodToken: EncounterMood;
  };
  nodeId: string;
  dialogue: string;
  choices: Array<{ id: ChoiceId; text: string; intentLabel: string }>;
  ending: {
    id: string;
    title: string;
    outcomeLead: string;
    factors: string[];
  } | null;
}

export interface EncounterDesignerView {
  trust: number;
  tension: number;
  mood: EncounterMood;
  currentRound: string;
  status: EncounterState["status"];
  currentNodeId: string;
  latestStateEffect: string;
  appliedStateEffect: string;
  selectedChoiceIds: ChoiceId[];
  intentPath: string[];
  matchedOutcome: string;
  endingRulePrecedence: string[];
  matchedEndingRule: string;
  boundaryNote: string;
}

export function buildEncounterPlayerView(
  definition: EncounterDefinition,
  state: EncounterState,
): EncounterPlayerView {
  const ending = currentEncounterEnding(definition, state);
  if (ending) {
    const factors = selectedEncounterChoices(definition, state)
      .map(({ outcomeInterpretation }) => outcomeInterpretation);
    return {
      encounterId: definition.id,
      setup: { ...definition.setup },
      npc: {
        id: definition.npc.id,
        name: definition.npc.name,
        role: definition.npc.role,
        visualMoodToken: state.mood,
      },
      nodeId: ending.id,
      dialogue: ending.text,
      choices: [],
      ending: {
        id: ending.id,
        title: ending.title,
        outcomeLead: ending.outcomeLead,
        factors,
      },
    };
  }

  const round = currentEncounterRound(definition, state);
  if (!round) throw new Error("Active encounter is missing its current round.");
  const dialogue = currentEncounterDialogue(definition, state);
  return {
    encounterId: definition.id,
    setup: { ...definition.setup },
    npc: {
      id: definition.npc.id,
      name: definition.npc.name,
      role: definition.npc.role,
      visualMoodToken: state.mood,
    },
    nodeId: dialogue.id,
    dialogue: dialogue.text,
    choices: round.choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
      intentLabel: choice.intentLabel,
    })),
    ending: null,
  };
}

export function buildEncounterDesignerView(
  definition: EncounterDefinition,
  state: EncounterState,
): EncounterDesignerView {
  const ending = currentEncounterEnding(definition, state);
  const round = currentEncounterRound(definition, state);
  const dialogue = round ? currentEncounterDialogue(definition, state) : null;
  const endingRulePrecedence = definition.endings.map(endingRuleLabel);
  const matchedEndingIndex = ending
    ? definition.endings.findIndex(({ id }) => id === ending.id)
    : -1;

  return {
    trust: state.trust,
    tension: state.tension,
    mood: state.mood,
    currentRound: ending ? "Ending" : `${round?.ordinal ?? 0} / ${definition.rounds.length}`,
    status: state.status,
    currentNodeId: ending?.id ?? dialogue?.id ?? "missing_node",
    latestStateEffect: state.latestEffect ? effectLabel(state.latestEffect.authored) : "No choice applied yet",
    appliedStateEffect: state.latestEffect ? effectLabel(state.latestEffect.applied) : "No choice applied yet",
    selectedChoiceIds: [...state.selectedChoiceIds],
    intentPath: selectedEncounterChoices(definition, state).map(({ intentLabel }) => intentLabel),
    matchedOutcome: ending ? outcomeLabel(ending) : "Pending",
    endingRulePrecedence,
    matchedEndingRule: matchedEndingIndex >= 0
      ? endingRulePrecedence[matchedEndingIndex]!
      : "Not evaluated — encounter active",
    boundaryNote: "Encounter-local metrics; not Living Comic Belief, Scene Pressure, or History.",
  };
}

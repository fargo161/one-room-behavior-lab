import {
  currentEncounterDialogue,
  currentEncounterEnding,
  currentEncounterRound,
} from "./runtime";
import type {
  EncounterDefinition,
  EncounterEffect,
  EncounterMood,
  EncounterState,
} from "./schema";

const signed = (value: number): string => value > 0 ? `+${value}` : String(value);

const effectLabel = (effect: EncounterEffect): string =>
  `Trust ${signed(effect.trust)} · Tension ${signed(effect.tension)}`;

export interface EncounterPlayerView {
  encounterId: string;
  title: string;
  subtitle: string;
  npc: { id: string; name: string; mood: EncounterMood };
  nodeId: string;
  progressLabel: string;
  dialogue: string;
  choices: Array<{ id: string; ordinal: number; text: string }>;
  ending: { id: string; outcome: string; title: string } | null;
}

export interface EncounterDesignerView {
  trust: number;
  tension: number;
  mood: EncounterMood;
  currentRound: string;
  currentNodeId: string;
  latestStateEffect: string;
  appliedStateEffect: string;
}

export function buildEncounterPlayerView(
  definition: EncounterDefinition,
  state: EncounterState,
): EncounterPlayerView {
  const ending = currentEncounterEnding(definition, state);
  if (ending) {
    return {
      encounterId: definition.id,
      title: definition.title,
      subtitle: definition.subtitle,
      npc: { ...definition.npc, mood: state.mood },
      nodeId: ending.id,
      progressLabel: "Outcome",
      dialogue: ending.text,
      choices: [],
      ending: { id: ending.id, outcome: ending.outcome, title: ending.title },
    };
  }

  const round = currentEncounterRound(definition, state);
  if (!round) throw new Error("Active encounter is missing its current round.");
  const dialogue = currentEncounterDialogue(definition, state);
  return {
    encounterId: definition.id,
    title: definition.title,
    subtitle: definition.subtitle,
    npc: { ...definition.npc, mood: state.mood },
    nodeId: dialogue.id,
    progressLabel: `Round ${round.ordinal} of ${definition.rounds.length}`,
    dialogue: dialogue.text,
    choices: round.choices.map((choice, index) => ({
      id: choice.id,
      ordinal: index + 1,
      text: choice.text,
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
  return {
    trust: state.trust,
    tension: state.tension,
    mood: state.mood,
    currentRound: ending ? "Ending" : `${round?.ordinal ?? 0} / ${definition.rounds.length}`,
    currentNodeId: ending?.id ?? dialogue?.id ?? "missing_node",
    latestStateEffect: state.latestEffect ? effectLabel(state.latestEffect.authored) : "No choice applied yet",
    appliedStateEffect: state.latestEffect ? effectLabel(state.latestEffect.applied) : "No choice applied yet",
  };
}

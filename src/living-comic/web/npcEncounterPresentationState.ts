import { createInitialEncounterState } from "../encounters/runtime";
import type { EncounterDefinition, EncounterState } from "../encounters/schema";

export interface NpcEncounterPresentationState {
  entered: boolean;
  designerOpen: boolean;
}

export interface NpcEncounterSessionState {
  encounterState: EncounterState;
  presentationState: NpcEncounterPresentationState;
}

export function createInitialNpcEncounterPresentationState(): NpcEncounterPresentationState {
  return { entered: false, designerOpen: false };
}

export function enterNpcEncounterPresentation(
  current: NpcEncounterPresentationState,
): NpcEncounterPresentationState {
  return { ...current, entered: true };
}

export function enterNpcEncounterSession(
  encounterState: EncounterState,
  presentationState: NpcEncounterPresentationState,
): NpcEncounterSessionState {
  return {
    encounterState,
    presentationState: enterNpcEncounterPresentation(presentationState),
  };
}

export function restartNpcEncounterSession(
  definition: EncounterDefinition,
): NpcEncounterSessionState {
  return {
    encounterState: createInitialEncounterState(definition),
    presentationState: createInitialNpcEncounterPresentationState(),
  };
}

export function setNpcEncounterDesignerOpen(
  current: NpcEncounterPresentationState,
  designerOpen: boolean,
): NpcEncounterPresentationState {
  return { ...current, designerOpen };
}

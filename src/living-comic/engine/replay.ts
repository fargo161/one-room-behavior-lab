import type { ContentManifest } from "../schemas";
import type { LivingComicEngineState, ReplaySpecV01 } from "../actions";
import { resolveBeat } from "./beat";

export function createReplaySpec(state: LivingComicEngineState): ReplaySpecV01 {
  return structuredClone(state.replay);
}

export function replayFromSpec(spec: ReplaySpecV01, content: ContentManifest): LivingComicEngineState {
  if (spec.version !== "living_comic_replay_v0_1") throw new Error(`Unsupported replay version: ${spec.version}`);
  if (spec.initialSnapshot.seed !== spec.seed) throw new Error("Replay seed does not match its canonical initial snapshot");
  if (spec.initialSnapshot.phase !== "PLAYER_DRAFT" || spec.initialSnapshot.beat !== 0) {
    throw new Error("Replay initialSnapshot must be the canonical post-selection pre-Beat state");
  }
  let state: LivingComicEngineState = {
    snapshot: structuredClone(spec.initialSnapshot),
    reports: [],
    replay: {
      ...structuredClone(spec),
      playerPackages: [],
    },
  };
  for (const playerPackage of spec.playerPackages) {
    state = resolveBeat(state, structuredClone(playerPackage), content);
  }
  return state;
}

import type { EnvironmentLayer } from "../model/types";

export const SCENE_CANVAS = { width: 1448, height: 1086 } as const;

export function scaledEnvironmentSize(layer: EnvironmentLayer) {
  return { width: layer.width * layer.scale, height: layer.height * layer.scale };
}

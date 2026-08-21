import type { ActorPlacement, EnvironmentLayer } from "../model/types";

export type RenderLayer = { kind: "environment"; depth: number; id: string; layer: EnvironmentLayer } | { kind: "actor"; depth: number; id: string; actor: ActorPlacement };
export function orderedLayers(actors: ActorPlacement[], environment: EnvironmentLayer[]): RenderLayer[] {
  return [
    ...environment.map(layer => ({ kind: "environment" as const, depth: layer.depth, id: `env_${layer.id}`, layer })),
    ...actors.filter(actor => actor.visible && actor.characterId).map(actor => ({ kind: "actor" as const, depth: actor.depth, id: actor.slotId, actor })),
  ].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
}

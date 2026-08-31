import { goosePack } from "./goose";
import { marcusPack } from "./marcus";
import type { CharacterPackAsset, CharacterPackId, ExpressionCharacterPack } from "./types";

export const characterPacks = [marcusPack, goosePack] as const;
export const characterPacksById: ReadonlyMap<CharacterPackId, ExpressionCharacterPack> = new Map(
  characterPacks.map(pack => [pack.id, pack]),
);

export function isCharacterPackId(value: unknown): value is CharacterPackId {
  return value === "marcus" || value === "goose";
}

export function getCharacterPack(id: CharacterPackId): ExpressionCharacterPack {
  const pack = characterPacksById.get(id);
  if (!pack) throw new Error(`Character pack is not installed: ${id}`);
  return pack;
}

export function findCharacterAsset(packId: CharacterPackId, assetId: string | null | undefined): CharacterPackAsset | undefined {
  return assetId ? getCharacterPack(packId).assetsById.get(assetId) : undefined;
}

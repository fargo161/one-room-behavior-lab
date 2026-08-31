import { characterPacks, getCharacterPack } from "../character-packs/registry";
import type { CharacterPackId } from "../character-packs/types";
import type { ExpressionLayer, ExpressionLibraryExport } from "./types";

let fallbackId = 0;

export function createId(prefix: string): string {
  const uuid = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${(++fallbackId).toString(36)}`;
  return `${prefix}-${uuid}`;
}

export function cloneLayers(layers: readonly ExpressionLayer[]): ExpressionLayer[] {
  return layers.map(layer => ({ ...layer }));
}

export function createLayer(packId: CharacterPackId, assetId: string, id = createId("layer")): ExpressionLayer {
  const asset = getCharacterPack(packId).assetsById.get(assetId);
  if (!asset) throw new Error(`Unknown ${getCharacterPack(packId).displayName} asset: ${assetId}`);
  return {
    id,
    assetId: asset.id,
    visible: asset.defaultVisible,
    locked: asset.defaultLocked,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  };
}

export function createSourceVisibleLayers(packId: CharacterPackId = "marcus"): ExpressionLayer[] {
  return cloneLayers(getCharacterPack(packId).resetLayers);
}

export function createDefaultLibrary(): ExpressionLibraryExport {
  return {
    schema: "trapstar-expression-library",
    version: 2,
    assetSources: characterPacks.map(pack => ({
      characterPackId: pack.id,
      identity: pack.identity,
      manifestSchema: pack.manifestSchema,
      manifestVersion: pack.manifestVersion,
      sourceSha256: pack.sourceSha256,
    })),
    groups: characterPacks.flatMap(pack => pack.seedGroups.map(group => ({ ...group, characterPackId: pack.id }))),
    presets: characterPacks.flatMap(pack => pack.seedPresets.map(preset => ({
      ...preset,
      characterPackId: pack.id,
      layers: cloneLayers(preset.layers),
    }))),
  };
}

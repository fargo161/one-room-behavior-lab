import acceptanceLibrary from "../fixtures/MARCUS_EXPRESSION_ACCEPTANCE.json";
import { marcusAssetManifest } from "../assets/manifest";
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

export function createLayer(assetId: string, id = createId("layer")): ExpressionLayer {
  const asset = marcusAssetManifest.assets.find(candidate => candidate.id === assetId);
  if (!asset) throw new Error(`Unknown Marcus asset: ${assetId}`);
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

export function createSourceVisibleLayers(): ExpressionLayer[] {
  return marcusAssetManifest.assets
    .filter(asset => asset.defaultVisible)
    .sort((a, b) => a.sourceStackIndex - b.sourceStackIndex)
    .map(asset => createLayer(asset.id, `source-${asset.sourceStackIndex}`));
}

export function createDefaultLibrary(): ExpressionLibraryExport {
  return JSON.parse(JSON.stringify(acceptanceLibrary)) as ExpressionLibraryExport;
}

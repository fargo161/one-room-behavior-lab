import manifestDocument from "./marcus_asset_manifest.json";
import { MARCUS_SLOT_IDS, type FacialAsset, type FacialAssetManifest, type MarcusSlotId } from "../model/types";

function assertMarcusManifest(value: unknown): asserts value is FacialAssetManifest {
  if (!value || typeof value !== "object") throw new Error("Marcus asset manifest is missing");
  const candidate = value as Partial<FacialAssetManifest>;
  if (candidate.schema !== "trapstar-marcus-expression-assets" || candidate.version !== 1 || candidate.identity !== "MARCUS") {
    throw new Error("Marcus asset manifest has an unsupported schema");
  }
  if (candidate.canonicalFaceSpace?.width !== 1187 || candidate.canonicalFaceSpace.height !== 1484) {
    throw new Error("Marcus canonical face-space must remain 1187 × 1484");
  }
  if (!Array.isArray(candidate.assets) || candidate.assets.length !== 62) {
    throw new Error("Marcus asset manifest must contain exactly 62 assets");
  }
  const ids = candidate.assets.map(asset => asset.id);
  if (new Set(ids).size !== ids.length) throw new Error("Marcus asset IDs must be unique");
  if (candidate.assets.some(asset => !MARCUS_SLOT_IDS.includes(asset.slotId as MarcusSlotId))) {
    throw new Error("Marcus asset manifest contains an unknown slot");
  }
}

assertMarcusManifest(manifestDocument);

export const marcusAssetManifest: FacialAssetManifest = manifestDocument;
export const marcusAssets: readonly FacialAsset[] = marcusAssetManifest.assets;
export const marcusAssetsById = new Map(marcusAssets.map(asset => [asset.id, asset]));

export function findMarcusAsset(assetId: string | null | undefined): FacialAsset | undefined {
  return assetId ? marcusAssetsById.get(assetId) : undefined;
}

export function assetsForSlot(slotId: MarcusSlotId): readonly FacialAsset[] {
  return marcusAssets.filter(asset => asset.slotId === slotId);
}

import manifestDocument from "./manifest.json";
import defaultLibraryV1 from "./default-library-v1.json";
import type {
  AnatomicalSide,
  CharacterPackAsset,
  CharacterPackMask,
  ExpressionCharacterPack,
  Rect,
} from "../types";

export const MARCUS_SLOT_IDS = [
  "BASE_HEAD",
  "BROW_L",
  "BROW_R",
  "EYE_L",
  "EYE_R",
  "GAZE_L",
  "GAZE_R",
  "LOWER_FACE",
  "MACRO_OVERRIDE",
] as const;

export type MarcusSlotId = typeof MARCUS_SLOT_IDS[number];

export interface MarcusSourceRect extends Rect {
  rotation: number;
}

export interface MarcusFacialAssetMask extends CharacterPackMask {
  sourceResource: string;
  sourceFormat: "PNG";
  apply: "ALPHA_MULTIPLY";
}

export interface MarcusFacialAsset {
  id: string;
  label: string;
  slotId: MarcusSlotId;
  sourceBand: string;
  sourceStackIndex: number;
  src: string;
  sourceResource: string;
  sourceResourceSha256: string;
  sourceRect: MarcusSourceRect;
  faceRect: Rect;
  defaultVisible: boolean;
  defaultLocked: boolean;
  opacity: number;
  anatomicalSide: AnatomicalSide;
  canonicalSemanticState: string | null;
  sourceCandidate: string | null;
  classification: "reference_only" | "semantic_exemplar" | "semantic_alternate" | "future_variant";
  confidence: "high" | "low" | "unresolved";
  identityBinding: "MARCUS_ONLY";
  mask: MarcusFacialAssetMask | null;
}

export interface MarcusAssetManifest {
  schema: "trapstar-marcus-expression-assets";
  version: 1;
  identity: "MARCUS";
  source: {
    fileName: string;
    sha256: string;
    byteLength: number;
    documentId: string;
    documentName: string;
    documentCanvas: { width: number; height: number };
    stackOrder: "BACK_TO_FRONT";
    mapping: { repositoryPath: string; sha256: string; rowCount: number };
  };
  canonicalFaceSpace: {
    width: number;
    height: number;
    unit: "pixel";
    origin: "TOP_LEFT";
    xPositive: "RIGHT_ON_IMAGE";
    yPositive: "DOWN";
    rectangleConvention: "HALF_OPEN_PIXEL_EDGE";
    sourceOffset: { x: number; y: number };
  };
  assetIdPolicy: "EXACT_PXZ_LAYER_NAME";
  renderOrderPolicy: "PRESET_LAYER_ARRAY_BACK_TO_FRONT";
  slots: Array<{ id: MarcusSlotId; label: string; assetCount: number }>;
  assets: MarcusFacialAsset[];
}

interface MarcusV1Seed {
  groups: Array<{ id: string; name: string }>;
  presets: Array<{
    id: string;
    name: string;
    groupId: string | null;
    layers: Array<{ id: string; assetId: string; visible: boolean; locked: boolean; x: number; y: number; scale: number; rotation: number }>;
    createdAt: string;
    updatedAt: string;
  }>;
}

function assertMarcusManifest(value: unknown): asserts value is MarcusAssetManifest {
  if (!value || typeof value !== "object") throw new Error("Marcus asset manifest is missing");
  const candidate = value as Partial<MarcusAssetManifest>;
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

export const marcusAssetManifest: MarcusAssetManifest = manifestDocument;
export const marcusAssets: readonly MarcusFacialAsset[] = marcusAssetManifest.assets;
export const marcusAssetsById = new Map(marcusAssets.map(asset => [asset.id, asset]));

const runtimeAssets: CharacterPackAsset[] = marcusAssets.map(asset => ({
  ...asset,
  role: asset.id === "00_BASE_REFERENCE_LOCKED" ? "BASE" : "SLOT",
  sha256: asset.sourceResourceSha256,
  semanticState: asset.canonicalSemanticState,
}));
const runtimeAssetsById = new Map(runtimeAssets.map(asset => [asset.id, asset]));
const seed = defaultLibraryV1 as MarcusV1Seed;

export const marcusPack: ExpressionCharacterPack = {
  schema: "trapstar-expression-character-pack",
  version: 1,
  id: "marcus",
  identity: "MARCUS",
  displayName: "Marcus",
  manifestSchema: marcusAssetManifest.schema,
  manifestVersion: marcusAssetManifest.version,
  sourceSha256: marcusAssetManifest.source.sha256,
  canonicalFaceSpace: marcusAssetManifest.canonicalFaceSpace,
  renderOrderPolicy: marcusAssetManifest.renderOrderPolicy,
  baseAssetId: "00_BASE_REFERENCE_LOCKED",
  slots: marcusAssetManifest.slots,
  assets: runtimeAssets,
  assetsById: runtimeAssetsById,
  seedGroups: seed.groups,
  seedPresets: seed.presets,
  initialPresetId: "suspicious-02",
  resetLayers: runtimeAssets
    .filter(asset => asset.defaultVisible)
    .sort((left, right) => left.sourceStackIndex - right.sourceStackIndex)
    .map(asset => ({
      id: `source-${asset.sourceStackIndex}`,
      assetId: asset.id,
      visible: true,
      locked: asset.defaultLocked,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    })),
};

export function findMarcusAsset(assetId: string | null | undefined): MarcusFacialAsset | undefined {
  return assetId ? marcusAssetsById.get(assetId) : undefined;
}

export function assetsForMarcusSlot(slotId: MarcusSlotId): readonly MarcusFacialAsset[] {
  return marcusAssets.filter(asset => asset.slotId === slotId);
}

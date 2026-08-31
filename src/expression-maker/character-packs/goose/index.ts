import manifestDocument from "./manifest.json";
import type {
  CharacterPackAsset,
  CharacterPackSlot,
  ExpressionCharacterPack,
  Rect,
} from "../types";

export const GOOSE_SLOT_IDS = [
  "LEFT_BROW",
  "RIGHT_BROW",
  "LEFT_EYE",
  "RIGHT_EYE",
  "LOWER_FACE",
] as const;

export type GooseSlotId = typeof GOOSE_SLOT_IDS[number];

interface GooseManifestAsset {
  id: string;
  label: string;
  role: "BASE" | "SLOT";
  slotId: GooseSlotId | null;
  sourceStackIndex: number;
  src: string;
  sha256: string;
  faceRect: Rect;
  defaultVisible: boolean;
  defaultLocked: boolean;
  opacity: number;
  anatomicalSide: "LEFT" | "RIGHT" | null;
  semanticState: string | null;
}

interface GoosePackManifest {
  schema: "trapstar-expression-character-pack";
  version: 1;
  characterPackId: "goose";
  identity: "GOOSE";
  displayName: "Goose";
  assetSetSha256: string;
  canonicalFaceSpace: {
    width: number;
    height: number;
    unit: "pixel";
    origin: "TOP_LEFT";
  };
  renderOrderPolicy: "PRESET_LAYER_ARRAY_BACK_TO_FRONT";
  baseAssetId: string;
  slotDrawOrder: GooseSlotId[];
  slots: Array<Omit<CharacterPackSlot, "assetCount">>;
  assets: GooseManifestAsset[];
  expressions: Array<{ id: string; name: string; assetIds: Record<GooseSlotId, string> }>;
  initialExpressionId: string;
}

function assertGooseManifest(value: unknown): asserts value is GoosePackManifest {
  if (!value || typeof value !== "object") throw new Error("Goose character-pack manifest is missing");
  const candidate = value as Partial<GoosePackManifest>;
  if (candidate.schema !== "trapstar-expression-character-pack" || candidate.version !== 1 || candidate.characterPackId !== "goose") {
    throw new Error("Goose character-pack manifest has an unsupported schema");
  }
  if (candidate.canonicalFaceSpace?.width !== 1187 || candidate.canonicalFaceSpace.height !== 1484) {
    throw new Error("Goose canonical face-space must remain 1187 × 1484");
  }
  if (!Array.isArray(candidate.slots) || candidate.slots.map(slot => slot.id).join("|") !== GOOSE_SLOT_IDS.join("|")) {
    throw new Error("Goose must declare its exact five native facial slots");
  }
  if (!Array.isArray(candidate.assets) || candidate.assets.length !== 91) {
    throw new Error("Goose must contain one base plus 90 registered slot assets");
  }
  if (!Array.isArray(candidate.expressions) || candidate.expressions.length !== 18) {
    throw new Error("Goose must contain 18 canonical expression presets");
  }
  if (candidate.assets.some(asset => asset.role === "SLOT" && !GOOSE_SLOT_IDS.includes(asset.slotId as GooseSlotId))) {
    throw new Error("Goose asset uses a non-native facial slot");
  }
}

assertGooseManifest(manifestDocument);

export const gooseAssetManifest: GoosePackManifest = manifestDocument;
const runtimeAssets: CharacterPackAsset[] = gooseAssetManifest.assets.map(asset => ({
  ...asset,
  mask: null,
  identityBinding: "GOOSE_ONLY",
}));
const runtimeAssetsById = new Map(runtimeAssets.map(asset => [asset.id, asset]));
const slots: CharacterPackSlot[] = gooseAssetManifest.slots.map(slot => ({
  ...slot,
  assetCount: runtimeAssets.filter(asset => asset.slotId === slot.id).length,
}));
const seedGroups = [{ id: "goose-canonical", name: "Canonical Expressions" }];
const createdAt = "2026-08-30T00:00:00.000Z";
const seedPresets = gooseAssetManifest.expressions.map(expression => ({
  id: expression.id,
  name: expression.name.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()),
  groupId: "goose-canonical",
  layers: [
    {
      id: `${expression.id}--base`,
      assetId: gooseAssetManifest.baseAssetId,
      visible: true,
      locked: true,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    },
    ...GOOSE_SLOT_IDS.map(slotId => ({
      id: `${expression.id}--${slotId.toLowerCase()}`,
      assetId: expression.assetIds[slotId],
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    })),
  ],
  createdAt,
  updatedAt: createdAt,
}));
const initialPreset = seedPresets.find(preset => preset.id === gooseAssetManifest.initialExpressionId);
if (!initialPreset) throw new Error("Goose initial expression is missing");

export const goosePack: ExpressionCharacterPack = {
  schema: "trapstar-expression-character-pack",
  version: 1,
  id: "goose",
  identity: "GOOSE",
  displayName: "Goose",
  manifestSchema: gooseAssetManifest.schema,
  manifestVersion: gooseAssetManifest.version,
  sourceSha256: gooseAssetManifest.assetSetSha256,
  canonicalFaceSpace: gooseAssetManifest.canonicalFaceSpace,
  renderOrderPolicy: gooseAssetManifest.renderOrderPolicy,
  baseAssetId: gooseAssetManifest.baseAssetId,
  slots,
  assets: runtimeAssets,
  assetsById: runtimeAssetsById,
  seedGroups,
  seedPresets,
  initialPresetId: initialPreset.id,
  resetLayers: initialPreset.layers,
};

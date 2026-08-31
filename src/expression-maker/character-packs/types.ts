export type CharacterPackId = "marcus" | "goose";
export type CharacterIdentity = "MARCUS" | "GOOSE";
export type AnatomicalSide = "LEFT" | "RIGHT" | null;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterPackMask {
  src: string;
  sha256: string;
  apply?: "ALPHA_MULTIPLY";
  sourceResource?: string;
  sourceFormat?: "PNG";
  featherPixels?: number;
}

export interface CharacterPackAsset {
  id: string;
  label: string;
  role: "BASE" | "SLOT";
  /** Pack-local slot ID. A separate immutable base may use null. */
  slotId: string | null;
  sourceStackIndex: number;
  src: string;
  sha256: string;
  faceRect: Rect;
  defaultVisible: boolean;
  defaultLocked: boolean;
  opacity: number;
  anatomicalSide: AnatomicalSide;
  semanticState: string | null;
  mask: CharacterPackMask | null;
  /** Preserved source-manifest fields used by the Marcus audit/tests. */
  sourceBand?: string;
  sourceResource?: string;
  sourceResourceSha256?: string;
  sourceRect?: Rect & { rotation: number };
  canonicalSemanticState?: string | null;
  sourceCandidate?: string | null;
  classification?: "reference_only" | "semantic_exemplar" | "semantic_alternate" | "future_variant";
  confidence?: "high" | "low" | "unresolved";
  identityBinding?: "MARCUS_ONLY" | "GOOSE_ONLY";
}

export interface CharacterPackSlot {
  id: string;
  label: string;
  assetCount: number;
  anatomicalSide?: AnatomicalSide;
  faceRect?: Rect;
  mask?: { src: string; sha256: string; featherPixels?: number };
}

export interface CharacterPackSeedLayer {
  id: string;
  assetId: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface CharacterPackSeedGroup {
  id: string;
  name: string;
}

export interface CharacterPackSeedPreset {
  id: string;
  name: string;
  groupId: string | null;
  layers: CharacterPackSeedLayer[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpressionCharacterPack {
  schema: "trapstar-expression-character-pack";
  version: 1;
  id: CharacterPackId;
  identity: CharacterIdentity;
  displayName: string;
  manifestSchema: string;
  manifestVersion: number;
  sourceSha256: string;
  canonicalFaceSpace: {
    width: number;
    height: number;
    unit: "pixel";
    origin: "TOP_LEFT";
  };
  renderOrderPolicy: "PRESET_LAYER_ARRAY_BACK_TO_FRONT";
  baseAssetId: string;
  /** Native expression slots only. Goose therefore has exactly five. */
  slots: readonly CharacterPackSlot[];
  assets: readonly CharacterPackAsset[];
  assetsById: ReadonlyMap<string, CharacterPackAsset>;
  seedGroups: readonly CharacterPackSeedGroup[];
  seedPresets: readonly CharacterPackSeedPreset[];
  initialPresetId: string;
  resetLayers: readonly CharacterPackSeedLayer[];
}

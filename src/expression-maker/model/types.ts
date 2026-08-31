import type {
  CharacterPackAsset,
  CharacterPackId,
  CharacterPackMask,
  Rect,
} from "../character-packs/types";
import type { MarcusAssetManifest, MarcusSlotId } from "../character-packs/marcus";

export { GOOSE_SLOT_IDS, type GooseSlotId } from "../character-packs/goose";
export { MARCUS_SLOT_IDS, type MarcusSlotId } from "../character-packs/marcus";
export type { AnatomicalSide, CharacterPackId, Rect } from "../character-packs/types";

/** Compatibility aliases retained for Marcus extractor and regression tests. */
export type FacialAsset = CharacterPackAsset;
export type FacialAssetMask = CharacterPackMask;
export type FacialAssetManifest = MarcusAssetManifest;
export type SourceRect = Rect & { rotation: number };
export type ExpressionSlotId = MarcusSlotId | import("../character-packs/goose").GooseSlotId;

export interface ExpressionLayer {
  id: string;
  assetId: string;
  visible: boolean;
  locked: boolean;
  /** Translation from the asset's registered pack face-space position. */
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface ExpressionGroup {
  id: string;
  name: string;
  characterPackId: CharacterPackId;
}

export interface ExpressionPreset {
  id: string;
  name: string;
  characterPackId: CharacterPackId;
  groupId: string | null;
  /** Back-to-front render order. */
  layers: ExpressionLayer[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpressionAssetSource {
  characterPackId: CharacterPackId;
  identity: "MARCUS" | "GOOSE";
  manifestSchema: string;
  manifestVersion: number;
  sourceSha256: string;
}

export interface ExpressionLibraryExport {
  schema: "trapstar-expression-library";
  version: 2;
  assetSources: ExpressionAssetSource[];
  groups: ExpressionGroup[];
  presets: ExpressionPreset[];
}

export interface LegacyMarcusExpressionLibraryV1 {
  schema: "trapstar-expression-library";
  version: 1;
  assetSource: {
    identity: "MARCUS";
    manifestSchema: "trapstar-marcus-expression-assets";
    manifestVersion: 1;
    sourceSha256: string;
  };
  groups: Array<{ id: string; name: string }>;
  presets: Array<Omit<ExpressionPreset, "characterPackId">>;
}

export type LayerMove = "UP" | "DOWN" | "FRONT" | "BACK";

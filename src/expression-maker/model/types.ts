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
export type AnatomicalSide = "LEFT" | "RIGHT" | null;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceRect extends Rect {
  rotation: number;
}

export interface FacialAssetMask {
  src: string;
  sourceResource: string;
  sourceFormat: "PNG";
  apply: "ALPHA_MULTIPLY";
  sha256: string;
}

export interface FacialAsset {
  id: string;
  label: string;
  slotId: MarcusSlotId;
  sourceBand: string;
  sourceStackIndex: number;
  src: string;
  sourceResource: string;
  sourceResourceSha256: string;
  sourceRect: SourceRect;
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
  mask: FacialAssetMask | null;
}

export interface FacialAssetManifest {
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
    mapping: {
      repositoryPath: string;
      sha256: string;
      rowCount: number;
    };
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
  assets: FacialAsset[];
}

export interface ExpressionLayer {
  id: string;
  assetId: string;
  visible: boolean;
  locked: boolean;
  /** Translation from the asset's registered Marcus face-space position. */
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface ExpressionGroup {
  id: string;
  name: string;
}

export interface ExpressionPreset {
  id: string;
  name: string;
  groupId: string | null;
  /** Back-to-front render order. */
  layers: ExpressionLayer[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpressionAssetSource {
  identity: "MARCUS";
  manifestSchema: "trapstar-marcus-expression-assets";
  manifestVersion: 1;
  sourceSha256: string;
}

export interface ExpressionLibraryExport {
  schema: "trapstar-expression-library";
  version: 1;
  assetSource: ExpressionAssetSource;
  groups: ExpressionGroup[];
  presets: ExpressionPreset[];
}

export type LayerMove = "UP" | "DOWN" | "FRONT" | "BACK";

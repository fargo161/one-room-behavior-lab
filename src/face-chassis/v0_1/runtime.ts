import { z } from "zod";

import { chassisContract } from "./contract";
import { identityPackManifestSchema } from "./identityPack";
import {
  BROW_STATES,
  EYE_STATES,
  FACE_SPACE_HEIGHT,
  FACE_SPACE_WIDTH,
  GAZE_STATES,
  LOWER_FACE_STATES,
  MACRO_STATES,
  MIDFACE_STATES,
  ORDINARY_EXPRESSION_SLOT_IDS,
  SLOT_IDS,
  type SlotId,
} from "./schema";

const selectionFields = {
  BASE_HEAD: z.literal("NEUTRAL"),
  BROW_L: z.enum(BROW_STATES),
  BROW_R: z.enum(BROW_STATES),
  EYE_L: z.enum(EYE_STATES),
  EYE_R: z.enum(EYE_STATES),
  GAZE_L: z.enum(GAZE_STATES),
  GAZE_R: z.enum(GAZE_STATES),
  MIDFACE: z.enum(MIDFACE_STATES),
  LOWER_FACE: z.enum(LOWER_FACE_STATES),
  MACRO_OVERRIDE: z.enum(MACRO_STATES).nullable(),
} as const;

export const resolvedSelectionSchema = z.object(selectionFields).strict();
export const selectionRequestSchema = z.object({
  BASE_HEAD: selectionFields.BASE_HEAD.optional(),
  BROW_L: selectionFields.BROW_L.optional(),
  BROW_R: selectionFields.BROW_R.optional(),
  EYE_L: selectionFields.EYE_L.optional(),
  EYE_R: selectionFields.EYE_R.optional(),
  GAZE_L: selectionFields.GAZE_L.optional(),
  GAZE_R: selectionFields.GAZE_R.optional(),
  MIDFACE: selectionFields.MIDFACE.optional(),
  LOWER_FACE: selectionFields.LOWER_FACE.optional(),
  MACRO_OVERRIDE: selectionFields.MACRO_OVERRIDE.optional(),
}).strict();

export type ResolvedSelection = z.infer<typeof resolvedSelectionSchema>;
export type SelectionRequest = z.infer<typeof selectionRequestSchema>;

export type CompositionDiagnostic = {
  code: "SLOT_SUPPRESSED_BY_MACRO" | "GAZE_SUPPRESSED_BY_CLOSED_EYE";
  slotId: SlotId;
  requestedState: string;
  suppressedBy: SlotId;
};

export type RenderPlanEntry = {
  slotId: SlotId;
  semanticState: string;
  catalogRecordId: string;
  bindingId: string;
  normalizedIrisOffset?: { x: number; y: number };
  pupilScale?: number;
};

export type CompositionPlan = {
  requestedSelection: ResolvedSelection;
  effectiveSelection: Record<SlotId, string | null>;
  diagnostics: CompositionDiagnostic[];
  renderPlan: RenderPlanEntry[];
};

export type ResolvedRasterEntry = RenderPlanEntry & {
  kind: "RASTER";
  assetId: string;
  assetPath: string;
  replacementMaskPath: string | null;
};

export type ResolvedGazeEntry = RenderPlanEntry & {
  kind: "GAZE_RIG";
  assetId: string;
  irisSpritePath: string;
  pupilSpritePath: string;
  apertureMaskPath: string;
  clipPolicy: "CLIP_TO_EYE_APERTURE";
  maxOffsetPixels: { x: number; y: number };
  irisOffsetPixels: { x: number; y: number };
};

export type RenderableCompositionPlan = CompositionPlan & {
  identityPackId: string;
  resolvedRenderPlan: Array<ResolvedRasterEntry | ResolvedGazeEntry>;
};

export class FaceChassisRuntimeError extends Error {
  constructor(
    public readonly code: "MISSING_RENDERABLE_ASSET" | "ASSET_KIND_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "FaceChassisRuntimeError";
  }
}

type CatalogRecord = {
  recordId: string;
  semanticState: string;
  assetBindingId?: string;
  gazeRigBindingId?: string;
  normalizedIrisOffset?: { x: number; y: number };
  pupilScale?: number;
};

function findCatalogRecord(slotId: SlotId, semanticState: string): CatalogRecord {
  const records = chassisContract.stateCatalog[slotId] as readonly CatalogRecord[];
  const record = records.find(candidate => candidate.semanticState === semanticState);
  if (!record) throw new Error(`Unknown ${slotId} semantic state: ${semanticState}`);
  return record;
}

export function planComposition(input: unknown = {}): CompositionPlan {
  const request = selectionRequestSchema.parse(input);
  const requestedSelection = resolvedSelectionSchema.parse({ ...chassisContract.defaultSelection, ...request });
  const effectiveSelection = Object.fromEntries(
    SLOT_IDS.map(slotId => [slotId, requestedSelection[slotId]]),
  ) as Record<SlotId, string | null>;
  const diagnostics: CompositionDiagnostic[] = [];

  if (requestedSelection.MACRO_OVERRIDE !== null) {
    for (const slotId of ORDINARY_EXPRESSION_SLOT_IDS) {
      effectiveSelection[slotId] = null;
      diagnostics.push({
        code: "SLOT_SUPPRESSED_BY_MACRO",
        slotId,
        requestedState: requestedSelection[slotId],
        suppressedBy: "MACRO_OVERRIDE",
      });
    }
  } else {
    const eyeGazePairs = [["EYE_L", "GAZE_L"], ["EYE_R", "GAZE_R"]] as const;
    for (const [eyeSlotId, gazeSlotId] of eyeGazePairs) {
      if (requestedSelection[eyeSlotId] === chassisContract.compatibilityRules.closedEyeGaze.eyeState) {
        effectiveSelection[gazeSlotId] = null;
        diagnostics.push({
          code: "GAZE_SUPPRESSED_BY_CLOSED_EYE",
          slotId: gazeSlotId,
          requestedState: requestedSelection[gazeSlotId],
          suppressedBy: eyeSlotId,
        });
      }
    }
  }

  const renderPlan: RenderPlanEntry[] = [];
  for (const slotId of chassisContract.compositor.drawOrder) {
    const semanticState = effectiveSelection[slotId];
    if (semanticState === null) continue;
    const record = findCatalogRecord(slotId, semanticState);
    const entry: RenderPlanEntry = {
      slotId,
      semanticState,
      catalogRecordId: record.recordId,
      bindingId: record.assetBindingId ?? record.gazeRigBindingId!,
    };
    if (record.normalizedIrisOffset && record.pupilScale !== undefined) {
      const eyeSlotId = slotId === "GAZE_L" ? "EYE_L" : "EYE_R";
      const clamp = requestedSelection[eyeSlotId] === chassisContract.compatibilityRules.squintGaze.eyeState
        ? chassisContract.compatibilityRules.squintGaze.clampFactor
        : 1;
      entry.normalizedIrisOffset = {
        x: record.normalizedIrisOffset.x * clamp,
        y: record.normalizedIrisOffset.y * clamp,
      };
      entry.pupilScale = record.pupilScale;
    }
    renderPlan.push(entry);
  }

  return { requestedSelection, effectiveSelection, diagnostics, renderPlan };
}

export function planRenderableComposition(input: unknown, manifestInput: unknown): RenderableCompositionPlan {
  const manifest = identityPackManifestSchema.parse(manifestInput);
  const semanticPlan = planComposition(input);
  const assetsById = new Map(manifest.assets.map(asset => [asset.assetId, asset]));
  const bindingsByPair = new Map(manifest.bindings.map(binding => [
    `${binding.slotId}::${binding.semanticState}`,
    binding,
  ]));

  const resolvedRenderPlan = semanticPlan.renderPlan.map(entry => {
    const binding = bindingsByPair.get(`${entry.slotId}::${entry.semanticState}`)!;
    const asset = assetsById.get(binding.assetId)!;
    if (asset.implementationStatus === "DESIGNED") {
      throw new FaceChassisRuntimeError(
        "MISSING_RENDERABLE_ASSET",
        `${entry.slotId}/${entry.semanticState} is designed but has no renderable pixels`,
      );
    }

    const isGazeSlot = entry.slotId === "GAZE_L" || entry.slotId === "GAZE_R";
    if (isGazeSlot && asset.kind !== "GAZE_RIG") {
      throw new FaceChassisRuntimeError("ASSET_KIND_MISMATCH", `${entry.slotId} requires a gaze rig`);
    }
    if (!isGazeSlot && asset.kind !== "RASTER") {
      throw new FaceChassisRuntimeError("ASSET_KIND_MISMATCH", `${entry.slotId} requires a raster asset`);
    }

    if (asset.kind === "RASTER") {
      if (asset.assetPath === null) {
        throw new FaceChassisRuntimeError("MISSING_RENDERABLE_ASSET", `${asset.assetId} has no raster path`);
      }
      return {
        ...entry,
        kind: "RASTER" as const,
        assetId: asset.assetId,
        assetPath: asset.assetPath,
        replacementMaskPath: asset.replacementMaskPath,
      };
    }

    if (asset.irisSpritePath === null || asset.pupilSpritePath === null ||
        asset.apertureMaskPath === null || asset.maxOffsetPixels === null ||
        entry.normalizedIrisOffset === undefined) {
      throw new FaceChassisRuntimeError("MISSING_RENDERABLE_ASSET", `${asset.assetId} has an incomplete gaze rig`);
    }
    return {
      ...entry,
      kind: "GAZE_RIG" as const,
      assetId: asset.assetId,
      irisSpritePath: asset.irisSpritePath,
      pupilSpritePath: asset.pupilSpritePath,
      apertureMaskPath: asset.apertureMaskPath,
      clipPolicy: "CLIP_TO_EYE_APERTURE" as const,
      maxOffsetPixels: asset.maxOffsetPixels,
      irisOffsetPixels: {
        x: entry.normalizedIrisOffset.x * asset.maxOffsetPixels.x,
        y: entry.normalizedIrisOffset.y * asset.maxOffsetPixels.y,
      },
    };
  });

  return { ...semanticPlan, identityPackId: manifest.identityPackId, resolvedRenderPlan };
}

export function pixelToNormalized(point: { x: number; y: number }) {
  return { x: point.x / (FACE_SPACE_WIDTH - 1), y: point.y / (FACE_SPACE_HEIGHT - 1) };
}

export function normalizedToPixel(point: { x: number; y: number }) {
  return { x: point.x * (FACE_SPACE_WIDTH - 1), y: point.y * (FACE_SPACE_HEIGHT - 1) };
}

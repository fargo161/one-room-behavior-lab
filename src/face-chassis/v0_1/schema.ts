import { z } from "zod";

export const CHASSIS_ID = "MALE_FACE_CHASSIS_V0_1" as const;
export const SCHEMA_VERSION = "0.1" as const;
export const FACE_SPACE_WIDTH = 1187 as const;
export const FACE_SPACE_HEIGHT = 1484 as const;

export const SLOT_IDS = [
  "BASE_HEAD",
  "BROW_L",
  "BROW_R",
  "EYE_L",
  "EYE_R",
  "GAZE_L",
  "GAZE_R",
  "MIDFACE",
  "LOWER_FACE",
  "MACRO_OVERRIDE",
] as const;

export const ORDINARY_EXPRESSION_SLOT_IDS = [
  "BROW_L",
  "BROW_R",
  "EYE_L",
  "EYE_R",
  "GAZE_L",
  "GAZE_R",
  "MIDFACE",
  "LOWER_FACE",
] as const;

export const BROW_STATES = [
  "NEUTRAL",
  "LOW_FLAT",
  "LOW_HEAVY",
  "FURROW_CENTER_DEEP",
  "ANGRY_ARCHED",
  "ARCHED_TALL",
] as const;

export const EYE_STATES = [
  "OPEN_NEUTRAL",
  "HALF_LID",
  "SQUINT_TIGHT",
  "WIDE_OPEN_ALERT",
  "CLOSED_TIGHT",
] as const;

export const GAZE_STATES = [
  "CENTER",
  "LOOK_ANATOMICAL_LEFT",
  "LOOK_ANATOMICAL_RIGHT",
  "LOOK_UP",
  "LOOK_DOWN",
] as const;

export const MIDFACE_STATES = [
  "NEUTRAL",
  "CHEEK_RAISE",
  "NOSE_SCRUNCH",
  "MIDFACE_TENSION",
] as const;

export const LOWER_FACE_STATES = [
  "NEUTRAL_CLOSED",
  "SMILE_CLOSED",
  "SMILE_TEETH",
  "FROWN_POUT",
  "FROWN_TENSE",
  "MOUTH_OPEN_SMALL",
  "MOUTH_OPEN_SOFT",
  "SHOUT_OPEN",
  "LAUGH_WIDE_OPEN",
  "GRIMACE_FEAR",
] as const;

export const MACRO_STATES = ["PUFFED_CHEEKS"] as const;

export const REQUIRED_ANCHOR_IDS = [
  "FACE_CENTER",
  "FOREHEAD_CENTER",
  "NOSE_BRIDGE_CENTER",
  "NOSE_TIP",
  "CHIN_CENTER",
  "BROW_L_INNER",
  "BROW_L_CENTER",
  "BROW_L_OUTER",
  "EYE_L_INNER_CANTHUS",
  "EYE_L_CENTER",
  "EYE_L_OUTER_CANTHUS",
  "PUPIL_L_NEUTRAL_CENTER",
  "BROW_R_INNER",
  "BROW_R_CENTER",
  "BROW_R_OUTER",
  "EYE_R_INNER_CANTHUS",
  "EYE_R_CENTER",
  "EYE_R_OUTER_CANTHUS",
  "PUPIL_R_NEUTRAL_CENTER",
  "NOSTRIL_L",
  "NOSTRIL_R",
  "CHEEK_L_REFERENCE",
  "CHEEK_R_REFERENCE",
  "MOUTH_L_CORNER",
  "MOUTH_CENTER",
  "MOUTH_R_CORNER",
  "UPPER_LIP_CENTER",
  "LOWER_LIP_CENTER",
  "JAW_L_REFERENCE",
  "JAW_R_REFERENCE",
] as const;

export const CANONICAL_SLOT_SPECS = {
  BASE_HEAD: { side: null, role: "BASE", min: 1, zIndex: 0, rect: { x: 0, y: 0, width: 1187, height: 1484 }, regions: [], anchors: ["FACE_CENTER", "FOREHEAD_CENTER", "NOSE_BRIDGE_CENTER", "NOSE_TIP", "CHIN_CENTER"] },
  BROW_L: { side: "LEFT", role: "RASTER_REPLACEMENT", min: 1, zIndex: 51, rect: { x: 312, y: 229, width: 631, height: 448 }, regions: ["BROW_L_FIELD"], anchors: ["BROW_L_INNER", "BROW_L_CENTER", "BROW_L_OUTER"] },
  BROW_R: { side: "RIGHT", role: "RASTER_REPLACEMENT", min: 1, zIndex: 50, rect: { x: 244, y: 229, width: 631, height: 448 }, regions: ["BROW_R_FIELD"], anchors: ["BROW_R_INNER", "BROW_R_CENTER", "BROW_R_OUTER"] },
  EYE_L: { side: "LEFT", role: "RASTER_REPLACEMENT", min: 1, zIndex: 31, rect: { x: 525, y: 356, width: 382, height: 343 }, regions: ["EYE_L_FIELD"], anchors: ["EYE_L_INNER_CANTHUS", "EYE_L_CENTER", "EYE_L_OUTER_CANTHUS"] },
  EYE_R: { side: "RIGHT", role: "RASTER_REPLACEMENT", min: 1, zIndex: 30, rect: { x: 280, y: 356, width: 382, height: 343 }, regions: ["EYE_R_FIELD"], anchors: ["EYE_R_INNER_CANTHUS", "EYE_R_CENTER", "EYE_R_OUTER_CANTHUS"] },
  GAZE_L: { side: "LEFT", role: "TRANSFORM_OVERLAY", min: 1, zIndex: 41, rect: { x: 525, y: 356, width: 382, height: 343 }, regions: ["GAZE_L_APERTURE"], anchors: ["PUPIL_L_NEUTRAL_CENTER"] },
  GAZE_R: { side: "RIGHT", role: "TRANSFORM_OVERLAY", min: 1, zIndex: 40, rect: { x: 280, y: 356, width: 382, height: 343 }, regions: ["GAZE_R_APERTURE"], anchors: ["PUPIL_R_NEUTRAL_CENTER"] },
  MIDFACE: { side: null, role: "RASTER_REPLACEMENT", min: 1, zIndex: 10, rect: { x: 330, y: 460, width: 527, height: 430 }, regions: ["MIDFACE_FIELD"], anchors: ["NOSE_BRIDGE_CENTER", "NOSE_TIP", "NOSTRIL_L", "NOSTRIL_R", "CHEEK_L_REFERENCE", "CHEEK_R_REFERENCE"] },
  LOWER_FACE: { side: null, role: "RASTER_REPLACEMENT", min: 1, zIndex: 20, rect: { x: 330, y: 650, width: 527, height: 500 }, regions: ["LOWER_FACE_FIELD"], anchors: ["MOUTH_L_CORNER", "MOUTH_CENTER", "MOUTH_R_CORNER", "UPPER_LIP_CENTER", "LOWER_LIP_CENTER", "JAW_L_REFERENCE", "JAW_R_REFERENCE", "CHIN_CENTER"] },
  MACRO_OVERRIDE: { side: null, role: "MACRO", min: 0, zIndex: 100, rect: { x: 0, y: 0, width: 1187, height: 1484 }, regions: ["MACRO_FACE_FIELD"], anchors: ["FACE_CENTER", "NOSE_TIP", "MOUTH_CENTER"] },
} as const;

export const CANONICAL_DRAW_ORDER = [
  "BASE_HEAD", "MIDFACE", "LOWER_FACE", "EYE_R", "EYE_L",
  "GAZE_R", "GAZE_L", "BROW_R", "BROW_L", "MACRO_OVERRIDE",
] as const;

export const CANONICAL_REGION_SPECS = {
  BROW_L_FIELD: { owner: "BROW_L", policy: "ANATOMICAL_MIDLINE_CLIP", rect: { x: 593, y: 229, width: 350, height: 448 } },
  BROW_R_FIELD: { owner: "BROW_R", policy: "ANATOMICAL_MIDLINE_CLIP", rect: { x: 244, y: 229, width: 349, height: 448 } },
  EYE_L_FIELD: { owner: "EYE_L", policy: "MASKED_REPLACEMENT", rect: { x: 617, y: 440, width: 260, height: 210 } },
  EYE_R_FIELD: { owner: "EYE_R", policy: "MASKED_REPLACEMENT", rect: { x: 310, y: 440, width: 260, height: 210 } },
  GAZE_L_APERTURE: { owner: "GAZE_L", policy: "EYE_APERTURE_CLIP", rect: { x: 672, y: 500, width: 165, height: 100 } },
  GAZE_R_APERTURE: { owner: "GAZE_R", policy: "EYE_APERTURE_CLIP", rect: { x: 350, y: 500, width: 165, height: 100 } },
  MIDFACE_FIELD: { owner: "MIDFACE", policy: "MASKED_REPLACEMENT", rect: { x: 380, y: 500, width: 427, height: 390 } },
  LOWER_FACE_FIELD: { owner: "LOWER_FACE", policy: "MASKED_REPLACEMENT", rect: { x: 350, y: 700, width: 487, height: 430 } },
  MACRO_FACE_FIELD: { owner: "MACRO_OVERRIDE", policy: "MACRO_REPLACEMENT", rect: { x: 0, y: 0, width: 1187, height: 1484 } },
} as const;

export const CANONICAL_ANCHOR_PIXELS: Record<(typeof REQUIRED_ANCHOR_IDS)[number], { x: number; y: number }> = {
  FACE_CENTER: { x: 593, y: 741.5 },
  FOREHEAD_CENTER: { x: 593, y: 300 },
  NOSE_BRIDGE_CENTER: { x: 593, y: 520 },
  NOSE_TIP: { x: 593, y: 735 },
  CHIN_CENTER: { x: 593, y: 1110 },
  BROW_L_INNER: { x: 650, y: 420 },
  BROW_L_CENTER: { x: 750, y: 395 },
  BROW_L_OUTER: { x: 845, y: 415 },
  EYE_L_INNER_CANTHUS: { x: 650, y: 545 },
  EYE_L_CENTER: { x: 755, y: 550 },
  EYE_L_OUTER_CANTHUS: { x: 855, y: 545 },
  PUPIL_L_NEUTRAL_CENTER: { x: 755, y: 550 },
  BROW_R_INNER: { x: 536, y: 420 },
  BROW_R_CENTER: { x: 436, y: 395 },
  BROW_R_OUTER: { x: 341, y: 415 },
  EYE_R_INNER_CANTHUS: { x: 536, y: 545 },
  EYE_R_CENTER: { x: 431, y: 550 },
  EYE_R_OUTER_CANTHUS: { x: 331, y: 545 },
  PUPIL_R_NEUTRAL_CENTER: { x: 431, y: 550 },
  NOSTRIL_L: { x: 632, y: 755 },
  NOSTRIL_R: { x: 554, y: 755 },
  CHEEK_L_REFERENCE: { x: 755, y: 780 },
  CHEEK_R_REFERENCE: { x: 431, y: 780 },
  MOUTH_L_CORNER: { x: 670, y: 910 },
  MOUTH_CENTER: { x: 593, y: 920 },
  MOUTH_R_CORNER: { x: 516, y: 910 },
  UPPER_LIP_CENTER: { x: 593, y: 910 },
  LOWER_LIP_CENTER: { x: 593, y: 935 },
  JAW_L_REFERENCE: { x: 800, y: 1035 },
  JAW_R_REFERENCE: { x: 386, y: 1035 },
};

export const CANONICAL_GAZE_TRANSFORMS = {
  CENTER: { normalizedIrisOffset: { x: 0, y: 0 }, pupilScale: 1 },
  LOOK_ANATOMICAL_LEFT: { normalizedIrisOffset: { x: 0.72, y: 0 }, pupilScale: 1 },
  LOOK_ANATOMICAL_RIGHT: { normalizedIrisOffset: { x: -0.72, y: 0 }, pupilScale: 1 },
  LOOK_UP: { normalizedIrisOffset: { x: 0, y: -0.62 }, pupilScale: 0.98 },
  LOOK_DOWN: { normalizedIrisOffset: { x: 0, y: 0.52 }, pupilScale: 1.02 },
} as const;

export const slotIdSchema = z.enum(SLOT_IDS);
export const sideSchema = z.enum(["LEFT", "RIGHT"]);
export const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
export const normalizedPointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
}).strict();
export const rectSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();

const slotSchema = z.object({
  id: slotIdSchema,
  side: sideSchema.nullable(),
  role: z.enum(["BASE", "RASTER_REPLACEMENT", "TRANSFORM_OVERLAY", "MACRO"]),
  cardinality: z.object({ min: z.number().int().min(0).max(1), max: z.literal(1) }).strict(),
  zIndex: z.number().int().nonnegative(),
  slotRect: rectSchema,
  replacementRegionIds: z.array(z.string().min(1)),
  requiredAnchorIds: z.array(z.enum(REQUIRED_ANCHOR_IDS)),
}).strict();

const replacementRegionSchema = z.object({
  id: z.string().min(1),
  rect: rectSchema,
  primaryOwner: slotIdSchema,
  baseFallbackOwner: z.literal("BASE_HEAD"),
  policy: z.enum([
    "MASKED_REPLACEMENT",
    "ANATOMICAL_MIDLINE_CLIP",
    "EYE_APERTURE_CLIP",
    "MACRO_REPLACEMENT",
  ]),
}).strict();

const rasterStateSchema = z.object({
  recordId: z.string().min(1),
  assetBindingId: z.string().min(1),
  semanticState: z.string().min(1),
  implementationKind: z.literal("RASTER"),
}).strict();

const gazeTransformStateSchema = z.object({
  recordId: z.string().min(1),
  gazeRigBindingId: z.string().min(1),
  semanticState: z.enum(GAZE_STATES),
  implementationKind: z.literal("GAZE_TRANSFORM"),
  normalizedIrisOffset: z.object({
    x: z.number().finite().min(-1).max(1),
    y: z.number().finite().min(-1).max(1),
  }).strict(),
  pupilScale: z.number().finite().positive(),
}).strict();

const macroStateSchema = z.object({
  recordId: z.string().min(1),
  assetBindingId: z.string().min(1),
  semanticState: z.literal("PUFFED_CHEEKS"),
  implementationKind: z.literal("MACRO"),
  suppressesSlots: z.array(slotIdSchema),
  allowsSlots: z.array(slotIdSchema),
  precedence: z.number().int().positive(),
  overlapPolicy: z.literal("SUPPRESS_THEN_RENDER_LAST"),
}).strict();

const anchorSchema = z.object({
  id: z.enum(REQUIRED_ANCHOR_IDS),
  pixel: pointSchema,
  normalized: normalizedPointSchema,
}).strict();

const catalogSchema = z.object({
  BASE_HEAD: z.array(rasterStateSchema),
  BROW_L: z.array(rasterStateSchema),
  BROW_R: z.array(rasterStateSchema),
  EYE_L: z.array(rasterStateSchema),
  EYE_R: z.array(rasterStateSchema),
  GAZE_L: z.array(gazeTransformStateSchema),
  GAZE_R: z.array(gazeTransformStateSchema),
  MIDFACE: z.array(rasterStateSchema),
  LOWER_FACE: z.array(rasterStateSchema),
  MACRO_OVERRIDE: z.array(macroStateSchema),
}).strict();

const selectionSchema = z.object({
  BASE_HEAD: z.string().min(1),
  BROW_L: z.string().min(1),
  BROW_R: z.string().min(1),
  EYE_L: z.string().min(1),
  EYE_R: z.string().min(1),
  GAZE_L: z.string().min(1),
  GAZE_R: z.string().min(1),
  MIDFACE: z.string().min(1),
  LOWER_FACE: z.string().min(1),
  MACRO_OVERRIDE: z.string().nullable(),
}).strict();

const identityPackContractSchema = z.object({
  recordIdFormat: z.literal("<IDENTITY_PACK>::<SLOT>::<SEMANTIC_STATE>"),
  rasterCanvasSource: z.literal("slotRect.width_and_height"),
  perStateOffsetsAllowed: z.literal(false),
  requiredRasterFields: z.tuple([
    z.literal("recordId"),
    z.literal("slotId"),
    z.literal("semanticState"),
    z.literal("assetPath"),
    z.literal("replacementMaskPath"),
    z.literal("anchorAttachments"),
    z.literal("assetOrigin"),
    z.literal("genericCompatibility"),
    z.literal("implementationStatus"),
    z.literal("automatedTestStatus"),
    z.literal("visualValidationStatus"),
  ]),
  gazeRigFields: z.tuple([
    z.literal("irisSpritePath"),
    z.literal("pupilSpritePath"),
    z.literal("apertureMaskPath"),
    z.literal("neutralCenterAnchorId"),
    z.literal("maxOffsetPixels"),
  ]),
  statusAxes: z.object({
    assetOrigin: z.tuple([z.literal("REFERENCE"), z.literal("DERIVED"), z.literal("AUTHORED"), z.literal("PLACEHOLDER")]),
    genericCompatibility: z.tuple([z.literal("GENERIC"), z.literal("IDENTITY_BOUND"), z.literal("REFERENCE_ONLY")]),
    implementationStatus: z.tuple([z.literal("DESIGNED"), z.literal("PLACEHOLDER"), z.literal("IMPLEMENTED")]),
    automatedTestStatus: z.tuple([z.literal("NOT_RUN"), z.literal("PASSED"), z.literal("FAILED")]),
    visualValidationStatus: z.tuple([z.literal("NOT_REVIEWED"), z.literal("PASSED"), z.literal("FAILED"), z.literal("NOT_APPLICABLE")]),
  }).strict(),
  forbiddenGenericContent: z.tuple([
    z.literal("HAIR"),
    z.literal("BEARD"),
    z.literal("MUSTACHE"),
    z.literal("JEWELRY"),
    z.literal("CLOTHING"),
    z.literal("BAKED_GAZE_DIRECTION"),
  ]),
}).strict();

export const chassisContractSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  chassisId: z.literal(CHASSIS_ID),
  realityStatus: z.literal("DESIGNED_SCHEMA_ONLY"),
  authority: z.object({
    publicContractIsNormative: z.literal(true),
    observedPixelsMayRedefineContract: z.literal(false),
    marcusPxzSha256: z.literal("D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7"),
    derivativeZipIsAuthoritative: z.literal(false),
  }).strict(),
  faceSpace: z.object({
    width: z.literal(FACE_SPACE_WIDTH),
    height: z.literal(FACE_SPACE_HEIGHT),
    unit: z.literal("pixel"),
    origin: z.literal("top-left"),
    xPositive: z.literal("right-on-image"),
    yPositive: z.literal("down"),
    rectangleConvention: z.literal("half-open-pixel-edge"),
    anchorPixelConvention: z.literal("pixel-center"),
    normalizedPointFormula: z.literal("x/(width-1),y/(height-1)"),
    normalizedTolerance: z.literal(1e-9),
    sourceDocumentTransform: z.object({
      documentWidth: z.literal(3264),
      documentHeight: z.literal(2448),
      offsetX: z.literal(1019),
      offsetY: z.literal(499),
    }).strict(),
    sideConvention: z.object({
      meaning: z.literal("anatomical"),
      supportedView: z.literal("unmirrored-front"),
      anatomicalLeftAppearsOnImage: z.literal("right"),
      mirroringRenamesStoredSides: z.literal(false),
    }).strict(),
  }).strict(),
  compositor: z.object({
    ordinarySlotCardinality: z.literal("EXACTLY_ONE"),
    macroCardinality: z.literal("ZERO_OR_ONE"),
    drawOrder: z.array(slotIdSchema),
    blendMode: z.literal("NORMAL_STRAIGHT_ALPHA"),
    baseFallbackPolicy: z.literal("COHERENT_NEUTRAL_UNDERPAINT_WITH_DECLARED_REPLACEMENT_FIELDS"),
    replacementRegionGeometry: z.literal("BOUNDING_ENVELOPES_MAY_OVERLAP_ASSET_MASKS_DEFINE_PAINTED_COVERAGE"),
    suppressedSelectionPolicy: z.literal("PRESERVE_REQUESTED_AND_EMIT_DIAGNOSTIC"),
    unknownStatePolicy: z.literal("REJECT"),
    missingRenderableAssetPolicy: z.literal("REJECT"),
    glabellaPartition: z.object({
      mode: z.literal("ANATOMICAL_MIDLINE_CLIP"),
      splitX: z.literal(593),
      imageLeftOwner: z.literal("BROW_R"),
      imageRightOwner: z.literal("BROW_L"),
    }).strict(),
    allowedOrdinaryOverlaps: z.array(z.object({
      under: slotIdSchema,
      over: slotIdSchema,
      policy: z.literal("CLIP_TO_EYE_APERTURE"),
    }).strict()),
  }).strict(),
  slots: z.array(slotSchema),
  replacementRegions: z.array(replacementRegionSchema),
  anchors: z.array(anchorSchema),
  stateCatalog: catalogSchema,
  defaultSelection: selectionSchema,
  compatibilityRules: z.object({
    closedEyeGaze: z.object({
      eyeState: z.literal("CLOSED_TIGHT"),
      behavior: z.literal("SUPPRESS_EFFECTIVE_GAZE"),
      diagnosticCode: z.literal("GAZE_SUPPRESSED_BY_CLOSED_EYE"),
    }).strict(),
    squintGaze: z.object({
      eyeState: z.literal("SQUINT_TIGHT"),
      behavior: z.literal("CLAMP_NORMALIZED_OFFSET"),
      clampFactor: z.literal(0.35),
    }).strict(),
    macroSuppression: z.object({
      requestedSelectionIsPreserved: z.literal(true),
      diagnosticCode: z.literal("SLOT_SUPPRESSED_BY_MACRO"),
      listsAreClosedWorld: z.literal(true),
    }).strict(),
  }).strict(),
  identityPackContract: identityPackContractSchema,
}).strict().superRefine((contract, ctx) => {
  const add = (message: string, path: (string | number)[] = []) =>
    ctx.addIssue({ code: "custom", message, path });

  const slotsById = new Map(contract.slots.map(slot => [slot.id, slot]));
  if (slotsById.size !== SLOT_IDS.length || SLOT_IDS.some(id => !slotsById.has(id))) {
    add("slots must contain every canonical slot exactly once", ["slots"]);
  }
  if (JSON.stringify(contract.slots.map(slot => slot.id)) !== JSON.stringify(SLOT_IDS)) {
    add("slots must use the frozen canonical declaration order", ["slots"]);
  }

  for (const [index, slotId] of SLOT_IDS.entries()) {
    const slot = slotsById.get(slotId);
    const spec = CANONICAL_SLOT_SPECS[slotId];
    if (!slot) continue;
    if (slot.side !== spec.side || slot.role !== spec.role || slot.cardinality.min !== spec.min ||
        slot.cardinality.max !== 1 || slot.zIndex !== spec.zIndex ||
        JSON.stringify(slot.slotRect) !== JSON.stringify(spec.rect) ||
        JSON.stringify(slot.replacementRegionIds) !== JSON.stringify(spec.regions) ||
        JSON.stringify(slot.requiredAnchorIds) !== JSON.stringify(spec.anchors)) {
      add(`${slotId} must equal its frozen v0.1 slot specification`, ["slots", index]);
    }
  }

  const zIndexes = contract.slots.map(slot => slot.zIndex);
  if (new Set(zIndexes).size !== zIndexes.length) add("slot zIndex values must be unique", ["slots"]);
  const expectedOrder = [...contract.slots].sort((a, b) => a.zIndex - b.zIndex).map(slot => slot.id);
  if (JSON.stringify(expectedOrder) !== JSON.stringify(contract.compositor.drawOrder)) {
    add("compositor drawOrder must equal the unique ascending slot zIndex order", ["compositor", "drawOrder"]);
  }
  if (JSON.stringify(contract.compositor.drawOrder) !== JSON.stringify(CANONICAL_DRAW_ORDER)) {
    add("compositor drawOrder must equal the frozen v0.1 draw order", ["compositor", "drawOrder"]);
  }

  for (const [index, slot] of contract.slots.entries()) {
    const { x, y, width, height } = slot.slotRect;
    if (x + width > FACE_SPACE_WIDTH || y + height > FACE_SPACE_HEIGHT) {
      add(`${slot.id} slotRect exceeds canonical face-space`, ["slots", index, "slotRect"]);
    }
    const central = ["BASE_HEAD", "MIDFACE", "LOWER_FACE", "MACRO_OVERRIDE"].includes(slot.id);
    const expectedSide = slot.id.endsWith("_L") ? "LEFT" : slot.id.endsWith("_R") ? "RIGHT" : null;
    if ((central && slot.side !== null) || (!central && slot.side !== expectedSide)) {
      add(`${slot.id} side must follow anatomical slot naming`, ["slots", index, "side"]);
    }
    if (slot.id === "MACRO_OVERRIDE") {
      if (slot.cardinality.min !== 0) add("MACRO_OVERRIDE cardinality must be zero-or-one", ["slots", index, "cardinality"]);
    } else if (slot.cardinality.min !== 1) {
      add(`${slot.id} cardinality must be exactly one`, ["slots", index, "cardinality"]);
    }
  }

  const baseRect = slotsById.get("BASE_HEAD")?.slotRect;
  if (!baseRect || JSON.stringify(baseRect) !== JSON.stringify({ x: 0, y: 0, width: 1187, height: 1484 })) {
    add("BASE_HEAD must own the complete 1187x1484 face-space", ["slots"]);
  }

  const bilateralPairs = [["BROW_L", "BROW_R"], ["EYE_L", "EYE_R"], ["GAZE_L", "GAZE_R"]] as const;
  for (const [leftId, rightId] of bilateralPairs) {
    const left = slotsById.get(leftId)?.slotRect;
    const right = slotsById.get(rightId)?.slotRect;
    if (!left || !right) continue;
    if (left.width !== right.width || left.height !== right.height || left.x !== FACE_SPACE_WIDTH - right.x - right.width || left.y !== right.y) {
      add(`${leftId}/${rightId} slotRects must be mirrored with identical dimensions`, ["slots"]);
    }
  }
  if (JSON.stringify(slotsById.get("GAZE_L")?.slotRect) !== JSON.stringify(slotsById.get("EYE_L")?.slotRect) ||
      JSON.stringify(slotsById.get("GAZE_R")?.slotRect) !== JSON.stringify(slotsById.get("EYE_R")?.slotRect)) {
    add("each gaze slotRect must exactly equal its corresponding eye slotRect", ["slots"]);
  }

  const regionIds = contract.replacementRegions.map(region => region.id);
  if (new Set(regionIds).size !== Object.keys(CANONICAL_REGION_SPECS).length ||
      Object.keys(CANONICAL_REGION_SPECS).some(id => !regionIds.includes(id))) {
    add("replacementRegions must contain every frozen region exactly once", ["replacementRegions"]);
  }
  contract.replacementRegions.forEach((region, index) => {
    const spec = CANONICAL_REGION_SPECS[region.id as keyof typeof CANONICAL_REGION_SPECS];
    if (!spec || region.primaryOwner !== spec.owner || region.policy !== spec.policy ||
        JSON.stringify(region.rect) !== JSON.stringify(spec.rect)) {
      add(`${region.id} owner, policy, and rect must match the frozen region specification`, ["replacementRegions", index]);
    }
    const { x, y, width, height } = region.rect;
    if (x + width > FACE_SPACE_WIDTH || y + height > FACE_SPACE_HEIGHT) {
      add(`${region.id} exceeds canonical face-space`, ["replacementRegions", index, "rect"]);
    }
    const ownerRect = slotsById.get(region.primaryOwner)?.slotRect;
    if (ownerRect && (x < ownerRect.x || y < ownerRect.y || x + width > ownerRect.x + ownerRect.width || y + height > ownerRect.y + ownerRect.height)) {
      add(`${region.id} bounding envelope must be contained by its owner slotRect`, ["replacementRegions", index, "rect"]);
    }
  });
  for (const [slotIndex, slot] of contract.slots.entries()) {
    for (const regionId of slot.replacementRegionIds) {
      const region = contract.replacementRegions.find(candidate => candidate.id === regionId);
      if (!region || region.primaryOwner !== slot.id) {
        add(`${slot.id} replacement region references must resolve back to that slot`, ["slots", slotIndex, "replacementRegionIds"]);
      }
    }
  }
  const expectedOverlaps = [
    { under: "EYE_R", over: "GAZE_R", policy: "CLIP_TO_EYE_APERTURE" },
    { under: "EYE_L", over: "GAZE_L", policy: "CLIP_TO_EYE_APERTURE" },
  ];
  if (JSON.stringify(contract.compositor.allowedOrdinaryOverlaps) !== JSON.stringify(expectedOverlaps)) {
    add("allowedOrdinaryOverlaps must contain only the two eye-to-gaze painted-feature overlaps", ["compositor", "allowedOrdinaryOverlaps"]);
  }

  const expectedCatalog: Record<(typeof SLOT_IDS)[number], readonly string[]> = {
    BASE_HEAD: ["NEUTRAL"],
    BROW_L: BROW_STATES,
    BROW_R: BROW_STATES,
    EYE_L: EYE_STATES,
    EYE_R: EYE_STATES,
    GAZE_L: GAZE_STATES,
    GAZE_R: GAZE_STATES,
    MIDFACE: MIDFACE_STATES,
    LOWER_FACE: LOWER_FACE_STATES,
    MACRO_OVERRIDE: MACRO_STATES,
  };
  const globalRecordIds: string[] = [];
  for (const slotId of SLOT_IDS) {
    const records = contract.stateCatalog[slotId];
    const actual = records.map(record => record.semanticState);
    if (JSON.stringify(actual) !== JSON.stringify(expectedCatalog[slotId])) {
      add(`${slotId} must use the exact frozen v0.1 semantic catalog`, ["stateCatalog", slotId]);
    }
    records.forEach((record, index) => {
      globalRecordIds.push(record.recordId);
      if (record.recordId !== `${slotId}__${record.semanticState}`) {
        add("recordId must be the globally unique <SLOT>__<SEMANTIC_STATE> compound ID", ["stateCatalog", slotId, index, "recordId"]);
      }
      if ("assetBindingId" in record && record.assetBindingId !== record.recordId) {
        add("raster/macro assetBindingId must equal the canonical slot-state binding key", ["stateCatalog", slotId, index, "assetBindingId"]);
      }
      if ("gazeRigBindingId" in record && record.gazeRigBindingId !== `${slotId}__RIG`) {
        add("gazeRigBindingId must name the single side-local canonical rig", ["stateCatalog", slotId, index, "gazeRigBindingId"]);
      }
    });
  }
  if (new Set(globalRecordIds).size !== globalRecordIds.length) {
    add("state catalog recordIds must be globally unique", ["stateCatalog"]);
  }

  const gazePairs = GAZE_STATES.map((semanticState, index) => [
    contract.stateCatalog.GAZE_L[index], contract.stateCatalog.GAZE_R[index], semanticState,
  ] as const);
  for (const [left, right, semanticState] of gazePairs) {
    if (JSON.stringify(left.normalizedIrisOffset) !== JSON.stringify(right.normalizedIrisOffset) || left.pupilScale !== right.pupilScale) {
      add(`${semanticState} gaze transform must be bilaterally identical in anatomical coordinates`, ["stateCatalog"]);
    }
    const { x, y } = left.normalizedIrisOffset;
    const directionIsValid =
      (semanticState === "CENTER" && x === 0 && y === 0) ||
      (semanticState === "LOOK_ANATOMICAL_LEFT" && x > 0 && y === 0) ||
      (semanticState === "LOOK_ANATOMICAL_RIGHT" && x < 0 && y === 0) ||
      (semanticState === "LOOK_UP" && x === 0 && y < 0) ||
      (semanticState === "LOOK_DOWN" && x === 0 && y > 0);
    if (!directionIsValid) add(`${semanticState} gaze offset violates the frozen anatomical direction signs`, ["stateCatalog"]);
    const canonical = CANONICAL_GAZE_TRANSFORMS[semanticState];
    if (JSON.stringify(left.normalizedIrisOffset) !== JSON.stringify(canonical.normalizedIrisOffset) ||
        left.pupilScale !== canonical.pupilScale) {
      add(`${semanticState} must use the frozen v0.1 gaze magnitude and pupil scale`, ["stateCatalog"]);
    }
  }

  for (const slotId of SLOT_IDS) {
    const selected = contract.defaultSelection[slotId];
    if (slotId === "MACRO_OVERRIDE") {
      if (selected !== null) add("canonical neutral selection must not enable a macro", ["defaultSelection", slotId]);
      continue;
    }
    if (!contract.stateCatalog[slotId].some(record => record.semanticState === selected)) {
      add(`${slotId} default selection must resolve in its slot catalog`, ["defaultSelection", slotId]);
    }
  }

  const anchorIds = contract.anchors.map(anchor => anchor.id);
  if (anchorIds.length !== REQUIRED_ANCHOR_IDS.length || new Set(anchorIds).size !== REQUIRED_ANCHOR_IDS.length ||
      JSON.stringify(anchorIds) !== JSON.stringify(REQUIRED_ANCHOR_IDS)) {
    add("anchors must contain every required anatomical ID exactly once", ["anchors"]);
  }
  contract.anchors.forEach((anchor, index) => {
    if (JSON.stringify(anchor.pixel) !== JSON.stringify(CANONICAL_ANCHOR_PIXELS[anchor.id])) {
      add(`${anchor.id} pixel coordinate must equal the frozen v0.1 anchor`, ["anchors", index, "pixel"]);
    }
    if (anchor.pixel.x < 0 || anchor.pixel.x > FACE_SPACE_WIDTH - 1 || anchor.pixel.y < 0 || anchor.pixel.y > FACE_SPACE_HEIGHT - 1) {
      add(`${anchor.id} pixel coordinate is outside face-space`, ["anchors", index, "pixel"]);
    }
    const expectedX = anchor.pixel.x / (FACE_SPACE_WIDTH - 1);
    const expectedY = anchor.pixel.y / (FACE_SPACE_HEIGHT - 1);
    if (Math.abs(anchor.normalized.x - expectedX) > contract.faceSpace.normalizedTolerance ||
        Math.abs(anchor.normalized.y - expectedY) > contract.faceSpace.normalizedTolerance) {
      add(`${anchor.id} normalized coordinate does not round-trip from face-space`, ["anchors", index, "normalized"]);
    }
  });

  const macro = contract.stateCatalog.MACRO_OVERRIDE[0];
  const suppressed = new Set(macro.suppressesSlots);
  const allowed = new Set(macro.allowsSlots);
  if ([...suppressed].some(id => allowed.has(id))) add("macro allow/suppress lists must be disjoint", ["stateCatalog", "MACRO_OVERRIDE", 0]);
  const macroUniverse = new Set([...suppressed, ...allowed]);
  if (macroUniverse.size !== ORDINARY_EXPRESSION_SLOT_IDS.length || ORDINARY_EXPRESSION_SLOT_IDS.some(id => !macroUniverse.has(id))) {
    add("macro allow/suppress lists must exhaust every ordinary expression slot", ["stateCatalog", "MACRO_OVERRIDE", 0]);
  }
  if (JSON.stringify(macro.suppressesSlots) !== JSON.stringify(ORDINARY_EXPRESSION_SLOT_IDS) ||
      macro.allowsSlots.length !== 0 || macro.precedence !== 1000 ||
      contract.compositor.drawOrder.at(-1) !== "MACRO_OVERRIDE") {
    add("PUFFED_CHEEKS must suppress all eight ordinary slots, allow none, and render last at precedence 1000", ["stateCatalog", "MACRO_OVERRIDE", 0]);
  }

  const anchorsById = new Map(contract.anchors.map(anchor => [anchor.id, anchor]));
  const mirrorPairs = [
    ["BROW_L_CENTER", "BROW_R_CENTER"], ["EYE_L_CENTER", "EYE_R_CENTER"],
    ["PUPIL_L_NEUTRAL_CENTER", "PUPIL_R_NEUTRAL_CENTER"], ["NOSTRIL_L", "NOSTRIL_R"],
    ["MOUTH_L_CORNER", "MOUTH_R_CORNER"], ["JAW_L_REFERENCE", "JAW_R_REFERENCE"],
  ] as const;
  for (const [leftId, rightId] of mirrorPairs) {
    const left = anchorsById.get(leftId)?.pixel;
    const right = anchorsById.get(rightId)?.pixel;
    if (!left || !right || left.x <= right.x || Math.abs((left.x + right.x) - (FACE_SPACE_WIDTH - 1)) > 1e-9 || left.y !== right.y) {
      add(`${leftId}/${rightId} must remain mirrored with anatomical left on image-right`, ["anchors"]);
    }
  }
});

export type ChassisContract = z.infer<typeof chassisContractSchema>;
export type SlotId = z.infer<typeof slotIdSchema>;
export type Side = z.infer<typeof sideSchema>;

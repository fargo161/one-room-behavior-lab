import { describe, expect, it } from "vitest";

import { chassisContract } from "./contract";
import {
  createDesignedIdentityPackManifest,
  DESIGNED_GENERIC_IDENTITY_PACK,
  identityPackManifestSchema,
  isValidatedAsset,
  type IdentityPackAsset,
  type IdentityPackManifest,
} from "./identityPack";
import {
  normalizedToPixel,
  pixelToNormalized,
  planComposition,
  planRenderableComposition,
  selectionRequestSchema,
} from "./runtime";
import {
  CANONICAL_DRAW_ORDER,
  chassisContractSchema,
  ORDINARY_EXPRESSION_SLOT_IDS,
  REQUIRED_ANCHOR_IDS,
  SLOT_IDS,
  type ChassisContract,
} from "./schema";

function mutableContract(): ChassisContract {
  return structuredClone(chassisContract);
}

function mutablePack(): IdentityPackManifest {
  return structuredClone(DESIGNED_GENERIC_IDENTITY_PACK);
}

type RasterAsset = Extract<IdentityPackAsset, { kind: "RASTER" }>;
type GazeRigAsset = Extract<IdentityPackAsset, { kind: "GAZE_RIG" }>;

function firstRasterAsset(value: IdentityPackManifest): RasterAsset {
  return value.assets.find((asset): asset is RasterAsset => asset.kind === "RASTER")!;
}

function firstGazeRigAsset(value: IdentityPackManifest): GazeRigAsset {
  return value.assets.find((asset): asset is GazeRigAsset => asset.kind === "GAZE_RIG")!;
}

function renderablePlaceholderPack(): IdentityPackManifest {
  const value = mutablePack();
  value.assets.forEach(asset => {
    asset.implementationStatus = "PLACEHOLDER";
    if (asset.kind === "RASTER") {
      asset.assetPath = `placeholders/${asset.assetId}.png`;
      asset.replacementMaskPath = ["BASE_HEAD", "MACRO_OVERRIDE"].includes(asset.slotId)
        ? null
        : `placeholders/${asset.assetId}.mask.png`;
    } else {
      asset.irisSpritePath = `placeholders/${asset.assetId}.iris.png`;
      asset.pupilSpritePath = `placeholders/${asset.assetId}.pupil.png`;
      asset.apertureMaskPath = `placeholders/${asset.assetId}.aperture.png`;
      asset.maxOffsetPixels = { x: 30, y: 20 };
    }
  });
  return identityPackManifestSchema.parse(value);
}

const contractMutations: Array<[string, (value: ChassisContract) => void]> = [
  ["slot role", value => { value.slots[1].role = "BASE"; }],
  ["slot order", value => { [value.slots[1], value.slots[2]] = [value.slots[2], value.slots[1]]; }],
  ["region owner", value => { value.replacementRegions[2].primaryOwner = "MIDFACE"; }],
  ["region geometry", value => { value.replacementRegions[2].rect.x += 1; }],
  ["painted overlap", value => { value.compositor.allowedOrdinaryOverlaps.pop(); }],
  ["anchor closure", value => { value.anchors.push(value.anchors[0]); }],
  ["anatomical side", value => { value.slots[1].side = "RIGHT"; }],
  ["gaze sign", value => { value.stateCatalog.GAZE_L[1].normalizedIrisOffset.x = -0.72; }],
  ["gaze parity", value => { value.stateCatalog.GAZE_R[4].pupilScale = 0.9; }],
  ["gaze magnitude", value => {
    value.stateCatalog.GAZE_L[1].normalizedIrisOffset.x = 0.6;
    value.stateCatalog.GAZE_R[1].normalizedIrisOffset.x = 0.6;
  }],
  ["gaze pupil scale", value => {
    value.stateCatalog.GAZE_L[3].pupilScale = 0.97;
    value.stateCatalog.GAZE_R[3].pupilScale = 0.97;
  }],
  ["coordinated anchor geometry", value => {
    value.anchors[1].pixel.x += 1;
    value.anchors[1].normalized.x = value.anchors[1].pixel.x / 1186;
  }],
  ["macro partition", value => { value.stateCatalog.MACRO_OVERRIDE[0].allowsSlots.push("BROW_L"); }],
  ["macro order", value => { value.stateCatalog.MACRO_OVERRIDE[0].suppressesSlots.reverse(); }],
];

const packMutations: Array<[string, (value: IdentityPackManifest) => void]> = [
  ["duplicate asset ID", value => { value.assets[1].assetId = value.assets[0].assetId; }],
  ["missing state binding", value => { value.bindings.pop(); }],
  ["wrong slot canvas", value => { firstRasterAsset(value).canvas.width += 1; }],
  ["dangling binding", value => { value.bindings[0].assetId = "MISSING"; }],
  ["false visual pass", value => { value.assets[0].visualValidationStatus = "PASSED"; }],
  ["invented designed path", value => { firstRasterAsset(value).assetPath = "pixels.png"; }],
  ["wrong gaze side", value => { firstGazeRigAsset(value).side = "RIGHT"; }],
  ["invented designed travel", value => { firstGazeRigAsset(value).maxOffsetPixels = { x: 1, y: 1 }; }],
  ["reference runtime binding", value => { value.assets[0].provenance.genericCompatibility = "REFERENCE_ONLY"; }],
];

describe("male face chassis v0.1 public contract", () => {
  it("parses the checked contract and freezes the catalog surface", () => {
    expect(chassisContractSchema.parse(chassisContract)).toEqual(chassisContract);
    expect(chassisContract.slots.map(slot => slot.id)).toEqual(SLOT_IDS);
    expect(chassisContract.compositor.drawOrder).toEqual(CANONICAL_DRAW_ORDER);
    expect(chassisContract.anchors.map(anchor => anchor.id)).toEqual(REQUIRED_ANCHOR_IDS);
    expect(Object.values(chassisContract.stateCatalog).flat()).toHaveLength(48);
    expect(JSON.stringify(chassisContract.stateCatalog)).not.toContain("SHUT_TIGHT");
  });

  it("pins the authoritative source, canonical face-space, and pixel-center normalization", () => {
    expect(chassisContract.authority.marcusPxzSha256).toBe(
      "D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7",
    );
    expect(chassisContract.faceSpace).toMatchObject({ width: 1187, height: 1484 });
    const point = { x: 755, y: 550 };
    expect(normalizedToPixel(pixelToNormalized(point))).toEqual(point);
  });

  it.each(contractMutations)("rejects a corrupted %s invariant", (_label, mutate) => {
    const value = mutableContract();
    mutate(value);
    expect(chassisContractSchema.safeParse(value).success).toBe(false);
  });
});

describe("identity-pack manifest", () => {
  it("materializes complete designed-only descriptors without claiming pixels", () => {
    const pack = createDesignedIdentityPackManifest();
    expect(pack.assets).toHaveLength(40);
    expect(pack.assets.filter(asset => asset.kind === "RASTER")).toHaveLength(38);
    expect(pack.assets.filter(asset => asset.kind === "GAZE_RIG")).toHaveLength(2);
    expect(pack.bindings).toHaveLength(48);
    expect(pack.assets.every(asset => asset.implementationStatus === "DESIGNED")).toBe(true);
    expect(pack.assets.every(asset => !isValidatedAsset(asset))).toBe(true);
    expect(pack.assets.every(asset => {
      if (asset.kind === "RASTER") return asset.assetPath === null && asset.replacementMaskPath === null;
      return asset.irisSpritePath === null && asset.pupilSpritePath === null &&
        asset.apertureMaskPath === null && asset.maxOffsetPixels === null;
    })).toBe(true);
  });

  it.each(packMutations)("rejects %s", (_label, mutate) => {
    const value = mutablePack();
    mutate(value);
    expect(identityPackManifestSchema.safeParse(value).success).toBe(false);
  });
});

describe("deterministic composition planning", () => {
  it("fills the neutral selection and renders in canonical order", () => {
    const plan = planComposition();
    expect(plan.diagnostics).toEqual([]);
    expect(plan.renderPlan.map(entry => entry.slotId)).toEqual(CANONICAL_DRAW_ORDER.slice(0, -1));
    expect(plan.requestedSelection.MACRO_OVERRIDE).toBeNull();
  });

  it("preserves requested intent while an active macro suppresses all ordinary slots", () => {
    const plan = planComposition({ BROW_L: "ANGRY_ARCHED", GAZE_R: "LOOK_UP", MACRO_OVERRIDE: "PUFFED_CHEEKS" });
    expect(plan.requestedSelection.BROW_L).toBe("ANGRY_ARCHED");
    expect(plan.requestedSelection.GAZE_R).toBe("LOOK_UP");
    expect(plan.renderPlan.map(entry => entry.slotId)).toEqual(["BASE_HEAD", "MACRO_OVERRIDE"]);
    expect(plan.diagnostics.map(diagnostic => diagnostic.slotId)).toEqual(ORDINARY_EXPRESSION_SLOT_IDS);
  });

  it("suppresses gaze under a closed eye and clamps it under a squint", () => {
    const closed = planComposition({ EYE_L: "CLOSED_TIGHT", GAZE_L: "LOOK_UP" });
    expect(closed.effectiveSelection.GAZE_L).toBeNull();
    expect(closed.diagnostics).toContainEqual(expect.objectContaining({ code: "GAZE_SUPPRESSED_BY_CLOSED_EYE", slotId: "GAZE_L" }));

    const squint = planComposition({ EYE_R: "SQUINT_TIGHT", GAZE_R: "LOOK_ANATOMICAL_LEFT" });
    const gaze = squint.renderPlan.find(entry => entry.slotId === "GAZE_R")!;
    expect(gaze.normalizedIrisOffset).toEqual({ x: 0.72 * 0.35, y: 0 });
  });

  it("rejects unknown keys and states before planning", () => {
    expect(selectionRequestSchema.safeParse({ EYE_L: "SHUT_TIGHT" }).success).toBe(false);
    expect(selectionRequestSchema.safeParse({ unknown: "NEUTRAL" }).success).toBe(false);
  });

  it("rejects designed-only descriptors before rendering", () => {
    expect(() => planRenderableComposition({}, DESIGNED_GENERIC_IDENTITY_PACK)).toThrow(
      "designed but has no renderable pixels",
    );
  });

  it("resolves placeholder pixels and consumes gaze aperture/travel limits", () => {
    const pack = renderablePlaceholderPack();
    const plan = planRenderableComposition(
      { EYE_R: "SQUINT_TIGHT", GAZE_R: "LOOK_ANATOMICAL_LEFT" },
      pack,
    );
    const gaze = plan.resolvedRenderPlan.find(entry => entry.slotId === "GAZE_R")!;
    expect(gaze.kind).toBe("GAZE_RIG");
    if (gaze.kind !== "GAZE_RIG") throw new Error("expected gaze rig");
    expect(gaze.clipPolicy).toBe("CLIP_TO_EYE_APERTURE");
    expect(gaze.apertureMaskPath).toContain("aperture.png");
    expect(gaze.maxOffsetPixels).toEqual({ x: 30, y: 20 });
    expect(gaze.irisOffsetPixels).toEqual({ x: 0.72 * 0.35 * 30, y: 0 });
  });
});

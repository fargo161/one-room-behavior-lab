import { z } from "zod";

import { chassisContract } from "./contract";
import {
  CHASSIS_ID,
  REQUIRED_ANCHOR_IDS,
  SCHEMA_VERSION,
  SLOT_IDS,
  slotIdSchema,
  type ChassisContract,
} from "./schema";

export const RASTER_SLOT_IDS = [
  "BASE_HEAD", "BROW_L", "BROW_R", "EYE_L", "EYE_R", "MIDFACE", "LOWER_FACE", "MACRO_OVERRIDE",
] as const;
export const GAZE_SLOT_IDS = ["GAZE_L", "GAZE_R"] as const;

const implementationStatusSchema = z.enum(["DESIGNED", "PLACEHOLDER", "IMPLEMENTED"]);
const automatedTestStatusSchema = z.enum(["NOT_RUN", "PASSED", "FAILED"]);
const visualValidationStatusSchema = z.enum(["NOT_REVIEWED", "PASSED", "FAILED", "NOT_APPLICABLE"]);
const assetOriginSchema = z.enum(["REFERENCE", "DERIVED", "AUTHORED", "PLACEHOLDER"]);
const genericCompatibilitySchema = z.enum(["GENERIC", "IDENTITY_BOUND", "REFERENCE_ONLY"]);

const provenanceSchema = z.object({
  origin: assetOriginSchema,
  genericCompatibility: genericCompatibilitySchema,
  sourceSha256: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
  sourceLayerIds: z.array(z.string().min(1)),
}).strict();

const realitySchema = z.object({
  implementationStatus: implementationStatusSchema,
  automatedTestStatus: automatedTestStatusSchema,
  visualValidationStatus: visualValidationStatusSchema,
}).strict();

const anchorAttachmentSchema = z.object({
  anchorId: z.enum(REQUIRED_ANCHOR_IDS),
  localPoint: z.object({ x: z.number().finite(), y: z.number().finite() }).strict(),
}).strict();

const rasterAssetSchema = z.object({
  kind: z.literal("RASTER"),
  assetId: z.string().min(1),
  bindingId: z.string().min(1),
  slotId: z.enum(RASTER_SLOT_IDS),
  canvas: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  localOrigin: z.object({ x: z.literal(0), y: z.literal(0) }).strict(),
  assetPath: z.string().min(1).nullable(),
  replacementMaskPath: z.string().min(1).nullable(),
  anchorAttachments: z.array(anchorAttachmentSchema),
  provenance: provenanceSchema,
}).merge(realitySchema).strict();

const gazeRigAssetSchema = z.object({
  kind: z.literal("GAZE_RIG"),
  assetId: z.string().min(1),
  bindingId: z.string().min(1),
  slotId: z.enum(GAZE_SLOT_IDS),
  side: z.enum(["LEFT", "RIGHT"]),
  irisSpritePath: z.string().min(1).nullable(),
  pupilSpritePath: z.string().min(1).nullable(),
  apertureMaskPath: z.string().min(1).nullable(),
  neutralCenterAnchorId: z.enum(["PUPIL_L_NEUTRAL_CENTER", "PUPIL_R_NEUTRAL_CENTER"]),
  maxOffsetPixels: z.object({ x: z.number().finite().positive(), y: z.number().finite().positive() }).strict().nullable(),
  provenance: provenanceSchema,
}).merge(realitySchema).strict();

const stateBindingSchema = z.object({
  recordId: z.string().min(1),
  slotId: slotIdSchema,
  semanticState: z.string().min(1),
  assetId: z.string().min(1),
}).strict();

const identityPackManifestBaseSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  chassisId: z.literal(CHASSIS_ID),
  identityPackId: z.string().regex(/^[A-Z0-9][A-Z0-9_]*$/),
  identityBinding: z.literal("GENERIC"),
  assets: z.array(z.discriminatedUnion("kind", [rasterAssetSchema, gazeRigAssetSchema])),
  bindings: z.array(stateBindingSchema),
}).strict();

type IdentityPackManifestBase = z.infer<typeof identityPackManifestBaseSchema>;
type IdentityAsset = IdentityPackManifestBase["assets"][number];

function publicCatalogPairs(contract: ChassisContract) {
  return SLOT_IDS.flatMap(slotId => contract.stateCatalog[slotId].map(record => ({
    slotId,
    semanticState: record.semanticState,
    publicBindingId: "assetBindingId" in record ? record.assetBindingId : record.gazeRigBindingId,
  })));
}

function assetIsValidated(asset: IdentityAsset): boolean {
  return asset.implementationStatus === "IMPLEMENTED" &&
    asset.automatedTestStatus === "PASSED" &&
    asset.visualValidationStatus === "PASSED";
}

export function isValidatedAsset(asset: IdentityAsset): boolean {
  return assetIsValidated(asset);
}

export const identityPackManifestSchema = identityPackManifestBaseSchema.superRefine((manifest, ctx) => {
  const add = (message: string, path: (string | number)[] = []) =>
    ctx.addIssue({ code: "custom", message, path });
  const assetsById = new Map(manifest.assets.map(asset => [asset.assetId, asset]));
  if (assetsById.size !== manifest.assets.length) add("assetId values must be globally unique", ["assets"]);

  const bindingIds = manifest.bindings.map(binding => binding.recordId);
  if (new Set(bindingIds).size !== bindingIds.length) add("binding recordId values must be globally unique", ["bindings"]);

  const expectedPairs = publicCatalogPairs(chassisContract);
  const expectedPairKeys = expectedPairs.map(pair => `${pair.slotId}::${pair.semanticState}`);
  const actualPairKeys = manifest.bindings.map(binding => `${binding.slotId}::${binding.semanticState}`);
  if (actualPairKeys.length !== expectedPairKeys.length ||
      new Set(actualPairKeys).size !== expectedPairKeys.length ||
      expectedPairKeys.some(pair => !actualPairKeys.includes(pair))) {
    add("bindings must cover every public slot/state pair exactly once and contain no extras", ["bindings"]);
  }

  manifest.bindings.forEach((binding, index) => {
    if (binding.recordId !== `${manifest.identityPackId}::${binding.slotId}::${binding.semanticState}`) {
      add("binding recordId must use <IDENTITY_PACK>::<SLOT>::<SEMANTIC_STATE>", ["bindings", index, "recordId"]);
    }
    if (binding.semanticState === "SHUT_TIGHT") {
      add("SHUT_TIGHT is reference-only and cannot be a public binding", ["bindings", index, "semanticState"]);
    }
    const asset = assetsById.get(binding.assetId);
    const pair = expectedPairs.find(candidate => candidate.slotId === binding.slotId && candidate.semanticState === binding.semanticState);
    if (!asset || !pair) {
      add("binding must resolve to a declared asset and public state", ["bindings", index]);
      return;
    }
    if (asset.slotId !== binding.slotId || asset.bindingId !== pair.publicBindingId) {
      add("binding asset must match the public slot and binding key", ["bindings", index, "assetId"]);
    }
    if ((binding.slotId === "GAZE_L" || binding.slotId === "GAZE_R") !== (asset.kind === "GAZE_RIG")) {
      add("gaze states must bind gaze rigs; every other state must bind raster assets", ["bindings", index, "assetId"]);
    }
    if (asset.provenance.genericCompatibility !== "GENERIC") {
      add("runtime bindings in a generic pack may reference only GENERIC assets", ["bindings", index, "assetId"]);
    }
  });

  const referencedAssets = new Set(manifest.bindings.map(binding => binding.assetId));
  manifest.assets.forEach((asset, index) => {
    const { provenance } = asset;
    if (!referencedAssets.has(asset.assetId) && provenance.genericCompatibility !== "REFERENCE_ONLY") {
      add("every non-reference asset must be reachable from a state binding", ["assets", index, "assetId"]);
    }
    if ((provenance.origin === "DERIVED" || provenance.origin === "REFERENCE") &&
        (provenance.sourceSha256 !== chassisContract.authority.marcusPxzSha256 || provenance.sourceLayerIds.length === 0)) {
      add("DERIVED/REFERENCE provenance must cite the pinned PXZ hash and at least one source layer", ["assets", index, "provenance"]);
    }
    if (referencedAssets.has(asset.assetId) && provenance.origin === "REFERENCE") {
      add("REFERENCE-origin pixels cannot be runtime-bound as generic assets", ["assets", index, "provenance", "origin"]);
    }
    if (asset.implementationStatus === "DESIGNED") {
      const paths = asset.kind === "RASTER"
        ? [asset.assetPath, asset.replacementMaskPath]
        : [asset.irisSpritePath, asset.pupilSpritePath, asset.apertureMaskPath];
      if (paths.some(path => path !== null) || asset.automatedTestStatus !== "NOT_RUN" ||
          !["NOT_REVIEWED", "NOT_APPLICABLE"].includes(asset.visualValidationStatus) ||
          (asset.kind === "GAZE_RIG" && asset.maxOffsetPixels !== null)) {
        add("DESIGNED descriptors must have null paths, NOT_RUN automation, and no visual pass/fail claim", ["assets", index]);
      }
    }
    if (asset.implementationStatus === "PLACEHOLDER") {
      if (provenance.origin !== "PLACEHOLDER" || asset.visualValidationStatus === "PASSED") {
        add("PLACEHOLDER assets require placeholder provenance and cannot visually pass", ["assets", index]);
      }
    }
    if (asset.implementationStatus === "IMPLEMENTED") {
      if (!["AUTHORED", "DERIVED"].includes(provenance.origin) || provenance.genericCompatibility !== "GENERIC") {
        add("IMPLEMENTED generic assets must be AUTHORED/DERIVED and GENERIC", ["assets", index]);
      }
    }
    if (asset.visualValidationStatus === "PASSED" && asset.implementationStatus !== "IMPLEMENTED") {
      add("visual PASSED requires IMPLEMENTED status", ["assets", index, "visualValidationStatus"]);
    }

    if (asset.kind === "RASTER") {
      const slot = chassisContract.slots.find(candidate => candidate.id === asset.slotId)!;
      if (asset.canvas.width !== slot.slotRect.width || asset.canvas.height !== slot.slotRect.height) {
        add("raster canvas must exactly equal its slotRect dimensions", ["assets", index, "canvas"]);
      }
      const expectedAnchorIds = slot.requiredAnchorIds;
      const actualAnchorIds = asset.anchorAttachments.map(attachment => attachment.anchorId);
      if (actualAnchorIds.length !== expectedAnchorIds.length || new Set(actualAnchorIds).size !== expectedAnchorIds.length ||
          JSON.stringify(actualAnchorIds) !== JSON.stringify(expectedAnchorIds)) {
        add("raster anchor attachments must exactly cover the slot-required anchors", ["assets", index, "anchorAttachments"]);
      }
      asset.anchorAttachments.forEach((attachment, attachmentIndex) => {
        const anchor = chassisContract.anchors.find(candidate => candidate.id === attachment.anchorId)!;
        const expected = { x: anchor.pixel.x - slot.slotRect.x, y: anchor.pixel.y - slot.slotRect.y };
        if (attachment.localPoint.x !== expected.x || attachment.localPoint.y !== expected.y) {
          add("anchor attachment localPoint must be derived from the canonical global anchor", ["assets", index, "anchorAttachments", attachmentIndex, "localPoint"]);
        }
      });
      const requiresMask = !["BASE_HEAD", "MACRO_OVERRIDE"].includes(asset.slotId) && asset.implementationStatus !== "DESIGNED";
      if (asset.implementationStatus !== "DESIGNED" && asset.assetPath === null) {
        add("PLACEHOLDER/IMPLEMENTED raster assets require an assetPath", ["assets", index, "assetPath"]);
      }
      if (requiresMask && asset.replacementMaskPath === null) {
        add("replacement raster assets require an explicit replacement mask", ["assets", index, "replacementMaskPath"]);
      }
    } else {
      const expectedSide = asset.slotId === "GAZE_L" ? "LEFT" : "RIGHT";
      const expectedAnchor = asset.slotId === "GAZE_L" ? "PUPIL_L_NEUTRAL_CENTER" : "PUPIL_R_NEUTRAL_CENTER";
      if (asset.side !== expectedSide || asset.neutralCenterAnchorId !== expectedAnchor || asset.bindingId !== `${asset.slotId}__RIG`) {
        add("gaze rig side, neutral anchor, and binding key must match its anatomical slot", ["assets", index]);
      }
      if (asset.implementationStatus !== "DESIGNED" &&
          ([asset.irisSpritePath, asset.pupilSpritePath, asset.apertureMaskPath].some(path => path === null) || asset.maxOffsetPixels === null)) {
        add("PLACEHOLDER/IMPLEMENTED gaze rigs require iris, pupil, and aperture assets", ["assets", index]);
      }
      if (asset.maxOffsetPixels !== null) {
        const slot = chassisContract.slots.find(candidate => candidate.id === asset.slotId)!;
        const aperture = chassisContract.replacementRegions.find(region => region.id === slot.replacementRegionIds[0])!;
        if (asset.maxOffsetPixels.x > aperture.rect.width / 2 || asset.maxOffsetPixels.y > aperture.rect.height / 2) {
          add("gaze maxOffsetPixels must remain within half of the frozen aperture envelope", ["assets", index, "maxOffsetPixels"]);
        }
      }
    }
  });
});

export type IdentityPackManifest = z.infer<typeof identityPackManifestSchema>;
export type IdentityPackAsset = IdentityPackManifest["assets"][number];

export function createDesignedIdentityPackManifest(identityPackId = "GENERIC_V0_1"): IdentityPackManifest {
  const assets: IdentityPackManifestBase["assets"] = [];
  const bindings: IdentityPackManifestBase["bindings"] = [];

  for (const slotId of SLOT_IDS) {
    const slot = chassisContract.slots.find(candidate => candidate.id === slotId)!;
    const records = chassisContract.stateCatalog[slotId];
    if (slotId === "GAZE_L" || slotId === "GAZE_R") {
      const assetId = `${identityPackId}::ASSET::${slotId}::RIG`;
      assets.push({
        kind: "GAZE_RIG",
        assetId,
        bindingId: `${slotId}__RIG`,
        slotId,
        side: slotId === "GAZE_L" ? "LEFT" : "RIGHT",
        irisSpritePath: null,
        pupilSpritePath: null,
        apertureMaskPath: null,
        neutralCenterAnchorId: slotId === "GAZE_L" ? "PUPIL_L_NEUTRAL_CENTER" : "PUPIL_R_NEUTRAL_CENTER",
        maxOffsetPixels: null,
        provenance: { origin: "PLACEHOLDER", genericCompatibility: "GENERIC", sourceSha256: null, sourceLayerIds: [] },
        implementationStatus: "DESIGNED",
        automatedTestStatus: "NOT_RUN",
        visualValidationStatus: "NOT_REVIEWED",
      });
      records.forEach(record => bindings.push({
        recordId: `${identityPackId}::${slotId}::${record.semanticState}`,
        slotId,
        semanticState: record.semanticState,
        assetId,
      }));
      continue;
    }

    records.forEach(record => {
      const assetId = `${identityPackId}::ASSET::${slotId}::${record.semanticState}`;
      const anchorAttachments = slot.requiredAnchorIds.map(anchorId => {
        const anchor = chassisContract.anchors.find(candidate => candidate.id === anchorId)!;
        return { anchorId, localPoint: { x: anchor.pixel.x - slot.slotRect.x, y: anchor.pixel.y - slot.slotRect.y } };
      });
      assets.push({
        kind: "RASTER",
        assetId,
        bindingId: "assetBindingId" in record ? record.assetBindingId : (() => { throw new Error(`Unexpected gaze record in ${slotId}`); })(),
        slotId,
        canvas: { width: slot.slotRect.width, height: slot.slotRect.height },
        localOrigin: { x: 0, y: 0 },
        assetPath: null,
        replacementMaskPath: null,
        anchorAttachments,
        provenance: { origin: "PLACEHOLDER", genericCompatibility: "GENERIC", sourceSha256: null, sourceLayerIds: [] },
        implementationStatus: "DESIGNED",
        automatedTestStatus: "NOT_RUN",
        visualValidationStatus: "NOT_REVIEWED",
      });
      bindings.push({
        recordId: `${identityPackId}::${slotId}::${record.semanticState}`,
        slotId,
        semanticState: record.semanticState,
        assetId,
      });
    });
  }

  return identityPackManifestSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    chassisId: CHASSIS_ID,
    identityPackId,
    identityBinding: "GENERIC",
    assets,
    bindings,
  });
}

export const DESIGNED_GENERIC_IDENTITY_PACK = createDesignedIdentityPackManifest();

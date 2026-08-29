import { z } from "zod";
import { marcusAssetManifest, marcusAssetsById } from "../assets/manifest";
import type { ExpressionLibraryExport } from "./types";

const layerSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().finite().positive().max(20),
  rotation: z.number().finite(),
}).strict();

const groupSchema = z.object({ id: z.string().min(1), name: z.string().trim().min(1) }).strict();

const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  groupId: z.string().min(1).nullable(),
  layers: z.array(layerSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).strict();

const librarySchema = z.object({
  schema: z.literal("trapstar-expression-library"),
  version: z.literal(1),
  assetSource: z.object({
    identity: z.literal("MARCUS"),
    manifestSchema: z.literal("trapstar-marcus-expression-assets"),
    manifestVersion: z.literal(1),
    sourceSha256: z.literal(marcusAssetManifest.source.sha256),
  }).strict(),
  groups: z.array(groupSchema),
  presets: z.array(presetSchema),
}).strict();

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function validateExpressionLibrary(input: unknown): { library: ExpressionLibraryExport; warnings: string[] } {
  const parsed = librarySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const location = first.path.length ? ` at ${first.path.join(".")}` : "";
    throw new Error(`Incompatible expression library${location}: ${first.message}`);
  }
  const library = parsed.data as ExpressionLibraryExport;
  const duplicateGroups = duplicateValues(library.groups.map(group => group.id));
  const duplicatePresets = duplicateValues(library.presets.map(preset => preset.id));
  if (duplicateGroups.length) throw new Error(`Duplicate group ID: ${duplicateGroups[0]}`);
  if (duplicatePresets.length) throw new Error(`Duplicate expression ID: ${duplicatePresets[0]}`);

  const groupIds = new Set(library.groups.map(group => group.id));
  for (const preset of library.presets) {
    if (preset.groupId !== null && !groupIds.has(preset.groupId)) {
      throw new Error(`${preset.name} references a missing group: ${preset.groupId}`);
    }
    const duplicateLayers = duplicateValues(preset.layers.map(layer => layer.id));
    if (duplicateLayers.length) throw new Error(`${preset.name} has duplicate layer ID: ${duplicateLayers[0]}`);
  }

  const missing = new Set<string>();
  for (const preset of library.presets) {
    for (const layer of preset.layers) {
      if (!marcusAssetsById.has(layer.assetId)) missing.add(layer.assetId);
    }
  }
  return {
    library: JSON.parse(JSON.stringify(library)) as ExpressionLibraryExport,
    warnings: [...missing].map(assetId => `Missing Marcus asset reference preserved: ${assetId}`),
  };
}

export function serializeExpressionLibrary(library: ExpressionLibraryExport): string {
  return `${JSON.stringify(validateExpressionLibrary(library).library, null, 2)}\n`;
}

export function parseExpressionLibraryJson(json: string): { library: ExpressionLibraryExport; warnings: string[] } {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new Error("Expression library is not valid JSON");
  }
  return validateExpressionLibrary(input);
}

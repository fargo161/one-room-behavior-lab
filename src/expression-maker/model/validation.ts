import { z } from "zod";
import { characterPacks, getCharacterPack } from "../character-packs/registry";
import { marcusPack } from "../character-packs/marcus";
import { cloneLayers, createDefaultLibrary } from "./defaults";
import type {
  ExpressionLibraryExport,
  LegacyMarcusExpressionLibraryV1,
} from "./types";

const packIdSchema = z.enum(["marcus", "goose"]);
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

const v2GroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  characterPackId: packIdSchema,
}).strict();

const v2PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  characterPackId: packIdSchema,
  groupId: z.string().min(1).nullable(),
  layers: z.array(layerSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).strict();

const v2LibrarySchema = z.object({
  schema: z.literal("trapstar-expression-library"),
  version: z.literal(2),
  assetSources: z.array(z.object({
    characterPackId: packIdSchema,
    identity: z.enum(["MARCUS", "GOOSE"]),
    manifestSchema: z.string().min(1),
    manifestVersion: z.number().int().positive(),
    sourceSha256: z.string().min(1),
  }).strict()),
  groups: z.array(v2GroupSchema),
  presets: z.array(v2PresetSchema),
}).strict();

const v1LibrarySchema = z.object({
  schema: z.literal("trapstar-expression-library"),
  version: z.literal(1),
  assetSource: z.object({
    identity: z.literal("MARCUS"),
    manifestSchema: z.literal("trapstar-marcus-expression-assets"),
    manifestVersion: z.literal(1),
    sourceSha256: z.literal(marcusPack.sourceSha256),
  }).strict(),
  groups: z.array(z.object({ id: z.string().min(1), name: z.string().trim().min(1) }).strict()),
  presets: z.array(z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    groupId: z.string().min(1).nullable(),
    layers: z.array(layerSchema),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }).strict()),
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

export function migrateLegacyMarcusLibrary(input: LegacyMarcusExpressionLibraryV1): ExpressionLibraryExport {
  const defaults = createDefaultLibrary();
  return {
    schema: "trapstar-expression-library",
    version: 2,
    assetSources: defaults.assetSources.map(source => ({ ...source })),
    groups: [
      ...input.groups.map(group => ({ ...group, characterPackId: "marcus" as const })),
      ...defaults.groups.filter(group => group.characterPackId === "goose").map(group => ({ ...group })),
    ],
    presets: [
      ...input.presets.map(preset => ({
        ...preset,
        characterPackId: "marcus" as const,
        layers: cloneLayers(preset.layers),
      })),
      ...defaults.presets.filter(preset => preset.characterPackId === "goose").map(preset => ({
        ...preset,
        layers: cloneLayers(preset.layers),
      })),
    ],
  };
}

function validateV2(library: ExpressionLibraryExport): { library: ExpressionLibraryExport; warnings: string[] } {
  const duplicateSources = duplicateValues(library.assetSources.map(source => source.characterPackId));
  const duplicateGroups = duplicateValues(library.groups.map(group => group.id));
  const duplicatePresets = duplicateValues(library.presets.map(preset => preset.id));
  if (duplicateSources.length) throw new Error(`Duplicate character-pack source: ${duplicateSources[0]}`);
  if (duplicateGroups.length) throw new Error(`Duplicate group ID: ${duplicateGroups[0]}`);
  if (duplicatePresets.length) throw new Error(`Duplicate expression ID: ${duplicatePresets[0]}`);

  for (const pack of characterPacks) {
    const source = library.assetSources.find(candidate => candidate.characterPackId === pack.id);
    if (!source) throw new Error(`Missing character-pack source: ${pack.id}`);
    if (source.identity !== pack.identity
      || source.manifestSchema !== pack.manifestSchema
      || source.manifestVersion !== pack.manifestVersion
      || source.sourceSha256 !== pack.sourceSha256) {
      throw new Error(`Character-pack source does not match installed ${pack.displayName} assets`);
    }
  }

  const groupsById = new Map(library.groups.map(group => [group.id, group]));
  const warnings: string[] = [];
  for (const preset of library.presets) {
    if (preset.groupId !== null) {
      const group = groupsById.get(preset.groupId);
      if (!group) throw new Error(`${preset.name} references a missing group: ${preset.groupId}`);
      if (group.characterPackId !== preset.characterPackId) {
        throw new Error(`${preset.name} cannot use a group from another character pack`);
      }
    }
    const duplicateLayers = duplicateValues(preset.layers.map(layer => layer.id));
    if (duplicateLayers.length) throw new Error(`${preset.name} has duplicate layer ID: ${duplicateLayers[0]}`);
    const pack = getCharacterPack(preset.characterPackId);
    for (const layer of preset.layers) {
      if (!pack.assetsById.has(layer.assetId)) {
        warnings.push(`Missing ${pack.displayName} asset reference preserved: ${layer.assetId}`);
      }
    }
  }

  return {
    library: JSON.parse(JSON.stringify(library)) as ExpressionLibraryExport,
    warnings: [...new Set(warnings)],
  };
}

export function validateExpressionLibrary(input: unknown): { library: ExpressionLibraryExport; warnings: string[] } {
  const v2 = v2LibrarySchema.safeParse(input);
  if (v2.success) return validateV2(v2.data as ExpressionLibraryExport);

  const v1 = v1LibrarySchema.safeParse(input);
  if (v1.success) {
    const migrated = migrateLegacyMarcusLibrary(v1.data as LegacyMarcusExpressionLibraryV1);
    const validated = validateV2(migrated);
    return {
      library: validated.library,
      warnings: ["Marcus library v1 migrated to multi-character library v2.", ...validated.warnings],
    };
  }

  const issue = (input as { version?: unknown })?.version === 1 ? v1.error.issues[0] : v2.error.issues[0];
  const location = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
  throw new Error(`Incompatible expression library${location}: ${issue?.message ?? "unsupported schema"}`);
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

import { findMarcusAsset } from "../assets/manifest";
import { cloneLayers, createId, createLayer } from "./defaults";
import type {
  ExpressionGroup,
  ExpressionLayer,
  ExpressionLibraryExport,
  ExpressionPreset,
  LayerMove,
  MarcusSlotId,
} from "./types";

function requireName(name: string, noun: string): string {
  const clean = name.trim();
  if (!clean) throw new Error(`${noun} name is required`);
  return clean;
}

function requireGroup(library: ExpressionLibraryExport, groupId: string | null): void {
  if (groupId !== null && !library.groups.some(group => group.id === groupId)) {
    throw new Error("Select an existing expression group");
  }
}

function copyLibrary(library: ExpressionLibraryExport): ExpressionLibraryExport {
  return {
    ...library,
    groups: library.groups.map(group => ({ ...group })),
    presets: library.presets.map(preset => ({ ...preset, layers: cloneLayers(preset.layers) })),
  };
}

export function addAssetLayer(layers: readonly ExpressionLayer[], assetId: string): ExpressionLayer[] {
  return [...cloneLayers(layers), { ...createLayer(assetId), visible: true }];
}

export function replaceAssetInSlot(layers: readonly ExpressionLayer[], assetId: string): { layers: ExpressionLayer[]; selectedId: string } {
  const asset = findMarcusAsset(assetId);
  if (!asset) throw new Error(`Unknown Marcus asset: ${assetId}`);
  const result = cloneLayers(layers);
  let index = -1;
  for (let candidateIndex = result.length - 1; candidateIndex >= 0; candidateIndex--) {
    if (findMarcusAsset(result[candidateIndex].assetId)?.slotId === asset.slotId) {
      index = candidateIndex;
      break;
    }
  }
  if (index < 0) {
    const layer = { ...createLayer(assetId), visible: true };
    result.push(layer);
    return { layers: result, selectedId: layer.id };
  }
  result[index] = {
    ...result[index],
    assetId,
    visible: true,
    locked: asset.slotId === "BASE_HEAD" ? true : result[index].locked,
  };
  return { layers: result, selectedId: result[index].id };
}

export function updateLayer(
  layers: readonly ExpressionLayer[],
  layerId: string,
  patch: Partial<Omit<ExpressionLayer, "id" | "assetId">>,
): ExpressionLayer[] {
  return layers.map(layer => {
    if (layer.id !== layerId) return { ...layer };
    if (layer.locked && (patch.x !== undefined || patch.y !== undefined || patch.scale !== undefined || patch.rotation !== undefined)) {
      return { ...layer };
    }
    const next = { ...layer, ...patch };
    if (!Number.isFinite(next.x) || !Number.isFinite(next.y) || !Number.isFinite(next.rotation)) return { ...layer };
    if (!Number.isFinite(next.scale) || next.scale <= 0 || next.scale > 20) return { ...layer };
    return next;
  });
}

export function removeLayer(layers: readonly ExpressionLayer[], layerId: string): ExpressionLayer[] {
  return layers.filter(layer => layer.id !== layerId || layer.locked).map(layer => ({ ...layer }));
}

export function reorderLayer(layers: readonly ExpressionLayer[], layerId: string, targetIndex: number): ExpressionLayer[] {
  const result = cloneLayers(layers);
  const fromIndex = result.findIndex(layer => layer.id === layerId);
  if (fromIndex < 0 || result[fromIndex].locked) return result;
  const [layer] = result.splice(fromIndex, 1);
  const bounded = Math.max(0, Math.min(targetIndex, result.length));
  result.splice(bounded, 0, layer);
  return result;
}

export function moveLayer(layers: readonly ExpressionLayer[], layerId: string, movement: LayerMove): ExpressionLayer[] {
  const index = layers.findIndex(layer => layer.id === layerId);
  if (index < 0 || layers[index].locked) return cloneLayers(layers);
  const target = movement === "UP" ? index + 1
    : movement === "DOWN" ? index - 1
      : movement === "FRONT" ? layers.length - 1
        : 0;
  return reorderLayer(layers, layerId, target);
}

export function createGroup(
  library: ExpressionLibraryExport,
  name: string,
  id = createId("group"),
): ExpressionLibraryExport {
  const next = copyLibrary(library);
  next.groups.push({ id, name: requireName(name, "Group") });
  return next;
}

export function renameGroup(library: ExpressionLibraryExport, groupId: string, name: string): ExpressionLibraryExport {
  const next = copyLibrary(library);
  const group = next.groups.find(candidate => candidate.id === groupId);
  if (!group) throw new Error("Expression group was not found");
  group.name = requireName(name, "Group");
  return next;
}

export function deleteEmptyGroup(library: ExpressionLibraryExport, groupId: string): ExpressionLibraryExport {
  if (library.presets.some(preset => preset.groupId === groupId)) throw new Error("Move or delete this group’s expressions first");
  return { ...copyLibrary(library), groups: library.groups.filter(group => group.id !== groupId).map(group => ({ ...group })) };
}

export function saveNewPreset(
  library: ExpressionLibraryExport,
  name: string,
  groupId: string | null,
  layers: readonly ExpressionLayer[],
  options: { id?: string; now?: string } = {},
): { library: ExpressionLibraryExport; preset: ExpressionPreset } {
  requireGroup(library, groupId);
  const now = options.now ?? new Date().toISOString();
  const preset: ExpressionPreset = {
    id: options.id ?? createId("preset"),
    name: requireName(name, "Expression"),
    groupId,
    layers: cloneLayers(layers),
    createdAt: now,
    updatedAt: now,
  };
  if (library.presets.some(candidate => candidate.id === preset.id)) throw new Error("Expression ID already exists");
  const next = copyLibrary(library);
  next.presets.push(preset);
  return { library: next, preset: { ...preset, layers: cloneLayers(preset.layers) } };
}

export function updatePreset(
  library: ExpressionLibraryExport,
  presetId: string,
  layers: readonly ExpressionLayer[],
  groupId?: string | null,
  now = new Date().toISOString(),
): ExpressionLibraryExport {
  const next = copyLibrary(library);
  const preset = next.presets.find(candidate => candidate.id === presetId);
  if (!preset) throw new Error("Open an expression before updating it");
  if (groupId !== undefined) {
    requireGroup(next, groupId);
    preset.groupId = groupId;
  }
  preset.layers = cloneLayers(layers);
  preset.updatedAt = now;
  return next;
}

export function renamePreset(library: ExpressionLibraryExport, presetId: string, name: string): ExpressionLibraryExport {
  const next = copyLibrary(library);
  const preset = next.presets.find(candidate => candidate.id === presetId);
  if (!preset) throw new Error("Expression was not found");
  preset.name = requireName(name, "Expression");
  preset.updatedAt = new Date().toISOString();
  return next;
}

export function movePresetToGroup(library: ExpressionLibraryExport, presetId: string, groupId: string | null): ExpressionLibraryExport {
  requireGroup(library, groupId);
  const next = copyLibrary(library);
  const preset = next.presets.find(candidate => candidate.id === presetId);
  if (!preset) throw new Error("Expression was not found");
  preset.groupId = groupId;
  preset.updatedAt = new Date().toISOString();
  return next;
}

export function duplicatePreset(
  library: ExpressionLibraryExport,
  presetId: string,
  options: {
    id?: string;
    now?: string;
    name?: string;
    groupId?: string | null;
    layers?: readonly ExpressionLayer[];
  } = {},
): { library: ExpressionLibraryExport; preset: ExpressionPreset } {
  const source = library.presets.find(candidate => candidate.id === presetId);
  if (!source) throw new Error("Expression was not found");
  return saveNewPreset(
    library,
    `${options.name ?? source.name} Copy`,
    options.groupId === undefined ? source.groupId : options.groupId,
    options.layers ?? source.layers,
    options,
  );
}

export function deletePreset(library: ExpressionLibraryExport, presetId: string): ExpressionLibraryExport {
  return { ...copyLibrary(library), presets: library.presets.filter(preset => preset.id !== presetId).map(preset => ({ ...preset, layers: cloneLayers(preset.layers) })) };
}

export function loadPreset(library: ExpressionLibraryExport, presetId: string): ExpressionPreset {
  const preset = library.presets.find(candidate => candidate.id === presetId);
  if (!preset) throw new Error("Expression was not found");
  return { ...preset, layers: cloneLayers(preset.layers) };
}

export function groupLabel(groups: readonly ExpressionGroup[], groupId: string | null): string {
  return groups.find(group => group.id === groupId)?.name ?? "Ungrouped";
}

export function layerSlotId(layer: ExpressionLayer): MarcusSlotId | null {
  return findMarcusAsset(layer.assetId)?.slotId ?? null;
}

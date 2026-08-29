import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import acceptanceFixture from "./fixtures/MARCUS_EXPRESSION_ACCEPTANCE.json";
import { marcusAssetManifest, marcusAssets } from "./assets/manifest";
import { cloneLayers, createDefaultLibrary, createSourceVisibleLayers } from "./model/defaults";
import {
  addAssetLayer,
  createGroup,
  deleteEmptyGroup,
  deletePreset,
  duplicatePreset,
  loadPreset,
  moveLayer,
  movePresetToGroup,
  renameGroup,
  renamePreset,
  reorderLayer,
  saveNewPreset,
  updateLayer,
  updatePreset,
} from "./model/library";
import type { ExpressionLibraryExport } from "./model/types";
import { parseExpressionLibraryJson, serializeExpressionLibrary, validateExpressionLibrary } from "./model/validation";
import { EXPRESSION_LIBRARY_STORAGE_KEY, loadLibraryFromStorage, saveLibraryToStorage, type StorageLike } from "./persistence/storage";
import { buildRenderPlan, sanitizeExpressionFilename } from "./rendering/compositor";

function pngSize(filePath: string): { width: number; height: number } {
  const data = fs.readFileSync(filePath);
  const signature = Array.from(data.subarray(0, 8), byte => byte.toString(16).padStart(2, "0")).join("");
  expect(signature).toBe("89504e470d0a1a0a");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  putRaw(key: string, value: string) { this.values.set(key, value); }
}

describe("Trapstar Expression Maker v0.1", () => {
  it("pins all 62 Marcus assets, slots, face-space, hidden state, and paths", () => {
    expect(marcusAssetManifest.source.sha256).toBe("D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7");
    expect(marcusAssetManifest.canonicalFaceSpace).toMatchObject({ width: 1187, height: 1484, origin: "TOP_LEFT" });
    expect(marcusAssetManifest.renderOrderPolicy).toBe("PRESET_LAYER_ARRAY_BACK_TO_FRONT");
    expect(marcusAssets).toHaveLength(62);
    expect(new Set(marcusAssets.map(asset => asset.id)).size).toBe(62);
    const expectedSlotCounts = {
      BASE_HEAD: 1, BROW_L: 13, BROW_R: 13, EYE_L: 6, EYE_R: 6,
      GAZE_L: 4, GAZE_R: 4, LOWER_FACE: 14, MACRO_OVERRIDE: 1,
    };
    expect(Object.fromEntries(marcusAssetManifest.slots.map(slot => [slot.id, slot.assetCount]))).toEqual(expectedSlotCounts);
    expect(Object.fromEntries(Object.keys(expectedSlotCounts).map(slotId => [
      slotId,
      marcusAssets.filter(asset => asset.slotId === slotId).length,
    ]))).toEqual(expectedSlotCounts);
    expect(marcusAssets.filter(asset => asset.defaultVisible).map(asset => asset.id)).toEqual([
      "00_BASE_REFERENCE_LOCKED",
      "60_EYE_LEFT_SIDE_LOOK_02",
      "65_EYE_RIGHT_SIDE_LOOK_04",
      "70_LOWER_FACE_SMILE_CLOSED_03",
    ]);
    expect(marcusAssets.filter(asset => asset.defaultLocked).map(asset => asset.id)).toEqual(["00_BASE_REFERENCE_LOCKED"]);

    for (const asset of marcusAssets) {
      expect(asset.identityBinding).toBe("MARCUS_ONLY");
      expect(asset.faceRect.x).toBeGreaterThanOrEqual(0);
      expect(asset.faceRect.y).toBeGreaterThanOrEqual(0);
      expect(asset.faceRect.x + asset.faceRect.width).toBeLessThanOrEqual(1187);
      expect(asset.faceRect.y + asset.faceRect.height).toBeLessThanOrEqual(1484);
      const publicPath = path.join(process.cwd(), "public", ...asset.src.split("/").filter(Boolean));
      expect(fs.existsSync(publicPath), asset.id).toBe(true);
      expect(pngSize(publicPath)).toEqual({ width: asset.faceRect.width, height: asset.faceRect.height });
      expect(sha256File(publicPath), asset.id).toBe(asset.sourceResourceSha256);
      if (asset.slotId.endsWith("_L")) expect(asset.anatomicalSide, asset.id).toBe("LEFT");
      if (asset.slotId.endsWith("_R")) expect(asset.anatomicalSide, asset.id).toBe("RIGHT");
    }
  });

  it("keeps the masked macro atomic and the other 61 assets independent", () => {
    const masked = marcusAssets.filter(asset => asset.mask);
    expect(masked).toHaveLength(1);
    expect(masked[0].id).toBe("10_FULL_FACE_PUFFED_CHEEKS_01");
    expect(masked[0].mask).toMatchObject({ sourceResource: "fa41b4d648f0.webp", sourceFormat: "PNG", apply: "ALPHA_MULTIPLY" });
    const maskPath = path.join(process.cwd(), "public", ...masked[0].mask!.src.split("/").filter(Boolean));
    expect(fs.existsSync(maskPath)).toBe(true);
    expect(pngSize(maskPath)).toEqual({ width: 615, height: 818 });
    expect(sha256File(maskPath)).toBe(masked[0].mask!.sha256);
  });

  it("seeds the exact source-visible composition in source order", () => {
    const layers = createSourceVisibleLayers();
    expect(layers.map(layer => layer.assetId)).toEqual(marcusAssets.filter(asset => asset.defaultVisible).map(asset => asset.id));
    expect(layers[0].locked).toBe(true);
    expect(layers.every(layer => layer.visible)).toBe(true);
  });

  it("uses preset arrays as the only render order and excludes hidden layers", () => {
    const source = loadPreset(createDefaultLibrary(), "suspicious-02").layers;
    const first = buildRenderPlan(source);
    const reordered = reorderLayer(source, "acceptance-lower-face", 1);
    const second = buildRenderPlan(reordered);
    expect(first.entries.map(entry => entry.assetId)).toEqual(source.filter(layer => layer.visible).map(layer => layer.assetId));
    expect(second.entries.map(entry => entry.assetId)).toEqual(reordered.filter(layer => layer.visible).map(layer => layer.assetId));
    expect(second.entries.map(entry => entry.assetId)).not.toEqual(first.entries.map(entry => entry.assetId));
    expect(first.entries.some(entry => entry.assetId === "10_FULL_FACE_PUFFED_CHEEKS_01")).toBe(false);
  });

  it("persists registered transforms without sorting or changing stable asset IDs", () => {
    const source = loadPreset(createDefaultLibrary(), "suspicious-02").layers;
    const changed = updateLayer(source, "acceptance-left-eye", { x: 7, y: -4, scale: 1.05, rotation: 3 });
    const plan = buildRenderPlan(changed);
    const entry = plan.entries.find(candidate => candidate.layerId === "acceptance-left-eye")!;
    const asset = marcusAssets.find(candidate => candidate.id === entry.assetId)!;
    expect(entry).toMatchObject({ x: asset.faceRect.x + 7, y: asset.faceRect.y - 4, scale: 1.05, rotation: 3 });
    expect(changed.find(layer => layer.id === "acceptance-left-eye")!.assetId).toBe("60_EYE_LEFT_SIDE_LOOK_02");
  });

  it("supports add, order buttons, save/load, rename, update, and delete", () => {
    let library = createDefaultLibrary();
    let layers = loadPreset(library, "suspicious-02").layers;
    layers = addAssetLayer(layers, "70_LOWER_FACE_NEUTRAL_CLOSED_01");
    const addedId = layers.at(-1)!.id;
    layers = moveLayer(layers, addedId, "BACK");
    expect(layers[0].id).toBe(addedId);
    const saved = saveNewPreset(library, "Neutral Test", "neutral-idle", layers, { id: "neutral-test", now: "2026-08-29T01:00:00.000Z" });
    library = saved.library;
    expect(loadPreset(library, "neutral-test").layers.map(layer => layer.id)).toEqual(layers.map(layer => layer.id));
    library = renamePreset(library, "neutral-test", "Neutral Renamed");
    library = updatePreset(library, "neutral-test", updateLayer(layers, addedId, { visible: false }), "neutral-idle", "2026-08-29T02:00:00.000Z");
    expect(loadPreset(library, "neutral-test")).toMatchObject({ name: "Neutral Renamed", groupId: "neutral-idle", updatedAt: "2026-08-29T02:00:00.000Z" });
    expect(loadPreset(library, "neutral-test").layers[0].visible).toBe(false);
    library = deletePreset(library, "neutral-test");
    expect(library.presets.some(preset => preset.id === "neutral-test")).toBe(false);
  });

  it("duplicates presets deeply so edits never mutate the original", () => {
    const library = createDefaultLibrary();
    const workingLayers = updateLayer(loadPreset(library, "suspicious-02").layers, "acceptance-left-eye", { x: 11 });
    const duplicated = duplicatePreset(library, "suspicious-02", {
      id: "suspicious-03",
      now: "2026-08-29T03:00:00.000Z",
      name: "Unsaved Working Name",
      groupId: "angry",
      layers: workingLayers,
    });
    expect(duplicated.preset).toMatchObject({ name: "Unsaved Working Name Copy", groupId: "angry" });
    expect(duplicated.preset.layers.find(layer => layer.id === "acceptance-left-eye")!.x).toBe(11);
    expect(loadPreset(duplicated.library, "suspicious-02").layers.find(layer => layer.id === "acceptance-left-eye")!.x).toBe(0);
    const changedLayers = updateLayer(duplicated.preset.layers, "acceptance-left-eye", { x: 22 });
    const changed = updatePreset(duplicated.library, "suspicious-03", changedLayers, "angry");
    expect(loadPreset(changed, "suspicious-03").layers.find(layer => layer.id === "acceptance-left-eye")!.x).toBe(22);
    expect(loadPreset(changed, "suspicious-02").layers.find(layer => layer.id === "acceptance-left-eye")!.x).toBe(0);
  });

  it("creates, renames, moves into, and deletes empty custom groups", () => {
    let library = createGroup(createDefaultLibrary(), "Manipulative", "manipulative");
    library = renameGroup(library, "manipulative", "Manipulative / Testing");
    library = movePresetToGroup(library, "suspicious-02", "manipulative");
    expect(loadPreset(library, "suspicious-02").groupId).toBe("manipulative");
    expect(() => deleteEmptyGroup(library, "manipulative")).toThrow(/Move or delete/);
    library = movePresetToGroup(library, "suspicious-02", "suspicious");
    library = deleteEmptyGroup(library, "manipulative");
    expect(library.groups.some(group => group.id === "manipulative")).toBe(false);
  });

  it("round-trips JSON and preserves valid missing asset references with warnings", () => {
    const library = createDefaultLibrary();
    expect(parseExpressionLibraryJson(serializeExpressionLibrary(library)).library).toEqual(library);
    const missing = JSON.parse(JSON.stringify(library)) as ExpressionLibraryExport;
    missing.presets[0].layers[1].assetId = "MARCUS_ASSET_NOT_INSTALLED";
    const result = validateExpressionLibrary(missing);
    expect(result.library.presets[0].layers[1].assetId).toBe("MARCUS_ASSET_NOT_INSTALLED");
    expect(result.warnings).toEqual(["Missing Marcus asset reference preserved: MARCUS_ASSET_NOT_INSTALLED"]);
  });

  it("rejects malformed imports atomically", () => {
    expect(() => parseExpressionLibraryJson("not json")).toThrow(/not valid JSON/);
    expect(() => validateExpressionLibrary({ schema: "wrong", version: 1 })).toThrow(/Incompatible expression library/);
    const duplicate = JSON.parse(JSON.stringify(acceptanceFixture)) as ExpressionLibraryExport;
    duplicate.presets.push({ ...duplicate.presets[0], layers: cloneLayers(duplicate.presets[0].layers) });
    expect(() => validateExpressionLibrary(duplicate)).toThrow(/Duplicate expression ID/);
  });

  it("survives browser-storage reload and falls back safely from malformed storage", () => {
    const storage = new MemoryStorage();
    const library = createDefaultLibrary();
    saveLibraryToStorage(storage, library);
    expect(loadLibraryFromStorage(storage)).toEqual({ library, warnings: [] });
    storage.putRaw(EXPRESSION_LIBRARY_STORAGE_KEY, "{");
    const recovered = loadLibraryFromStorage(storage);
    expect(recovered.library).toEqual(createDefaultLibrary());
    expect(recovered.warnings[0]).toMatch(/Stored library was not loaded/);
    const unavailable: StorageLike = {
      getItem() { throw new Error("SecurityError"); },
      setItem() { throw new Error("SecurityError"); },
    };
    expect(loadLibraryFromStorage(unavailable)).toEqual({
      library: createDefaultLibrary(),
      warnings: ["Stored library was not loaded: SecurityError"],
    });
  });

  it("sanitizes deterministic PNG filenames", () => {
    expect(sanitizeExpressionFilename("Suspicious / Escalated")).toBe("suspicious-escalated");
    expect(sanitizeExpressionFilename("***")).toBe("expression");
  });
});

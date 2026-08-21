import { describe, expect, it } from "vitest";
import fixture from "./fixtures/APT_305_QUICK_SCENE.json";
import { assetManifest, compatibleBackgrounds, findCharacter, findPose } from "./assets/manifest";
import { createDefaultScene } from "./model/defaults";
import type { SceneState } from "./model/types";
import { replaceCharacter, switchView, validateScene } from "./model/validation";
import { applyPreset } from "./placement/presets";
import { clampOffset } from "./placement/zones";
import { orderedLayers } from "./rendering/layerOrdering";

describe("Trapstar Quick Scene Maker", () => {
  it("has unique canonical IDs and eight poses per character and view", () => {
    const ids = [
      ...assetManifest.backgrounds.map(item => item.id),
      ...assetManifest.characters.flatMap(character => (["iso", "2d"] as const).flatMap(view => character.representations[view].map(pose => `${character.id}_${view}_${pose.id}`))),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const character of assetManifest.characters) {
      expect(character.representations.iso).toHaveLength(8);
      expect(character.representations["2d"]).toHaveLength(8);
    }
  });

  it("filters backgrounds by view without coupling them to cast state", () => {
    expect(compatibleBackgrounds("iso").every(item => item.view === "iso")).toBe(true);
    expect(compatibleBackgrounds("2d").every(item => item.view === "2d")).toBe(true);
    const scene = createDefaultScene(); const changed = { ...scene, backgroundId: "apt305_iso_furnished" };
    expect(changed.actors).toEqual(scene.actors);
  });

  it("preserves actor identity, semantic zone, and compatible pose while switching views", () => {
    const iso = createDefaultScene(); const twoD = switchView(iso, "2d");
    expect(twoD.view).toBe("2d");
    for (let index = 0; index < iso.actors.length; index++) {
      expect(twoD.actors[index].characterId).toBe(iso.actors[index].characterId);
      expect(twoD.actors[index].zoneId).toBe(iso.actors[index].zoneId);
      expect(twoD.actors[index].poseId).toBe(iso.actors[index].poseId);
      expect(findPose(twoD.actors[index].characterId, "2d", twoD.actors[index].poseId)).toBeTruthy();
    }
  });

  it("replaces one character without rebuilding its authored placement", () => {
    const scene = createDefaultScene(); const before = scene.actors[0]; const changed = replaceCharacter(scene, "slot_a", "broker"); const after = changed.actors[0];
    expect(after.characterId).toBe("broker"); expect(after.zoneId).toBe(before.zoneId); expect(after.depth).toBe(before.depth); expect(findCharacter(after.characterId)).toBeTruthy();
  });

  it("round-trips the canonical fixture through scene validation", () => {
    const parsed = JSON.parse(JSON.stringify(fixture)); const result = validateScene(parsed);
    expect(result.warnings).toEqual([]); expect(result.scene).toEqual(fixture as SceneState);
  });

  it("recovers invalid assets and clamps unsafe data", () => {
    const broken = { ...createDefaultScene(), view: "2d", backgroundId: "missing", actors: [{ ...createDefaultScene().actors[0], poseId: "missing", zoneId: "void", offsetX: 9999, depth: 1000 }] };
    const result = validateScene(broken);
    expect(result.warnings.length).toBeGreaterThan(0); expect(result.scene.actors).toHaveLength(3); expect(result.scene.actors[0].poseId).not.toBe("missing"); expect(result.scene.actors[0].depth).toBe(99);
  });

  it("clamps dragging to authored zone bounds", () => {
    expect(clampOffset("table", "iso", 999, -999)).toEqual({ x: 95, y: -35 });
  });

  it("applies visual presets without replacing cast identities", () => {
    const scene = createDefaultScene(); const cast = scene.actors.map(actor => actor.characterId); const staged = applyPreset(scene, "door_tension");
    expect(staged.actors.map(actor => actor.characterId)).toEqual(cast); expect(staged.actors[1].zoneId).toBe("door");
  });

  it("orders export layers deterministically by depth", () => {
    const scene = createDefaultScene(); const layers = orderedLayers(scene.actors, [{ id: "table", file: "table.png", x: 0, y: 0, scale: 1, depth: 35 }]);
    expect(layers.map(layer => layer.depth)).toEqual([...layers.map(layer => layer.depth)].sort((a, b) => a - b));
    expect(layers.map(layer => layer.id)).toContain("env_table");
  });
});

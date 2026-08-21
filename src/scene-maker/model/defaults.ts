import type { SceneState } from "./types";

export const acceptanceFixture: SceneState = {
  version: "trapstar_scene_maker_v0_1", roomId: "apt_305", view: "iso", backgroundId: "apt305_iso_bare", presetId: "neutral_deal",
  actors: [
    { slotId: "slot_a", visible: true, characterId: "contact", poseId: "idle", zoneId: "left", offsetX: 0, offsetY: 0, depth: 40 },
    { slotId: "slot_b", visible: true, characterId: "broker", poseId: "open_hand_negotiating", zoneId: "table", offsetX: 0, offsetY: 0, depth: 35 },
    { slotId: "slot_c", visible: true, characterId: "tracksuit", poseId: "arms_crossed", zoneId: "right", offsetX: 0, offsetY: 0, depth: 45 },
  ],
};

export const createDefaultScene = (): SceneState => structuredClone(acceptanceFixture);

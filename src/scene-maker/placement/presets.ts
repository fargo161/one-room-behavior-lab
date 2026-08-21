import type { ScenePreset, SceneState } from "../model/types";

export const presets: ScenePreset[] = [
  { id: "neutral_deal", label: "Neutral Deal", roomId: "apt_305", actors: [
    { slotId: "slot_a", zoneId: "left", depth: 40, defaultPoseId: "idle" }, { slotId: "slot_b", zoneId: "table", depth: 35, defaultPoseId: "open_hand_negotiating" }, { slotId: "slot_c", zoneId: "right", depth: 45, defaultPoseId: "arms_crossed" },
  ] },
  { id: "two_against_one", label: "Two Against One", roomId: "apt_305", actors: [
    { slotId: "slot_a", zoneId: "left", depth: 45 }, { slotId: "slot_b", zoneId: "center", depth: 50 }, { slotId: "slot_c", zoneId: "door", depth: 25 },
  ] },
  { id: "door_tension", label: "Door Tension", roomId: "apt_305", actors: [
    { slotId: "slot_a", zoneId: "center", depth: 50, defaultPoseId: "pointing" }, { slotId: "slot_b", zoneId: "door", depth: 25, defaultPoseId: "arms_crossed" }, { slotId: "slot_c", zoneId: "right", depth: 45, defaultPoseId: "idle" },
  ] },
  { id: "private_aside", label: "Private Aside", roomId: "apt_305", actors: [
    { slotId: "slot_a", zoneId: "couch", depth: 20, defaultPoseId: "phone_or_listening" }, { slotId: "slot_b", zoneId: "left", depth: 42, defaultPoseId: "leaning" }, { slotId: "slot_c", zoneId: "door", depth: 25 },
  ] },
  { id: "table_focus", label: "Table Focus", roomId: "apt_305", actors: [
    { slotId: "slot_a", zoneId: "table", depth: 30, defaultPoseId: "open_hand_negotiating" }, { slotId: "slot_b", zoneId: "left", depth: 45 }, { slotId: "slot_c", zoneId: "right", depth: 45 },
  ] },
];

export function applyPreset(scene: SceneState, presetId: string): SceneState {
  const preset = presets.find(item => item.id === presetId);
  if (!preset) return scene;
  return { ...scene, presetId, actors: scene.actors.map(actor => {
    const change = preset.actors.find(item => item.slotId === actor.slotId);
    return change ? { ...actor, zoneId: change.zoneId, depth: change.depth, poseId: change.defaultPoseId ?? actor.poseId, offsetX: 0, offsetY: 0 } : actor;
  }) };
}

import { assetManifest, compatibleBackgrounds, findCharacter, findPose } from "../assets/manifest";
import { clampOffset, findZone } from "../placement/zones";
import { createDefaultScene } from "./defaults";
import type { ActorPlacement, CharacterId, SceneState, SlotId, ViewFamily } from "./types";

const slots: SlotId[] = ["slot_a", "slot_b", "slot_c"];
export function switchView(scene: SceneState, view: ViewFamily): SceneState {
  const backgrounds = compatibleBackgrounds(view);
  return { ...scene, view, backgroundId: backgrounds[0].id, actors: scene.actors.map(actor => {
    const character = findCharacter(actor.characterId);
    const exact = character?.representations[view].some(p => p.id === actor.poseId);
    return { ...actor, poseId: exact ? actor.poseId : character?.representations[view][0]?.id ?? null, offsetX: 0, offsetY: 0 };
  }) };
}

export function replaceCharacter(scene: SceneState, slotId: SlotId, characterId: CharacterId | null): SceneState {
  const character = findCharacter(characterId);
  return { ...scene, actors: scene.actors.map(actor => {
    if (actor.slotId !== slotId) return actor;
    const poseId = character?.representations[scene.view].some(p => p.id === actor.poseId)
      ? actor.poseId : character?.representations[scene.view][0]?.id ?? null;
    return { ...actor, characterId, poseId };
  }) };
}

export function validateScene(input: unknown): { scene: SceneState; warnings: string[] } {
  const fallback = createDefaultScene(); const warnings: string[] = [];
  if (!input || typeof input !== "object" || (input as {version?:unknown}).version !== fallback.version) return { scene: fallback, warnings: ["Unsupported or missing scene version; loaded the acceptance fixture."] };
  const raw = input as Partial<SceneState>; const view: ViewFamily = raw.view === "2d" ? "2d" : "iso";
  const validBackground = assetManifest.backgrounds.find(b => b.id === raw.backgroundId && b.view === view) ?? compatibleBackgrounds(view)[0];
  if (validBackground.id !== raw.backgroundId) warnings.push("Background was unavailable for this view and was replaced.");
  const bySlot = new Map((Array.isArray(raw.actors) ? raw.actors : []).map(a => [a.slotId, a]));
  const actors: ActorPlacement[] = slots.map((slotId, index) => {
    const source = bySlot.get(slotId) as Partial<ActorPlacement> | undefined; const safe = fallback.actors[index];
    const requestedCharacterId = source?.characterId;
    const characterId: CharacterId | null = requestedCharacterId === null ? null : findCharacter(requestedCharacterId ?? null)?.id ?? safe.characterId;
    const poseId = characterId === null ? null : findPose(characterId, view, source?.poseId ?? null)?.id ?? findCharacter(characterId)?.representations[view][0]?.id ?? null;
    if (poseId !== source?.poseId) warnings.push(`${slotId}: missing pose replaced with a safe fallback.`);
    const zoneId = findZone(source?.zoneId ?? "")?.views[view] ? source!.zoneId! : safe.zoneId;
    const bounded = clampOffset(zoneId, view, Number(source?.offsetX) || 0, Number(source?.offsetY) || 0);
    const requestedDepth: unknown = source?.depth;
    const depth = typeof requestedDepth === "number" && Number.isFinite(requestedDepth) ? Math.max(0, Math.min(99, requestedDepth)) : safe.depth;
    return { slotId, visible: source?.visible !== false, characterId, poseId, zoneId, offsetX: bounded.x, offsetY: bounded.y, depth };
  });
  return { scene: { version: fallback.version, roomId: "apt_305", view, backgroundId: validBackground.id, presetId: typeof raw.presetId === "string" ? raw.presetId : null, actors }, warnings };
}

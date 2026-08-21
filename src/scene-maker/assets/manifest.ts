import rawPoseManifest from "./pose_asset_manifest.json";
import type { AssetManifest, CharacterDefinition, CharacterId, CharacterPoseDefinition, ViewFamily } from "../model/types";

type RawPose = { character_id: string; action: string; visual_mode: string; facing: string; pivot_foot_px: number[]; dimensions_px: number[]; phone_included: boolean };

const labels: Record<string, string> = {
  idle: "Idle", arms_crossed: "Arms Crossed", open_hand_negotiating: "Open Hand", pointing: "Pointing",
  back_facing: "Back Facing", phone_or_listening: "Phone / Listening", leaning: "Leaning", hands_on_hips: "Hands on Hips",
};

const cast: Array<{ id: CharacterId; label: string }> = [
  { id: "contact", label: "Contact" }, { id: "broker", label: "Broker" }, { id: "tracksuit", label: "Tracksuit" },
];

function poseFromRaw(raw: RawPose): CharacterPoseDefinition {
  const view = raw.visual_mode.toLowerCase() as ViewFamily;
  const character = raw.character_id.toLowerCase();
  const id = raw.action.toLowerCase();
  const [width, height] = raw.dimensions_px;
  const targetHeight = view === "iso" ? 700 : 760;
  return {
    id, label: labels[id] ?? id, view, facing: raw.facing, phoneIncluded: raw.phone_included,
    file: `/scene-maker/characters/${view}/${character}/${id}.png`,
    defaultScale: targetHeight / height, pivotX: raw.pivot_foot_px[0], pivotY: raw.pivot_foot_px[1], width, height,
  };
}

const poses = (rawPoseManifest.assets as RawPose[]).map(poseFromRaw);
const characters: CharacterDefinition[] = cast.map(character => ({
  ...character,
  representations: {
    iso: poses.filter(p => p.view === "iso" && p.file.includes(`/${character.id}/`)),
    "2d": poses.filter(p => p.view === "2d" && p.file.includes(`/${character.id}/`)),
  },
}));

export const assetManifest: AssetManifest = {
  characters,
  backgrounds: [
    { id: "apt305_iso_bare", label: "Bare Room", roomId: "apt_305", view: "iso", file: "/scene-maker/backgrounds/apt-305-iso.png", layers: [] },
    { id: "apt305_iso_furnished", label: "Furnished", roomId: "apt_305", view: "iso", file: "/scene-maker/backgrounds/apt-305-iso.png", layers: [
      { id: "deal_table", file: "/scene-maker/furniture/iso/deal_table_empty_generated.png", x: 735, y: 610, scale: .52, depth: 45 },
      { id: "couch", file: "/scene-maker/furniture/iso/couch_empty_generated.png", x: 925, y: 460, scale: .42, depth: 20 },
    ] },
    { id: "apt305_2d_bare", label: "Bare Room", roomId: "apt_305", view: "2d", file: "/scene-maker/backgrounds/apt-305-2d.png", layers: [] },
  ],
};

export const findCharacter = (id: CharacterId | null) => assetManifest.characters.find(c => c.id === id);
export const findPose = (characterId: CharacterId | null, view: ViewFamily, poseId: string | null) => findCharacter(characterId)?.representations[view].find(p => p.id === poseId);
export const compatibleBackgrounds = (view: ViewFamily) => assetManifest.backgrounds.filter(b => b.view === view);

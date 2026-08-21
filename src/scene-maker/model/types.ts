export type ViewFamily = "iso" | "2d";
export type SlotId = "slot_a" | "slot_b" | "slot_c";
export type CharacterId = "contact" | "broker" | "tracksuit";

export interface CharacterPoseDefinition {
  id: string;
  label: string;
  file: string;
  view: ViewFamily;
  defaultScale: number;
  pivotX: number;
  pivotY: number;
  width: number;
  height: number;
  facing: string;
  phoneIncluded: boolean;
}

export interface CharacterDefinition {
  id: CharacterId;
  label: string;
  representations: Record<ViewFamily, CharacterPoseDefinition[]>;
}

export interface EnvironmentLayer {
  id: string;
  file: string;
  x: number;
  y: number;
  scale: number;
  depth: number;
}

export interface BackgroundDefinition {
  id: string;
  label: string;
  roomId: "apt_305";
  view: ViewFamily;
  file: string;
  layers: EnvironmentLayer[];
}

export interface AssetManifest {
  characters: CharacterDefinition[];
  backgrounds: BackgroundDefinition[];
}

export interface ZonePlacement {
  x: number;
  y: number;
  defaultDepth: number;
  offsetBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
}

export interface ZoneDefinition {
  id: string;
  label: string;
  views: Partial<Record<ViewFamily, ZonePlacement>>;
}

export interface ActorPlacement {
  slotId: SlotId;
  visible: boolean;
  characterId: CharacterId | null;
  poseId: string | null;
  zoneId: string;
  offsetX: number;
  offsetY: number;
  depth: number;
}

export interface SceneState {
  version: "trapstar_scene_maker_v0_1";
  roomId: "apt_305";
  view: ViewFamily;
  backgroundId: string;
  presetId: string | null;
  actors: ActorPlacement[];
}

export interface ScenePreset {
  id: string;
  label: string;
  roomId: "apt_305";
  actors: Array<{ slotId: SlotId; zoneId: string; depth: number; defaultPoseId?: string }>;
}

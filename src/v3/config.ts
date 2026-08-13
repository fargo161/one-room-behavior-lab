import type { ActorId, AttentionTarget, CoreContentId, NpcPriorityWeights, RoomAnchor, RoomEventState } from "./types";

export const PROTOTYPE_LOCAL_LABEL = "PROVISIONAL / PROTOTYPE-LOCAL" as const;

export const prototypeConfig = {
  status: PROTOTYPE_LOCAL_LABEL,
  version: "0.3.0",
  apPerActor: 3,
  normalActionCost: 1,
  maxBeats: 8,
  defaultSeed: 7,
  initiativeRotation: [
    ["PLAYER", "MARA", "DREW"],
    ["MARA", "DREW", "PLAYER"],
    ["DREW", "PLAYER", "MARA"],
  ] as ActorId[][],
  roomGraph: {
    CENTER: ["TABLE", "DOOR", "WINDOW"],
    TABLE: ["CENTER", "CABINET"],
    DOOR: ["CENTER", "CABINET"],
    WINDOW: ["CENTER"],
    CABINET: ["TABLE", "DOOR"],
  } satisfies Record<RoomAnchor, RoomAnchor[]>,
  reception: {
    whisperDirectMaxDistance: 0,
    lowVoiceDirectMaxDistance: 2,
    normalDirectMaxDistance: 3,
    lowVoiceFullOverhearMaxDistance: 1,
    normalFullOverhearMaxDistance: 2,
    noticedOnlyMaxDistance: 2,
    loudRoomDistancePenalty: 1,
  },
  distraction: {
    covertRequiredAnchor: "WINDOW" as RoomAnchor,
  },
  failThresholds: {
    drewWatchful: 1,
    drewGuarding: 2,
    drewSecuring: 3,
    drewLockdown: 4,
    drewEject: 5,
    maraUneasy: 1,
    maraNearExit: 2,
    maraReadyToLeave: 3,
    maraFlee: 4,
  },
  impacts: {
    noticedSecrecyDrewConcern: 1,
    envelopeMentionDrewConcern: 1,
    maraNearExitDrewConcern: 1,
    bluntWarningMaraPressure: 1,
    drewGuardingMaraPressure: 1,
    playerNearMaraRelief: -1,
    directManipulationVigilance: 2,
    likelyManipulationVigilance: 1,
    possibleManipulationVigilance: 1,
    observedExploitConcern: 2,
  },
  npcPriorityWeights: {
    protectEnvelope: 100,
    preserveExit: 90,
    seekInformation: 70,
    communicateConcern: 60,
    approachOrAvoid: 50,
  } satisfies NpcPriorityWeights,
} as const;

export const roomAnchorLabels: Record<RoomAnchor, string> = {
  CENTER: "at the room center",
  TABLE: "beside the table",
  DOOR: "at the door",
  WINDOW: "at the window",
  CABINET: "beside the wall cabinet",
};

export const initialAttention: Record<ActorId, AttentionTarget> = {
  PLAYER: { kind: "ACTOR", id: "MARA" },
  MARA: { kind: "ACTOR", id: "PLAYER" },
  DREW: { kind: "OBJECT", id: "ENVELOPE" },
};

export const contentLabels: Record<CoreContentId, string> = {
  ASK_FOR_ENVELOPE: "ask for the envelope",
  ASK_INTENTIONS: "ask what they intend",
  OFFER_HELP: "offer practical help",
  SHARE_AUTHORIZATION: "share the authorization",
  REQUEST_PRIVACY: "request a private exchange",
  WARN_ABOUT_EXIT: "warn that the exit situation is changing",
  REPORT_DANGER: "report a danger in the room",
};

type RoomEventDefinition = Omit<RoomEventState, "id" | "beat">;

/** Narrow scenario-authored seam; not a general scenario editor. */
export const roomEventDefinitions: RoomEventDefinition[] = [
  {
    family: "INTERRUPTION",
    effectId: "HALLWAY_INTERRUPTION",
    title: "Hallway footsteps",
    description: "Footsteps pass outside the door, pulling Mara's gaze toward the exit.",
    noise: "MODERATE",
    attentionActorId: "MARA",
    attentionTarget: { kind: "LOCATION", id: "DOOR" },
    actionableEffect: "Mara turns toward the sound beyond the door.",
    durationBeats: 1,
  },
  {
    family: "POSITION_CHANGE",
    effectId: "OPEN_DOOR",
    title: "Door shifts open",
    description: "The door eases wider, leaving the hall plainly visible.",
    noise: "QUIET",
    attentionActorId: "MARA",
    attentionTarget: { kind: "LOCATION", id: "DOOR" },
    actionableEffect: "The open doorway changes what can be cited and seen.",
    durationBeats: null,
  },
  {
    family: "OCCUPATION",
    effectId: "LIGHT_OCCUPATION",
    title: "Light flicker",
    description: "The overhead light flickers; Drew checks the center of the room.",
    noise: "QUIET",
    attentionActorId: "DREW",
    attentionTarget: { kind: "LOCATION", id: "CENTER" },
    actionableEffect: "Drew's hand loosens from the table for this Beat.",
    durationBeats: 1,
  },
  {
    family: "REVEAL_ACCESS",
    effectId: "REVEAL_ENVELOPE",
    title: "Envelope corner exposed",
    description: "A draft lifts papers that had obscured the envelope's seal.",
    noise: "QUIET",
    attentionActorId: "PLAYER",
    attentionTarget: { kind: "OBJECT", id: "ENVELOPE" },
    actionableEffect: "The exposed seal can be inspected from farther away this Beat.",
    durationBeats: 1,
  },
  {
    family: "DISTRACTION",
    effectId: "NATURAL_PHONE_DISTRACTION",
    title: "Phone buzz",
    description: "Drew's phone buzzes against the table. His eyes drop to it.",
    noise: "MODERATE",
    attentionActorId: "DREW",
    attentionTarget: { kind: "ROOM_EVENT", id: "PHONE_BUZZ" },
    actionableEffect: "Drew's attention leaves the envelope for this Beat.",
    durationBeats: 1,
  },
];

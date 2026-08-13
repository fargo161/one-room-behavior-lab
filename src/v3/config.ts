import type { ActorId, AttentionTarget, CoreContentId, RoomAnchor } from "./types";

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
    CENTER: ["NEAR_MARA", "NEAR_DREW", "NEAR_TABLE", "NEAR_WINDOW"],
    NEAR_MARA: ["CENTER", "NEAR_DOOR"],
    NEAR_DREW: ["CENTER", "NEAR_ENVELOPE"],
    NEAR_TABLE: ["CENTER", "NEAR_ENVELOPE", "NEAR_DOOR"],
    NEAR_ENVELOPE: ["NEAR_TABLE", "NEAR_DREW"],
    NEAR_DOOR: ["NEAR_MARA", "NEAR_TABLE"],
    NEAR_WINDOW: ["CENTER"],
  } satisfies Record<RoomAnchor, RoomAnchor[]>,
  reception: {
    whisperDirectMaxDistance: 0,
    lowVoiceFullOverhearMaxDistance: 1,
    normalFullOverhearMaxDistance: 2,
    noticedOnlyMaxDistance: 2,
    loudRoomDistancePenalty: 1,
  },
  distraction: {
    covertRequiredAnchor: "NEAR_WINDOW" as RoomAnchor,
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
  },
  npcPriorityWeights: {
    protectEnvelope: 100,
    preserveExit: 90,
    seekInformation: 70,
    communicateConcern: 60,
    approachOrAvoid: 50,
  },
} as const;

export const roomAnchorLabels: Record<RoomAnchor, string> = {
  CENTER: "room center",
  NEAR_MARA: "near Mara",
  NEAR_DREW: "near Drew",
  NEAR_TABLE: "beside the table",
  NEAR_ENVELOPE: "within reach of the envelope",
  NEAR_DOOR: "near the door",
  NEAR_WINDOW: "near the window",
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

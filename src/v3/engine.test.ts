import { describe, expect, it } from "vitest";
import { defaultPlayerMessageDraft } from "./messages";
import {
  appendPlayerAction,
  commitPlayerBeat,
  createEmptyPlan,
  createInitialSessionV3,
  createInitialWorldV3,
  makeDistractAction,
  makeInteractAction,
  makeMessageAction,
  makeMoveAction,
  makeScanAction,
  planNpcFromBeatStart,
  resolveBeatV3,
  roomDistance,
  validatePlan,
} from "./engine";
import type { ActorPlan, MessageDraftV3, PlannedAction, WorldStateV3 } from "./types";

const draft = (overrides: Partial<MessageDraftV3> = {}): MessageDraftV3 => ({
  ...defaultPlayerMessageDraft(),
  ...overrides,
});

const plan = (world: WorldStateV3, actorId: ActorPlan["actorId"], actions: PlannedAction[]): ActorPlan => ({ actorId, beat: world.beat, actions, plannedFromStateId: world.stateId });
const noNpcs = (world: WorldStateV3) => ({ MARA: createEmptyPlan(world, "MARA"), DREW: createEmptyPlan(world, "DREW") });

describe("v0.3 shared Beat economy", () => {
  it("provides three AP and accepts three normal actions", () => {
    const world = createInitialWorldV3();
    const player = plan(world, "PLAYER", [
      makeMoveAction(world, "PLAYER", "NEAR_MARA", 1),
      makeScanAction(world, "PLAYER", "ROOM", "ROOM", 2),
      makeMessageAction(world, "PLAYER", draft(), 3),
    ]);
    expect(validatePlan(world, player)).toMatchObject({ legal: true, apCommitted: 3, apRemaining: 0 });
  });

  it("allows repeated action families, including two Moves", () => {
    const world = createInitialWorldV3();
    const player = plan(world, "PLAYER", [
      makeMoveAction(world, "PLAYER", "NEAR_TABLE", 1),
      makeMoveAction(world, "PLAYER", "NEAR_ENVELOPE", 2),
      makeScanAction(world, "PLAYER", "OBJECT", "ENVELOPE", 3),
    ]);
    expect(validatePlan(world, player).legal).toBe(true);
    const next = resolveBeatV3(world, player, { npcPlans: noNpcs(world) });
    expect(next.actors.PLAYER.position).toBe("NEAR_ENVELOPE");
  });

  it("rejects a fourth 1-AP action", () => {
    const world = createInitialWorldV3();
    const actions = [1, 2, 3, 4].map((ordinal) => makeScanAction(world, "PLAYER", "ROOM", "ROOM", ordinal));
    const result = validatePlan(world, plan(world, "PLAYER", actions));
    expect(result.legal).toBe(false);
    expect(result.issues.join(" ")).toContain("fourth");
  });

  it("commits AP even when an action is invalidated", () => {
    const world = createInitialWorldV3();
    const invalidMove = makeMoveAction(world, "PLAYER", "CENTER", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [invalidMove]), { npcPlans: noNpcs(world) });
    expect(next.lastResolutions.find((item) => item.actionId === invalidMove.id)).toMatchObject({ status: "INVALIDATED", apSpent: 1 });
  });
});

describe("v0.3 direct-message limits and identity", () => {
  it("rejects two direct Messages to the same NPC in one Beat", () => {
    const world = createInitialWorldV3();
    const messages = [
      makeMessageAction(world, "PLAYER", draft({ recipientId: "DREW" }), 1),
      makeMessageAction(world, "PLAYER", draft({ recipientId: "DREW", coreContentId: "ASK_FOR_ENVELOPE" }), 2),
    ];
    expect(validatePlan(world, plan(world, "PLAYER", messages)).legal).toBe(false);
  });

  it("allows one direct Message to Drew and one to Mara", () => {
    const world = createInitialWorldV3();
    const messages = [
      makeMessageAction(world, "PLAYER", draft({ recipientId: "DREW" }), 1),
      makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA" }), 2),
    ];
    expect(validatePlan(world, plan(world, "PLAYER", messages)).legal).toBe(true);
  });

  it("does not let overhearing consume a later direct slot", () => {
    const world = createInitialWorldV3();
    const toMara = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "NORMAL" }), 1);
    const toDrew = makeMessageAction(world, "PLAYER", draft({ recipientId: "DREW", coreContentId: "OFFER_HELP" }), 2);
    const player = plan(world, "PLAYER", [toMara, toDrew]);
    expect(validatePlan(world, player).legal).toBe(true);
    const next = resolveBeatV3(world, player, { npcPlans: noNpcs(world) });
    expect(next.receptions.find((item) => item.messageId === toMara.message.id && item.actorId === "DREW")?.kind).toContain("OVERHEARD");
    expect(next.receptions.find((item) => item.messageId === toDrew.message.id && item.actorId === "DREW")?.kind).toBe("DIRECT");
  });

  it("changes structured identity when a meaningful component changes", () => {
    const world = createInitialWorldV3();
    const first = makeMessageAction(world, "PLAYER", draft({ reasonId: "SAFETY" }), 1).message;
    const second = makeMessageAction(world, "PLAYER", draft({ reasonId: "TRUST" }), 1).message;
    expect(first.id).not.toBe(second.id);
  });

  it("keeps generated surface wording downstream of complete identity", () => {
    const world = createInitialWorldV3();
    const first = makeMessageAction(world, "PLAYER", draft(), 1).message;
    const second = makeMessageAction(world, "PLAYER", draft(), 1).message;
    second.surfaceText = "A different renderer could say this another way.";
    expect(first.id).toBe(second.id);
  });
});

describe("v0.3 reception, attention, and private delivery", () => {
  it("records DIRECT reception for the intended recipient", () => {
    const world = createInitialWorldV3();
    const action = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA" }), 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    expect(next.receptions.find((item) => item.actorId === "MARA" && item.messageId === action.message.id)?.kind).toBe("DIRECT");
  });

  it("supports full overhearing", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "CENTER";
    world.actors.MARA.position = "NEAR_MARA";
    world.actors.DREW.position = "CENTER";
    const action = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "NORMAL" }), 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    expect(next.receptions.find((item) => item.actorId === "DREW")?.kind).toBe("OVERHEARD_FULL");
  });

  it("supports partial overhearing", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "CENTER";
    world.actors.MARA.position = "CENTER";
    world.actors.DREW.position = "NEAR_DREW";
    world.actors.DREW.attention = { kind: "ACTOR", id: "PLAYER" };
    const action = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "WHISPER" }), 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    const heard = next.receptions.find((item) => item.actorId === "DREW");
    expect(heard?.kind).toBe("OVERHEARD_PARTIAL");
    expect(heard?.fragment).toContain("...");
  });

  it("supports noticed-only communication", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "CENTER";
    world.actors.MARA.position = "CENTER";
    world.actors.DREW.position = "NEAR_DREW";
    world.actors.DREW.attention = { kind: "LOCATION", id: "CENTER" };
    const action = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "WHISPER" }), 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    expect(next.receptions.find((item) => item.actorId === "DREW")?.kind).toBe("NOTICED_ONLY");
  });

  it("supports private delivery with no observer detection", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "NEAR_MARA";
    world.actors.MARA.position = "NEAR_MARA";
    world.actors.DREW.position = "NEAR_DREW";
    world.actors.DREW.attention = { kind: "ROOM_EVENT", id: "PHONE_BUZZ" };
    const action = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "WHISPER" }), 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    expect(next.receptions.find((item) => item.actorId === "DREW")?.kind).toBe("NONE");
  });

  it("changes hearing when attention changes while geometry stays fixed", () => {
    const base = createInitialWorldV3();
    base.actors.PLAYER.position = "CENTER";
    base.actors.MARA.position = "CENTER";
    base.actors.DREW.position = "NEAR_DREW";
    const attentive = structuredClone(base);
    attentive.actors.DREW.attention = { kind: "ACTOR", id: "PLAYER" };
    const distracted = structuredClone(base);
    distracted.actors.DREW.attention = { kind: "ROOM_EVENT", id: "PHONE_BUZZ" };
    const attentiveAction = makeMessageAction(attentive, "PLAYER", draft({ deliveryMode: "WHISPER" }), 1);
    const distractedAction = makeMessageAction(distracted, "PLAYER", draft({ deliveryMode: "WHISPER" }), 1);
    const heard = resolveBeatV3(attentive, plan(attentive, "PLAYER", [attentiveAction]), { npcPlans: noNpcs(attentive) });
    const missed = resolveBeatV3(distracted, plan(distracted, "PLAYER", [distractedAction]), { npcPlans: noNpcs(distracted) });
    expect(heard.receptions.find((item) => item.actorId === "DREW")?.kind).toBe("OVERHEARD_PARTIAL");
    expect(missed.receptions.find((item) => item.actorId === "DREW")?.kind).toBe("NONE");
  });
});

describe("v0.3 movement, Scan, and room events", () => {
  it("uses a discrete connected room graph", () => {
    expect(roomDistance("CENTER", "NEAR_ENVELOPE")).toBe(2);
    expect(roomDistance("NEAR_WINDOW", "NEAR_DOOR")).toBeGreaterThan(1);
  });

  it("Scan reveals observable evidence without hidden-value dumps", () => {
    const world = createInitialWorldV3();
    const action = makeScanAction(world, "PLAYER", "ACTOR", "DREW", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    const evidence = next.actors.PLAYER.observations.at(-1)?.evidence.join(" ") ?? "";
    expect(evidence).toContain("Drew");
    expect(evidence).not.toContain("drewConcern");
    expect(evidence).not.toMatch(/\b\d+\b/);
  });

  it("replays the same room-event sequence from the same seed", () => {
    const first = createInitialWorldV3(7);
    const second = createInitialWorldV3(7);
    expect(first.currentRoomEvent).toEqual(second.currentRoomEvent);
    expect(first.currentRoomEvent.title).toBe("Phone buzz");
  });

  it("lets the player exploit an existing room-event opening without spending DISTRACT AP", () => {
    const world = createInitialWorldV3(7);
    world.actors.PLAYER.position = "NEAR_MARA";
    world.actors.MARA.position = "NEAR_MARA";
    const whisper = makeMessageAction(world, "PLAYER", draft({ deliveryMode: "WHISPER" }), 1);
    const player = plan(world, "PLAYER", [whisper]);
    const next = resolveBeatV3(world, player, { npcPlans: noNpcs(world) });
    expect(validatePlan(world, player).apCommitted).toBe(1);
    expect(next.receptions.find((item) => item.actorId === "DREW")?.kind).toBe("NONE");
  });
});

describe("v0.3 distraction separates success and attribution", () => {
  const run = (world: WorldStateV3, mode: "VISIBLE_CALL" | "COVERT_WINDOW_RATTLE") => {
    const action = makeDistractAction(world, "DREW", mode, 1);
    return resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) }).lastResolutions.find((item) => item.actionId === action.id)?.distraction;
  };

  it("supports success plus direct attribution", () => {
    expect(run(createInitialWorldV3(), "VISIBLE_CALL")).toMatchObject({ success: true, attribution: "DIRECT" });
  });

  it("supports success plus covert attribution", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "NEAR_WINDOW";
    world.actors.DREW.attention = { kind: "OBJECT", id: "ENVELOPE" };
    expect(run(world, "COVERT_WINDOW_RATTLE")).toMatchObject({ success: true, attribution: "NONE" });
  });

  it("supports failure plus covert attribution", () => {
    const world = createInitialWorldV3();
    world.actors.DREW.attention = { kind: "OBJECT", id: "ENVELOPE" };
    expect(run(world, "COVERT_WINDOW_RATTLE")).toMatchObject({ success: false, attribution: "NONE" });
  });

  it("supports failure plus likely attribution", () => {
    const world = createInitialWorldV3();
    world.actors.DREW.attention = { kind: "ACTOR", id: "PLAYER" };
    expect(run(world, "COVERT_WINDOW_RATTLE")).toMatchObject({ success: false, attribution: "LIKELY" });
  });
});

describe("v0.3 NPC symmetry and planning", () => {
  it("gives both NPCs three legal shared-grammar actions", () => {
    const world = createInitialWorldV3();
    for (const actorId of ["MARA", "DREW"] as const) {
      const npcPlan = planNpcFromBeatStart(world, actorId);
      expect(validatePlan(world, npcPlan)).toMatchObject({ legal: true, apCommitted: 3 });
      expect(new Set(npcPlan.actions.map((action) => action.kind))).toEqual(new Set(["MOVE", "MESSAGE", "SCAN"]));
    }
  });

  it("uses INTERACT to manifest Drew's protection trajectory", () => {
    const world = createInitialWorldV3();
    world.actors.DREW.drewConcern = 2;
    world.actors.DREW.drewTrajectory = "GUARDING";
    world.actors.DREW.position = "NEAR_ENVELOPE";
    expect(planNpcFromBeatStart(world, "DREW").actions.some((action) => action.kind === "INTERACT")).toBe(true);
  });

  it("routes NPC-to-NPC messages through the same player-overhearing model", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "CENTER";
    world.actors.DREW.position = "CENTER";
    world.actors.MARA.position = "NEAR_MARA";
    const drewMessage = makeMessageAction(world, "DREW", draft({ recipientId: "MARA", coreContentId: "ASK_INTENTIONS", deliveryMode: "NORMAL" }), 1);
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [drewMessage]) } });
    expect(next.receptions.find((item) => item.messageId === drewMessage.message.id && item.actorId === "PLAYER")?.kind).toBe("OVERHEARD_FULL");
  });

  it("plans NPCs from the Beat-start tableau rather than the player's queued plan", () => {
    const world = createInitialWorldV3();
    const before = planNpcFromBeatStart(world, "DREW");
    const player = plan(world, "PLAYER", [makeMessageAction(world, "PLAYER", draft({ recipientId: "DREW", warningId: "ENVELOPE_MAY_BE_LOST" }), 1)]);
    expect(player.actions).toHaveLength(1);
    expect(planNpcFromBeatStart(world, "DREW")).toEqual(before);
  });
});

describe("v0.3 ordered collisions and revalidation", () => {
  it("lets the player invalidate an NPC object action", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "NEAR_ENVELOPE";
    world.actors.DREW.position = "NEAR_ENVELOPE";
    const playerTake = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const drewTake = makeInteractAction(world, "DREW", "ENVELOPE", "TAKE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [playerTake]), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [drewTake]) } });
    expect(next.envelope.holderId).toBe("PLAYER");
    expect(next.lastResolutions.find((item) => item.actionId === drewTake.id)).toMatchObject({ status: "INVALIDATED", apSpent: 1 });
  });

  it("lets an NPC invalidate a player object action on rotating initiative", () => {
    const world = createInitialWorldV3();
    world.beat = 2;
    world.stateId = "TEST_BEAT_2";
    world.actors.PLAYER.position = "NEAR_ENVELOPE";
    world.actors.DREW.position = "NEAR_ENVELOPE";
    const playerTake = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const drewTake = makeInteractAction(world, "DREW", "ENVELOPE", "TAKE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [playerTake]), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [drewTake]) } });
    expect(next.envelope.holderId).toBe("DREW");
    expect(next.lastResolutions.find((item) => item.actionId === playerTake.id)).toMatchObject({ status: "INVALIDATED", apSpent: 1 });
  });

  it("degrades a queued whisper after Mara independently changes position", () => {
    const world = createInitialWorldV3();
    world.beat = 2;
    world.stateId = "TEST_BEAT_2_WHISPER";
    world.actors.PLAYER.position = "CENTER";
    world.actors.MARA.position = "NEAR_MARA";
    const whisper = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "WHISPER" }), 1);
    const maraMove = makeMoveAction(world, "MARA", "NEAR_DOOR", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [whisper]), { npcPlans: { MARA: plan(world, "MARA", [maraMove]), DREW: createEmptyPlan(world, "DREW") } });
    const result = next.lastResolutions.find((item) => item.actionId === whisper.id);
    expect(result?.status).toBe("DEGRADED");
    expect(result?.sourceTraceRefs.length).toBeGreaterThan(0);
    expect(next.receptions.find((item) => item.messageId === whisper.message.id && item.actorId === "MARA")?.deliveryResolvedAs).toBe("LOW_VOICE");
  });
});

describe("v0.3 visible fail trajectories", () => {
  it("progresses Drew toward lockdown through accumulated state plus an immediate trigger", () => {
    const world = createInitialWorldV3();
    world.actors.DREW.drewConcern = 2;
    world.actors.PLAYER.position = "NEAR_ENVELOPE";
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [take]), { npcPlans: noNpcs(world) });
    expect(next.actors.DREW.drewTrajectory).toBe("LOCKDOWN");
    expect(next.actors.DREW.posture).toContain("envelope");
  });

  it("does not hard-fail Drew from accumulated state without a valid trigger", () => {
    const world = createInitialWorldV3();
    world.actors.DREW.drewConcern = 5;
    world.actors.DREW.drewTrajectory = "SECURING";
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: noNpcs(world) });
    expect(next.terminal?.kind).not.toBe("PLAYER_EJECTED");
  });

  it("progresses Mara to ready-to-leave at the exit after accumulated pressure and a message trigger", () => {
    const world = createInitialWorldV3();
    world.actors.MARA.position = "NEAR_DOOR";
    world.actors.PLAYER.position = "NEAR_DOOR";
    world.actors.MARA.maraExitPressure = 3;
    const warning = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "NORMAL", directness: "BLUNT", warningId: "MARA_MAY_LEAVE", refusalSpace: false }), 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [warning]), { npcPlans: noNpcs(world) });
    expect(next.actors.MARA.maraTrajectory).toBe("READY_TO_LEAVE");
    expect(next.terminal).toBeNull();
  });

  it("manifests Mara's hard fail through her ordinary LEAVE action", () => {
    const world = createInitialWorldV3();
    world.actors.MARA.position = "NEAR_DOOR";
    world.actors.MARA.maraExitPressure = 4;
    world.actors.MARA.maraTrajectory = "READY_TO_LEAVE";
    const maraPlan = planNpcFromBeatStart(world, "MARA");
    expect(maraPlan.actions[0]).toMatchObject({ kind: "INTERACT", operation: "LEAVE" });
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: { MARA: maraPlan, DREW: createEmptyPlan(world, "DREW") } });
    expect(next.actors.MARA).toMatchObject({ active: false, maraTrajectory: "FLEE" });
    expect(next.terminal?.kind).toBe("MARA_FLED");
  });

  it("manifests Drew's ejection through an ordinary warning MESSAGE after lockdown", () => {
    const world = createInitialWorldV3();
    world.actors.DREW.drewConcern = 5;
    world.actors.DREW.drewTrajectory = "LOCKDOWN";
    const drewPlan = planNpcFromBeatStart(world, "DREW");
    const warning = drewPlan.actions.find((action) => action.kind === "MESSAGE");
    expect(warning).toBeDefined();
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: drewPlan } });
    expect(next.actors.DREW.drewTrajectory).toBe("EJECT");
    expect(next.actors.PLAYER.active).toBe(false);
    expect(next.terminal?.kind).toBe("PLAYER_EJECTED");
  });

  it("keeps accumulated Mara pressure non-terminal without the immediate trigger", () => {
    const world = createInitialWorldV3();
    world.actors.MARA.position = "NEAR_DOOR";
    world.actors.MARA.maraExitPressure = 4;
    world.actors.MARA.maraTrajectory = "READY_TO_LEAVE";
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: noNpcs(world) });
    expect(next.terminal?.kind).not.toBe("MARA_FLED");
  });
});

describe("v0.3 determinism and mutation-time provenance", () => {
  it("replays the same seed, state, and plans into the same outcome and trace", () => {
    const first = createInitialWorldV3(7);
    const second = createInitialWorldV3(7);
    const firstAction = makeMoveAction(first, "PLAYER", "NEAR_MARA", 1);
    const secondAction = makeMoveAction(second, "PLAYER", "NEAR_MARA", 1);
    const firstResult = resolveBeatV3(first, plan(first, "PLAYER", [firstAction]));
    const secondResult = resolveBeatV3(second, plan(second, "PLAYER", [secondAction]));
    expect(firstResult).toEqual(secondResult);
  });

  it("retains mutation-time cause, prior/new state, action, and resolution status", () => {
    const world = createInitialWorldV3();
    const action = makeMoveAction(world, "PLAYER", "NEAR_MARA", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    const trace = next.traces.find((item) => item.actionId === action.id && item.path === "actors.PLAYER.position");
    expect(trace).toMatchObject({ actorId: "PLAYER", actionId: action.id, priorState: "CENTER", newState: "NEAR_MARA", ruleId: "RULE_DISCRETE_MOVE_STEP", resolutionStatus: "NORMAL" });
    expect(trace?.cause).toBeTruthy();
  });

  it("derives concise causal history from actual trace references", () => {
    const world = createInitialWorldV3();
    const action = makeScanAction(world, "PLAYER", "OBJECT", "ENVELOPE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    const event = next.history.find((item) => item.actionId === action.id);
    expect(event?.traceRefs.length).toBeGreaterThan(0);
    for (const ref of event?.traceRefs ?? []) expect(next.traces.some((trace) => trace.id === ref)).toBe(true);
  });

  it("keeps the session queue legal and resets it after Commit Beat", () => {
    let session = createInitialSessionV3();
    const action = makeScanAction(session.world, "PLAYER", "ROOM", "ROOM", 1);
    session = appendPlayerAction(session, action);
    expect(session.playerPlan.actions).toHaveLength(1);
    session = commitPlayerBeat(session, { npcPlans: noNpcs(session.world) });
    expect(session.playerPlan.actions).toHaveLength(0);
    expect(session.world.beat).toBe(2);
  });
});

describe("v0.3 documented end-to-end acceptance Beat", () => {
  it("revalidates a whisper after independent movement, leaks a fragment, and ends with Drew guarding", () => {
    const world = createInitialWorldV3(7);
    expect(world.currentRoomEvent.title).toBe("Phone buzz");
    const playerMove = makeMoveAction(world, "PLAYER", "NEAR_MARA", 1);
    const playerWhisper = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", coreContentId: "ASK_FOR_ENVELOPE", deliveryMode: "WHISPER", reasonId: "SAFETY" }), 2);
    const playerScan = makeScanAction(world, "PLAYER", "OBJECT", "ENVELOPE", 3);
    const maraMove = makeMoveAction(world, "MARA", "NEAR_DOOR", 1);
    const maraScan = makeScanAction(world, "MARA", "ACTOR", "DREW", 2);
    const drewScan = makeScanAction(world, "DREW", "ACTOR", "MARA", 1);
    const drewMove = makeMoveAction(world, "DREW", "NEAR_ENVELOPE", 2);
    const drewGuard = makeInteractAction(world, "DREW", "ENVELOPE", "GUARD", 3);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [playerMove, playerWhisper, playerScan]), {
      npcPlans: {
        MARA: plan(world, "MARA", [maraMove, maraScan]),
        DREW: plan(world, "DREW", [drewScan, drewMove, drewGuard]),
      },
    });
    expect(next.lastResolutions.find((item) => item.actionId === playerWhisper.id)?.status).toBe("DEGRADED");
    expect(next.receptions.find((item) => item.messageId === playerWhisper.message.id && item.actorId === "DREW")).toMatchObject({ kind: "OVERHEARD_PARTIAL", fragment: "...the envelope..." });
    expect(next.actors.MARA.position).toBe("NEAR_DOOR");
    expect(next.actors.DREW.position).toBe("NEAR_ENVELOPE");
    expect(next.envelope).toMatchObject({ state: "GUARDED", guardedBy: "DREW" });
    expect(next.history.some((event) => event.text.includes("degraded"))).toBe(true);
    expect(next.traces.every((trace) => trace.ruleId && trace.cause)).toBe(true);
  });
});

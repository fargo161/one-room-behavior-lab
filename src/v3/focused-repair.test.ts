import { describe, expect, it } from "vitest";
import { prototypeConfig } from "./config";
import {
  actorProximity,
  createEmptyPlan,
  createInitialWorldV3,
  makeDistractAction,
  makeInteractAction,
  makeMessageAction,
  makeMoveAction,
  makeScanAction,
  objectInvariantIssues,
  planNpcFromBeatStart,
  plausibleDeliveryModes,
  resolveBeatV3,
  roomDistance,
  validatePlan,
} from "./engine";
import {
  contextualMessageCategories,
  defaultPlayerMessageDraft,
  derivePackagingEvidence,
  messageCompatibilityRules,
  validateMessageDraft,
} from "./messages";
import { roomAnchors } from "./types";
import type { ActorId, ActorPlan, MessageDraftV3, PlannedAction, WorldStateV3 } from "./types";

const plan = (world: WorldStateV3, actorId: ActorId, actions: PlannedAction[]): ActorPlan => ({ actorId, beat: world.beat, actions, plannedFromStateId: world.stateId });
const noNpcs = (world: WorldStateV3) => ({ MARA: createEmptyPlan(world, "MARA"), DREW: createEmptyPlan(world, "DREW") });
const draft = (overrides: Partial<MessageDraftV3> = {}): MessageDraftV3 => ({ ...defaultPlayerMessageDraft(), ...overrides });

describe("focused repair P0 object-state integrity", () => {
  it("moves a held envelope with its holder and leaves no stale position", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "TABLE";
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const move = makeMoveAction(world, "PLAYER", "WINDOW", 2);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [take, move]), { npcPlans: noNpcs(world) });
    expect(next.actors.PLAYER.position).toBe("CENTER");
    expect(next.envelope).toMatchObject({ state: "HELD", holderId: "PLAYER", position: "CENTER" });
    expect(objectInvariantIssues(next)).toEqual([]);
    expect(next.traces.some((trace) => trace.ruleId === "RULE_OBJECT_FOLLOWS_HOLDER" && trace.path === "envelope.position")).toBe(true);
  });

  it("blocks TAKE against an enforceable guard", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.envelope.state = "GUARDED";
    world.envelope.guardedBy = "DREW";
    world.actors.DREW.guardCompromisedUntilBeat = null;
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [take]), { npcPlans: noNpcs(world) });
    expect(next.lastResolutions.find((item) => item.actionId === take.id)?.status).toBe("INVALIDATED");
    expect(next.envelope).toMatchObject({ state: "GUARDED", holderId: null, guardedBy: "DREW" });
  });

  it("permits TAKE through a compromised guard and records intentional contest", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.envelope.state = "GUARDED";
    world.envelope.guardedBy = "DREW";
    world.actors.DREW.guardCompromisedUntilBeat = world.beat;
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [take]), { npcPlans: noNpcs(world) });
    expect(next.envelope).toMatchObject({ state: "HELD", holderId: "PLAYER", guardedBy: "DREW", position: "TABLE" });
    expect(objectInvariantIssues(next)).toEqual([]);
  });

  it("prevents ordinary TAKE against secured possession", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "TABLE";
    world.envelope = { ...world.envelope, state: "SECURED", holderId: "DREW", guardedBy: null, position: "TABLE" };
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [take]), { npcPlans: noNpcs(world) });
    expect(next.lastResolutions[0].status).toBe("INVALIDATED");
    expect(next.envelope.holderId).toBe("DREW");
  });

  it("clears holder, guard, visibility, and ordinary access on LOCK_AWAY", () => {
    const world = createInitialWorldV3();
    world.envelope = { ...world.envelope, state: "SECURED", holderId: "DREW", guardedBy: "PLAYER", position: "TABLE", visible: true };
    world.actors.PLAYER.position = "TABLE";
    const lock = makeInteractAction(world, "DREW", "ENVELOPE", "LOCK_AWAY", 1);
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [lock]) } });
    expect(next.envelope).toMatchObject({ state: "LOCKED_AWAY", holderId: null, guardedBy: null, visible: false, position: "CABINET" });
    expect(objectInvariantIssues(next)).toEqual([]);
  });

  it("applies the same TAKE physics to Mara", () => {
    const world = createInitialWorldV3();
    world.actors.MARA.position = "TABLE";
    const take = makeInteractAction(world, "MARA", "ENVELOPE", "TAKE", 1);
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: { MARA: plan(world, "MARA", [take]), DREW: createEmptyPlan(world, "DREW") } });
    expect(next.envelope).toMatchObject({ state: "HELD", holderId: "MARA", position: "TABLE" });
    expect(objectInvariantIssues(next)).toEqual([]);
  });
});

describe("focused repair P1 physical and actor-targeted movement", () => {
  it("uses only actor-independent physical topology", () => {
    expect(roomAnchors).toEqual(["CENTER", "TABLE", "DOOR", "WINDOW", "CABINET"]);
    expect(roomAnchors.some((anchor) => anchor.includes("MARA") || anchor.includes("DREW"))).toBe(false);
  });

  it("naturally retargets the same actor identity after that actor moves", () => {
    const world = createInitialWorldV3();
    world.beat = 2;
    world.actors.PLAYER.position = "WINDOW";
    world.actors.MARA.position = "CENTER";
    const followMara = makeMoveAction(world, "PLAYER", "MARA", 1);
    const maraMoves = makeMoveAction(world, "MARA", "DOOR", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [followMara]), { npcPlans: { MARA: plan(world, "MARA", [maraMoves]), DREW: createEmptyPlan(world, "DREW") } });
    const result = next.lastResolutions.find((item) => item.actionId === followMara.id);
    expect(result?.status).toBe("NATURAL_RETARGET");
    expect(next.actors.PLAYER.position).toBe("CENTER");
    expect(result?.summary).toContain("adjusted course");
  });

  it("invalidates actor-targeted movement when the actor leaves the room", () => {
    const world = createInitialWorldV3();
    world.beat = 2;
    world.actors.PLAYER.position = "WINDOW";
    world.actors.DREW.position = "DOOR";
    const followDrew = makeMoveAction(world, "PLAYER", "DREW", 1);
    const leave = makeInteractAction(world, "DREW", "DOOR", "LEAVE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [followDrew]), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [leave]) } });
    expect(next.lastResolutions.find((item) => item.actionId === followDrew.id)?.status).toBe("INVALIDATED");
  });

  it("moves exactly one graph edge and derives proximity from positions", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "WINDOW";
    world.actors.MARA.position = "CABINET";
    const move = makeMoveAction(world, "PLAYER", "MARA", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [move]), { npcPlans: noNpcs(world) });
    expect(next.actors.PLAYER.position).toBe("CENTER");
    expect(actorProximity(next, "PLAYER", "MARA")).toBe(roomDistance("CENTER", "CABINET"));
    expect(next.traces.some((trace) => trace.actionId === move.id && trace.ruleId === "RULE_MOVEMENT_IS_OBSERVABLE")).toBe(true);
  });
});

describe("focused repair P1 observer-relative distraction consequence", () => {
  it("allows two NPCs to form different attributions from one distraction", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "WINDOW";
    world.actors.MARA.attention = { kind: "ACTOR", id: "PLAYER" };
    world.actors.DREW.attention = { kind: "OBJECT", id: "ENVELOPE" };
    const distract = makeDistractAction(world, "DREW", "COVERT_WINDOW_RATTLE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [distract]), { npcPlans: noNpcs(world) });
    expect(next.lastResolutions[0].distraction?.attributionByObserver).toEqual({ MARA: "LIKELY", DREW: "NONE" });
    expect(next.actors.MARA.vigilance).toBeGreaterThan(next.actors.DREW.vigilance);
  });

  it("makes DIRECT, LIKELY, and POSSIBLE attribution behaviorally progressive", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.actors.MARA.position = "WINDOW";
    world.actors.MARA.attention = { kind: "OBJECT", id: "ENVELOPE" };
    const distract = makeDistractAction(world, "DREW", "VISIBLE_CALL", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [distract]), { npcPlans: noNpcs(world) });
    expect(next.lastResolutions[0].distraction?.attributionByObserver).toEqual({ MARA: "POSSIBLE", DREW: "DIRECT" });
    expect(next.actors.DREW.vigilance).toBe(prototypeConfig.impacts.directManipulationVigilance);
    expect(next.actors.MARA.vigilance).toBe(prototypeConfig.impacts.possibleManipulationVigilance);
  });

  it("connects an observed distraction with later exploitation", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    const distract = makeDistractAction(world, "DREW", "VISIBLE_CALL", 1);
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 2);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [distract, take]), { npcPlans: noNpcs(world) });
    expect(next.actors.DREW.distractionBeliefs.find((belief) => belief.actionId === distract.id)?.exploited).toBe(true);
    expect(next.actors.DREW.attention).toEqual({ kind: "ACTOR", id: "PLAYER" });
    expect(next.traces.some((trace) => trace.ruleId === "RULE_OBSERVED_EXPLOIT_CONCERN")).toBe(true);
  });

  it("distinguishes attributable failure from hidden failure", () => {
    const watched = createInitialWorldV3(4);
    watched.actors.DREW.attention = { kind: "ACTOR", id: "PLAYER" };
    const hidden = createInitialWorldV3(4);
    hidden.actors.DREW.attention = { kind: "OBJECT", id: "ENVELOPE" };
    const watchedAction = makeDistractAction(watched, "DREW", "COVERT_WINDOW_RATTLE", 1);
    const hiddenAction = makeDistractAction(hidden, "DREW", "COVERT_WINDOW_RATTLE", 1);
    const watchedNext = resolveBeatV3(watched, plan(watched, "PLAYER", [watchedAction]), { npcPlans: noNpcs(watched) });
    const hiddenNext = resolveBeatV3(hidden, plan(hidden, "PLAYER", [hiddenAction]), { npcPlans: noNpcs(hidden) });
    expect(watchedNext.actors.DREW.vigilance).toBeGreaterThan(hiddenNext.actors.DREW.vigilance);
    expect(watchedNext.history.find((event) => event.actionId === watchedAction.id)?.text).not.toMatch(/LIKELY|POSSIBLE/);
  });
});

describe("focused repair P1 bounded message construction", () => {
  it("exposes contextual categories from one shared scenario rule", () => {
    expect(contextualMessageCategories("ASK_FOR_ENVELOPE")).toEqual(messageCompatibilityRules.ASK_FOR_ENVELOPE.allowed);
    expect(contextualMessageCategories("ASK_INTENTIONS")).not.toContain("promiseId");
  });

  it("blocks incompatible components and enforces scenario-required support", () => {
    const world = createInitialWorldV3();
    expect(validateMessageDraft(world, draft({ coreContentId: "ASK_INTENTIONS", warningId: "MARA_MAY_LEAVE" })).valid).toBe(false);
    const unsupported = validateMessageDraft(world, draft({ coreContentId: "SHARE_AUTHORIZATION" }));
    expect(unsupported.requiredMissing).toContain("evidenceId");
  });

  it("allows risky but semantically valid support", () => {
    const world = createInitialWorldV3();
    const result = validateMessageDraft(world, draft({ coreContentId: "SHARE_AUTHORIZATION", evidenceId: "SIGNED_NOTE" }));
    expect(result.valid).toBe(true);
    expect(result.riskyComponents).toContain("evidenceId");
  });

  it("changes world-state availability without duplicating UI law", () => {
    const closed = createInitialWorldV3(0);
    const open = createInitialWorldV3(4);
    open.room.doorOpen = true;
    const message = draft({ coreContentId: "WARN_ABOUT_EXIT", evidenceId: "OPEN_DOOR" });
    expect(validateMessageDraft(closed, message).valid).toBe(false);
    expect(validateMessageDraft(open, message).valid).toBe(true);
  });

  it("degrades when optional support disappears mid-Beat and traces the loss", () => {
    const world = createInitialWorldV3();
    world.beat = 2;
    world.room.doorOpen = true;
    world.actors.DREW.position = "DOOR";
    const message = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", coreContentId: "WARN_ABOUT_EXIT", conditionId: "IF_DREW_STEPS_AWAY" }), 1);
    const leave = makeInteractAction(world, "DREW", "DOOR", "LEAVE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [message]), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [leave]) } });
    expect(next.lastResolutions.find((item) => item.actionId === message.id)?.status).toBe("DEGRADED");
    expect(next.traces.some((trace) => trace.ruleId === "RULE_MESSAGE_SUPPORT_REVALIDATION")).toBe(true);
  });

  it("invalidates when required support disappears mid-Beat", () => {
    const world = createInitialWorldV3();
    world.beat = 2;
    world.actors.DREW.position = "DOOR";
    const message = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", coreContentId: "SHARE_AUTHORIZATION", evidenceId: "DREW_GLANCES" }), 1);
    const leave = makeInteractAction(world, "DREW", "DOOR", "LEAVE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [message]), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [leave]) } });
    expect(next.lastResolutions.find((item) => item.actionId === message.id)?.status).toBe("INVALIDATED");
  });

  it("keeps one structured message at one AP regardless of valid additions", () => {
    const world = createInitialWorldV3();
    const message = makeMessageAction(world, "PLAYER", draft({ coreContentId: "ASK_FOR_ENVELOPE", reasonId: "SAFETY", promiseId: "RETURN_ENVELOPE", offerId: "STEP_BACK", refusalSpace: true }), 1);
    expect(validatePlan(world, plan(world, "PLAYER", [message]))).toMatchObject({ legal: true, apCommitted: 1 });
  });

  it("offers only currently plausible delivery modes", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "WINDOW";
    world.actors.MARA.position = "CABINET";
    expect(plausibleDeliveryModes(world, "PLAYER", "MARA")).toEqual(["NORMAL"]);
    world.actors.MARA.position = "WINDOW";
    expect(plausibleDeliveryModes(world, "PLAYER", "MARA")).toEqual(["NORMAL", "LOW_VOICE", "WHISPER"]);
  });
});

describe("focused repair P2 operative NPC planning", () => {
  it("changes ranked decisions when operative weights change", () => {
    const world = createInitialWorldV3();
    const defaultPlan = planNpcFromBeatStart(world, "MARA");
    const informationFirst = planNpcFromBeatStart(world, "MARA", { seekInformation: 500 });
    expect(defaultPlan.actions[0].kind).toBe("MOVE");
    expect(informationFirst.actions[0].kind).toBe("SCAN");
    expect(informationFirst.rationale?.candidates.find((item) => item.goal === "seekInformation")?.weight).toBe(500);
  });

  it("lets hard trajectory constraints override extreme unrelated weights", () => {
    const world = createInitialWorldV3();
    world.actors.MARA.maraTrajectory = "READY_TO_LEAVE";
    const npcPlan = planNpcFromBeatStart(world, "MARA", { seekInformation: 9999 });
    expect(npcPlan.actions[0]).toMatchObject({ kind: "MOVE", target: { kind: "LOCATION", id: "DOOR" } });
    expect(npcPlan.rationale?.hardConstraint).toContain("mandatory");
  });

  it("is deterministic and independent of the queued player plan", () => {
    const world = createInitialWorldV3();
    const before = planNpcFromBeatStart(world, "DREW");
    makeDistractAction(world, "DREW", "VISIBLE_CALL", 1);
    expect(planNpcFromBeatStart(world, "DREW")).toEqual(before);
  });
});

describe("focused repair P2 mechanical room events", () => {
  it("gives every event family an operative effect identity", () => {
    const worlds = [createInitialWorldV3(3), createInitialWorldV3(4), createInitialWorldV3(0), createInitialWorldV3(1), createInitialWorldV3(2)];
    expect(new Set(worlds.map((world) => world.currentRoomEvent.family)).size).toBe(5);
    expect(new Set(worlds.map((world) => world.currentRoomEvent.effectId)).size).toBe(5);
    expect(worlds.every((world) => world.traces.some((trace) => trace.actionId === world.currentRoomEvent.id))).toBe(true);
  });

  it("makes POSITION_CHANGE persistent and REVEAL_ACCESS actionable", () => {
    expect(createInitialWorldV3(4).room.doorOpen).toBe(true);
    const reveal = createInitialWorldV3(1);
    reveal.actors.PLAYER.position = "WINDOW";
    const inspect = makeInteractAction(reveal, "PLAYER", "ENVELOPE", "INSPECT", 1);
    const next = resolveBeatV3(reveal, plan(reveal, "PLAYER", [inspect]), { npcPlans: noNpcs(reveal) });
    expect(next.lastResolutions.find((item) => item.actionId === inspect.id)?.status).not.toBe("INVALIDATED");
  });

  it("keeps natural distraction free of player attribution", () => {
    const world = createInitialWorldV3(2);
    expect(world.currentRoomEvent.family).toBe("DISTRACTION");
    expect(world.actors.DREW.guardCompromisedUntilBeat).toBe(world.beat);
    expect(world.actors.DREW.distractionBeliefs).toEqual([]);
  });

  it("expires Beat-scoped affordances deterministically", () => {
    const world = createInitialWorldV3(1);
    expect(world.room.envelopeAccessRevealed).toBe(true);
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: noNpcs(world) });
    expect(next.beat).toBe(2);
    expect(next.room.envelopeAccessRevealed).toBe(false);
    expect(next.room.temporaryAffordances.some((item) => item.id === "ENVELOPE_REVEALED")).toBe(false);
  });
});

describe("focused repair P2 inference and P3 accounting", () => {
  it("returns richer SCAN evidence without trajectory labels", () => {
    const world = createInitialWorldV3();
    world.actors.DREW.drewTrajectory = "LOCKDOWN";
    const scan = makeScanAction(world, "PLAYER", "ACTOR", "DREW", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [scan]), { npcPlans: noNpcs(world) });
    const summary = next.lastResolutions.find((item) => item.actionId === scan.id)?.summary ?? "";
    expect(summary).toContain("Drew");
    expect(summary).not.toContain("LOCKDOWN");
  });

  it("keeps Packaging Evidence grounded and free of inferred hidden classifications", () => {
    const evidence = derivePackagingEvidence(draft({ directness: "BLUNT", deliveryMode: "LOW_VOICE", qualificationId: "IF_I_AM_RIGHT" }));
    expect(evidence).toMatchObject({ directness: "BLUNT", delivery: "LOW_VOICE", qualification: true });
    expect(evidence).not.toHaveProperty("emotion");
    expect(evidence).not.toHaveProperty("based");
    expect(evidence).not.toHaveProperty("function");
    expect(evidence).not.toHaveProperty("motive");
  });

  it("does not grant free movement when the same object moves", () => {
    const world = createInitialWorldV3();
    world.beat = 3;
    world.actors.PLAYER.position = "CENTER";
    const wait = makeScanAction(world, "PLAYER", "ROOM", "ROOM", 1);
    const inspect = makeInteractAction(world, "PLAYER", "ENVELOPE", "INSPECT", 2);
    const take = makeInteractAction(world, "DREW", "ENVELOPE", "TAKE", 1);
    const move = makeMoveAction(world, "DREW", "CABINET", 2);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [wait, inspect]), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [take, move]) } });
    expect(next.lastResolutions.find((item) => item.actionId === inspect.id)?.status).toBe("INVALIDATED");
    expect(next.actors.PLAYER.position).toBe("CENTER");
  });

  it("respects impossible direct audibility without depending on ordinary attention", () => {
    const impossible = createInitialWorldV3();
    impossible.actors.PLAYER.position = "WINDOW";
    impossible.actors.MARA.position = "CABINET";
    impossible.roomNoise = "LOUD";
    const farMessage = makeMessageAction(impossible, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "NORMAL" }), 1);
    const farNext = resolveBeatV3(impossible, plan(impossible, "PLAYER", [farMessage]), { npcPlans: noNpcs(impossible) });
    expect(farNext.receptions.find((item) => item.messageId === farMessage.message.id && item.actorId === "MARA")?.kind).toBe("NONE");

    const ordinary = createInitialWorldV3();
    ordinary.actors.MARA.position = "TABLE";
    ordinary.actors.MARA.attention = { kind: "OBJECT", id: "ENVELOPE" };
    const nearMessage = makeMessageAction(ordinary, "PLAYER", draft({ recipientId: "MARA", deliveryMode: "NORMAL" }), 1);
    const nearNext = resolveBeatV3(ordinary, plan(ordinary, "PLAYER", [nearMessage]), { npcPlans: noNpcs(ordinary) });
    expect(nearNext.receptions.find((item) => item.messageId === nearMessage.message.id && item.actorId === "MARA")?.kind).toBe("DIRECT");
  });

  it("records every later commitment cancelled by terminal state and retains AP", () => {
    const world = createInitialWorldV3();
    world.actors.MARA.position = "DOOR";
    world.actors.MARA.maraTrajectory = "READY_TO_LEAVE";
    world.actors.MARA.maraExitPressure = 4;
    const actions = [makeScanAction(world, "PLAYER", "ROOM", "ROOM", 1), makeMoveAction(world, "PLAYER", "TABLE", 2), makeScanAction(world, "PLAYER", "OBJECT", "ENVELOPE", 3)];
    const leave = makeInteractAction(world, "MARA", "DOOR", "LEAVE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", actions), { npcPlans: { MARA: plan(world, "MARA", [leave]), DREW: createEmptyPlan(world, "DREW") } });
    expect(next.terminal?.kind).toBe("MARA_FLED");
    expect(next.terminal?.sourceTraceRefs.length).toBeGreaterThan(0);
    expect(next.lastResolutions.filter((item) => item.status === "CANCELLED_BY_TERMINAL").map((item) => item.actionId)).toEqual([actions[1].id, actions[2].id]);
    expect(next.actors.PLAYER.apCommitted).toBe(3);
    expect(next.traces.some((trace) => trace.ruleId === "RULE_TERMINAL_STATE_PROVENANCE")).toBe(true);
    expect(next.traces.filter((trace) => trace.ruleId === "RULE_TERMINAL_CANCELS_LATER_COMMITMENT")).toHaveLength(2);
  });
});

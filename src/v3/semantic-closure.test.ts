import { describe, expect, it } from "vitest";
import { roomEventDefinitions } from "./config";
import {
  actionCurrentlyLegal,
  actorHandsForDisplay,
  availableInteractionOperations,
  createEmptyPlan,
  createInitialWorldV3,
  makeDistractAction,
  makeInteractAction,
  makeMessageAction,
  makeMoveAction,
  objectInvariantIssues,
  planNpcFromBeatStart,
  resolveBeatV3,
} from "./engine";
import { createStructuredMessage, defaultPlayerMessageDraft, getMessageOptionState, messagePayloadFingerprint, validateMessageDraft } from "./messages";
import type { ActorId, ActorPlan, MessageDraftV3, PlannedAction, RoomEventState, WorldStateV3 } from "./types";

const plan = (world: WorldStateV3, actorId: ActorId, actions: PlannedAction[]): ActorPlan => ({ actorId, beat: world.beat, actions, plannedFromStateId: world.stateId });
const noNpcs = (world: WorldStateV3) => ({ MARA: createEmptyPlan(world, "MARA"), DREW: createEmptyPlan(world, "DREW") });
const draft = (overrides: Partial<MessageDraftV3> = {}): MessageDraftV3 => ({ ...defaultPlayerMessageDraft(), ...overrides });
const observe = (world: WorldStateV3, target: string, line: string) => world.actors.PLAYER.observations.push({ id: `OBS_${target}_${world.actors.PLAYER.observations.length}`, beat: world.beat, actorId: "PLAYER", target, evidence: [line], sourceActionId: "TEST_OBSERVATION" });

describe("semantic closure 1 and 7: possession truth and shared SECURE affordance", () => {
  it("does not let a guard-only actor SECURE an envelope held by someone else", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.envelope = { ...world.envelope, state: "HELD", holderId: "PLAYER", guardedBy: "DREW" };
    const secure = makeInteractAction(world, "DREW", "ENVELOPE", "SECURE", 1);
    expect(actionCurrentlyLegal(world, secure)).toBe(false);
    const next = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [secure]) } });
    expect(next.lastResolutions[0].status).toBe("INVALIDATED");
    expect(next.envelope).toMatchObject({ state: "HELD", holderId: "PLAYER", guardedBy: "DREW" });
    expect(objectInvariantIssues(next)).toEqual([]);
  });

  it("lets the physical holder SECURE and exposes that affordance to the player", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.envelope = { ...world.envelope, state: "HELD", holderId: "PLAYER", guardedBy: null };
    expect(availableInteractionOperations(world, "PLAYER")).toContain("SECURE");
    const secure = makeInteractAction(world, "PLAYER", "ENVELOPE", "SECURE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [secure]), { npcPlans: noNpcs(world) });
    expect(next.envelope).toMatchObject({ state: "SECURED", holderId: "PLAYER" });
  });

  it("hides SECURE from a non-holder and keeps LOCK_AWAY Drew-specific", () => {
    const world = createInitialWorldV3(4);
    expect(availableInteractionOperations(world, "PLAYER")).not.toContain("SECURE");
    expect(availableInteractionOperations(world, "PLAYER")).not.toContain("LOCK_AWAY");
    world.envelope = { ...world.envelope, state: "SECURED", holderId: "DREW" };
    world.actors.DREW.position = "CABINET";
    world.envelope.position = "CABINET";
    expect(availableInteractionOperations(world, "DREW")).toContain("LOCK_AWAY");
  });

  it("does not let a compromised guard bypass explicit possession transfer", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.envelope = { ...world.envelope, state: "HELD", holderId: "PLAYER", guardedBy: "DREW" };
    world.actors.DREW.guardCompromisedUntilBeat = world.beat;
    expect(actionCurrentlyLegal(world, makeInteractAction(world, "DREW", "ENVELOPE", "SECURE", 1))).toBe(false);
  });
});

describe("semantic closure 3: value-level evidence and provenance", () => {
  it("blocks authorization plus open-door evidence as incompatible", () => {
    const world = createInitialWorldV3(4);
    world.room.doorOpen = true;
    const message = draft({ coreContentId: "SHARE_AUTHORIZATION", evidenceId: "OPEN_DOOR" });
    expect(validateMessageDraft(world, message)).toMatchObject({ valid: false, componentStatuses: { evidenceId: "INCOMPATIBLE" } });
    expect(getMessageOptionState(world, message, "evidenceId", "OPEN_DOOR").enabled).toBe(false);
  });

  it("grounds signed-note authorization only in a player observation", () => {
    const world = createInitialWorldV3();
    const message = draft({ coreContentId: "SHARE_AUTHORIZATION", evidenceId: "SIGNED_NOTE" });
    expect(validateMessageDraft(world, message).componentStatuses.evidenceId).toBe("RISKY_UNSUPPORTED");
    observe(world, "ENVELOPE", "A signed note authorizes handling the envelope.");
    expect(validateMessageDraft(world, message)).toMatchObject({ valid: true, componentStatuses: { evidenceId: "SUPPORTED" } });
  });

  it("grounds DREW_GLANCES only after observing Drew's envelope behavior", () => {
    const world = createInitialWorldV3();
    const message = draft({ coreContentId: "ASK_FOR_ENVELOPE", evidenceId: "DREW_GLANCES" });
    expect(validateMessageDraft(world, message).componentStatuses.evidenceId).toBe("RISKY_UNSUPPORTED");
    observe(world, "DREW", "Drew keeps glancing toward the envelope.");
    expect(validateMessageDraft(world, message).componentStatuses.evidenceId).toBe("SUPPORTED");
  });

  it("requires a relevant Mara statement rather than any Mara speech", () => {
    const world = createInitialWorldV3();
    const message = draft({ coreContentId: "SHARE_AUTHORIZATION", evidenceId: "MARA_STATEMENT" });
    world.messages.push(createStructuredMessage("MARA", world.beat, draft({ recipientId: "PLAYER", coreContentId: "ASK_INTENTIONS" })));
    expect(validateMessageDraft(world, message).componentStatuses.evidenceId).toBe("RISKY_UNSUPPORTED");
    world.messages.push(createStructuredMessage("MARA", world.beat, draft({ recipientId: "PLAYER", coreContentId: "SHARE_AUTHORIZATION", evidenceId: "SIGNED_NOTE" })));
    expect(validateMessageDraft(world, message).componentStatuses.evidenceId).toBe("SUPPORTED");
  });

  it("keeps open-door evidence valid for exit-related messages", () => {
    const world = createInitialWorldV3(4);
    world.room.doorOpen = true;
    expect(validateMessageDraft(world, draft({ coreContentId: "WARN_ABOUT_EXIT", evidenceId: "OPEN_DOOR" }))).toMatchObject({ valid: true, componentStatuses: { evidenceId: "SUPPORTED" } });
  });
});

describe("semantic closure 4: planned and effective message identity", () => {
  it("keeps equal payloads stable and changes identity for semantic changes independent of wording", () => {
    const base = draft({ recipientId: "MARA", coreContentId: "WARN_ABOUT_EXIT" });
    const first = createStructuredMessage("PLAYER", 2, base);
    const same = createStructuredMessage("PLAYER", 2, base);
    const changed = createStructuredMessage("PLAYER", 2, { ...base, conditionId: "IF_DREW_STEPS_AWAY" });
    expect(first.id).toBe(same.id);
    expect(changed.id).not.toBe(first.id);
    expect(first.id).toContain(messagePayloadFingerprint({ version: first.version, beat: first.beat, senderId: first.senderId, intendedRecipients: first.intendedRecipients, coreContentId: first.coreContentId, components: first.components, deliveryMode: first.deliveryMode }));
  });

  it("assigns degraded payload an effective identity and traces planned-to-effective lineage", () => {
    const world = createInitialWorldV3(4);
    world.beat = 2;
    world.actors.DREW.position = "DOOR";
    const message = makeMessageAction(world, "PLAYER", draft({ recipientId: "MARA", coreContentId: "WARN_ABOUT_EXIT", conditionId: "IF_DREW_STEPS_AWAY" }), 1);
    const leave = makeInteractAction(world, "DREW", "DOOR", "LEAVE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [message]), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [leave]) } });
    const result = next.lastResolutions.find((item) => item.actionId === message.id)!;
    expect(result.messageIdentity?.plannedMessageId).toBe(message.message.id);
    expect(result.messageIdentity?.effectiveMessageId).not.toBe(message.message.id);
    expect(result.messageIdentity?.degradedFromMessageId).toBe(message.message.id);
    expect(next.messages.at(-1)?.id).toBe(result.messageIdentity?.effectiveMessageId);
    expect(next.traces.some((trace) => trace.ruleId === "RULE_MESSAGE_IDENTITY_LINEAGE" && trace.newState && (trace.newState as { effectiveMessageId?: string }).effectiveMessageId === result.messageIdentity?.effectiveMessageId)).toBe(true);
  });
});

describe("semantic closure 5, 6, and 11: observer evidence and operative vigilance", () => {
  it("links exploitation only for an observer who saw both stages", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.actors.MARA.position = "CENTER";
    world.actors.MARA.attention = { kind: "ACTOR", id: "PLAYER" };
    const distract = makeDistractAction(world, "DREW", "VISIBLE_CALL", 1);
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 2);
    const maraMove = makeMoveAction(world, "MARA", "DOOR", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [distract, take]), { npcPlans: { MARA: plan(world, "MARA", [maraMove]), DREW: createEmptyPlan(world, "DREW") } });
    expect(next.actors.DREW.distractionBeliefs.find((item) => item.actionId === distract.id)?.exploited).toBe(true);
    expect(next.actors.MARA.distractionBeliefs.find((item) => item.actionId === distract.id)?.exploited).toBe(false);
    expect(next.traces.some((trace) => trace.ruleId === "RULE_OBSERVED_EXPLOIT_CONCERN")).toBe(true);
  });

  it("does not infer combined causality when the observer missed the distraction", () => {
    const world = createInitialWorldV3(4);
    world.actors.PLAYER.position = "TABLE";
    world.actors.MARA.position = "TABLE";
    world.actors.MARA.attention = { kind: "OBJECT", id: "ENVELOPE" };
    const distract = makeDistractAction(world, "DREW", "COVERT_WINDOW_RATTLE", 1);
    const take = makeInteractAction(world, "PLAYER", "ENVELOPE", "TAKE", 2);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [distract, take]), { npcPlans: noNpcs(world) });
    expect(next.actors.MARA.distractionBeliefs.find((item) => item.actionId === distract.id)).toBeUndefined();
  });

  it("stores visibility by observer without contradictory global fields", () => {
    const world = createInitialWorldV3();
    world.actors.PLAYER.position = "WINDOW";
    world.actors.MARA.attention = { kind: "ACTOR", id: "PLAYER" };
    world.actors.DREW.attention = { kind: "OBJECT", id: "ENVELOPE" };
    const action = makeDistractAction(world, "DREW", "COVERT_WINDOW_RATTLE", 1);
    const next = resolveBeatV3(world, plan(world, "PLAYER", [action]), { npcPlans: noNpcs(world) });
    const outcome = next.lastResolutions[0].distraction!;
    expect(outcome.visibilityByObserver.MARA).not.toEqual(outcome.visibilityByObserver.DREW);
    expect(outcome).not.toHaveProperty("playerActionVisible");
    expect(next.traces.some((trace) => trace.ruleId === "RULE_OBSERVER_RELATIVE_ATTRIBUTION" && trace.visibility?.includes("observer:MARA"))).toBe(true);
  });

  it("makes Mara vigilance deterministically change her first plan and rationale", () => {
    const calm = createInitialWorldV3();
    const vigilant = createInitialWorldV3();
    vigilant.actors.MARA.vigilance = 1;
    expect(planNpcFromBeatStart(calm, "MARA").actions[0].kind).toBe("MOVE");
    expect(planNpcFromBeatStart(vigilant, "MARA").actions[0]).toMatchObject({ kind: "SCAN", targetId: "PLAYER" });
    expect(planNpcFromBeatStart(vigilant, "MARA").rationale?.hardConstraint).toContain("vigilance");
  });
});

describe("semantic closure 8, 9, and 10: operative authored room events", () => {
  it("makes the deterministic light flicker a real guard opening without player attribution", () => {
    const world = createInitialWorldV3(0);
    expect(world.currentRoomEvent.effectId).toBe("LIGHT_OCCUPATION");
    expect(world.room.temporaryAffordances.some((item) => item.id === "LIGHT_FLICKER_OPENING")).toBe(true);
    expect(world.actors.DREW.guardCompromisedUntilBeat).toBe(world.beat);
    expect(world.actors.DREW.distractionBeliefs).toEqual([]);
    expect(actorHandsForDisplay(world, "DREW")).toContain("flickering light");
  });

  it("uses durationBeats to keep a temporary opening through the authored number of Beats", () => {
    const world = createInitialWorldV3(7);
    const definition = roomEventDefinitions.find((item) => item.effectId === "LIGHT_OCCUPATION")!;
    const durationTwo: RoomEventState = { ...structuredClone(definition), id: "TEST_LIGHT_B02", beat: 2, durationBeats: 2 };
    const beat2 = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: noNpcs(world), nextRoomEvent: durationTwo });
    expect(beat2.room.temporaryAffordances.find((item) => item.id === "LIGHT_FLICKER_OPENING")?.expiresAfterBeat).toBe(3);
    const beat3 = resolveBeatV3(beat2, createEmptyPlan(beat2, "PLAYER"), { npcPlans: noNpcs(beat2) });
    expect(beat3.room.temporaryAffordances.some((item) => item.id === "LIGHT_FLICKER_OPENING")).toBe(true);
    const beat4 = resolveBeatV3(beat3, createEmptyPlan(beat3, "PLAYER"), { npcPlans: noNpcs(beat3) });
    expect(beat4.room.temporaryAffordances.some((item) => item.id === "LIGHT_FLICKER_OPENING")).toBe(false);
    expect(beat4.traces.some((trace) => trace.ruleId === "RULE_ROOM_EVENT_AFFORDANCE_EXPIRY")).toBe(true);
  });

  it("removes transient expression without overwriting a later persistent interaction state", () => {
    const world = createInitialWorldV3(0);
    const take = makeInteractAction(world, "DREW", "ENVELOPE", "TAKE", 1);
    const beat2 = resolveBeatV3(world, createEmptyPlan(world, "PLAYER"), { npcPlans: { MARA: createEmptyPlan(world, "MARA"), DREW: plan(world, "DREW", [take]) } });
    expect(actorHandsForDisplay(beat2, "DREW")).toContain("holding the envelope");
    expect(beat2.room.transientExpressions).toEqual([]);
    expect(beat2.traces.some((trace) => trace.ruleId === "RULE_TRANSIENT_EXPRESSION_EXPIRY")).toBe(true);
  });
});

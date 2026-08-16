import { describe, expect, it } from "vitest";
import { loadDefaultContent } from "../content";
import { propositionKey } from "../core/propositions";
import { generateScene } from "../generation";
import {
  actionBuildContext,
  makeAskPackage,
  makeDealPackage,
  makeDirectPackage,
  makeWaitPackage,
} from "../actions";
import { resolveActionPackage } from "./resolution";
import type { Proposition } from "../schemas";
import { resolveBeat, startScene } from "./beat";

const content = loadDefaultContent();

const initialState = () => {
  const generated = generateScene(14, content);
  const state = startScene(generated, generated.playerOptions[0]!.id);
  state.snapshot.scenePressure.beatsRemaining = 8;
  return state;
};

const collisionState = () => {
  const state = initialState();
  const object = state.snapshot.objects[0]!;
  object.holderId = null;
  state.snapshot.worldFacts = state.snapshot.worldFacts.filter(({ proposition }) => !(
    proposition.subjectId === object.id && proposition.predicate === "HELD_BY"
  ));
  state.snapshot.characters.forEach((character) => {
    character.zoneId = object.zoneId;
    if (character.role !== "PLAYER_ROLE") {
      const goal = state.snapshot.goals.find(({ id }) => id === character.primaryGoalId)!;
      goal.definitionId = "goal_possess_primary_object";
      goal.target = { subjectId: object.id, predicate: "HELD_BY", objectId: character.id };
      state.snapshot.beliefs = state.snapshot.beliefs.filter(({ actorId, proposition }) => !(
        actorId === character.id && propositionKey(proposition) === propositionKey(goal.target)
      ));
    }
  });
  return state;
};

describe("Phase 5 deterministic shared Beat engine", () => {
  it("replays the same pre-Beat state and player draft identically", () => {
    const state = initialState();
    const playerPackage = makeWaitPackage(actionBuildContext(state.snapshot), "actor_player");
    expect(resolveBeat(state, playerPackage, content)).toEqual(resolveBeat(structuredClone(state), structuredClone(playerPackage), content));
  });

  it("commits all choices from one snapshot and prevents same-Beat foreknowledge", () => {
    const state = initialState();
    const context = actionBuildContext(state.snapshot);
    const waitResult = resolveBeat(state, makeWaitPackage(context, "actor_player"), content);
    const requested: Proposition = { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" };
    const askResult = resolveBeat(state, makeAskPackage(context, content, "actor_player", "actor_counterpart", requested), content);

    expect(waitResult.reports[0]!.npcDecisions.map(({ selectedActionId }) => selectedActionId)).toEqual(
      askResult.reports[0]!.npcDecisions.map(({ selectedActionId }) => selectedActionId),
    );
    expect(new Set(waitResult.reports[0]!.committedActions.map(({ commitSnapshotId }) => commitSnapshotId))).toEqual(new Set([state.snapshot.stateId]));
    expect(new Set(waitResult.reports[0]!.npcDecisions.map(({ decisionSnapshotId }) => decisionSnapshotId))).toEqual(new Set([state.snapshot.stateId]));
  });

  it("invalidates later committed TAKE attempts after the first actor changes possession", () => {
    const state = collisionState();
    const object = state.snapshot.objects[0]!;
    const intention: Proposition = { subjectId: object.id, predicate: "HELD_BY", objectId: "actor_player" };
    const playerTake = makeDirectPackage(actionBuildContext(state.snapshot), content, "actor_player", "action_take", object.id, [intention], { objectId: object.id });
    const next = resolveBeat(state, playerTake, content);
    const report = next.reports[0]!;
    const takeResolutions = report.actionResolutions.filter((resolution) => (
      report.committedActions.find(({ action }) => action.id === resolution.actionId)?.action.family === "DIRECT"
      && report.committedActions.find(({ action }) => action.id === resolution.actionId)?.action.family === "DIRECT"
      && (report.committedActions.find(({ action }) => action.id === resolution.actionId)?.action as { operationId?: string }).operationId === "action_take"
    ));
    const successfulTake = takeResolutions.find(({ status }) => status === "SUCCESS");
    expect(successfulTake).toBeDefined();
    expect(takeResolutions.filter(({ status }) => status === "INVALIDATED").length).toBeGreaterThanOrEqual(1);
    const successfulActorId = report.committedActions.find(({ action }) => action.id === successfulTake!.actionId)!.action.actorId;
    expect(next.snapshot.objects[0]?.holderId).toBe(successfulActorId);
    const invalidatedEvents = report.observableEvents.filter(({ observableCueIds }) => observableCueIds.includes("commitment_invalidated"));
    expect(invalidatedEvents.length).toBeGreaterThanOrEqual(1);
    expect(invalidatedEvents[0]?.resultPropositions[0]?.predicate).toBe("ATTEMPT_FAILED");
  });

  it("records a failed committed action as an observable event rather than erasing it", () => {
    const state = initialState();
    const object = state.snapshot.objects[0]!;
    state.snapshot.characters.find(({ id }) => id === "actor_player")!.zoneId = object.zoneId;
    const intention: Proposition = { subjectId: object.id, predicate: "HELD_BY", objectId: "actor_player" };
    const attempt = makeDirectPackage(actionBuildContext(state.snapshot), content, "actor_player", "action_take", object.id, [intention], { objectId: object.id });
    const next = resolveBeat(state, attempt, content);
    const resolution = next.reports[0]!.actionResolutions.find(({ actionId }) => actionId === attempt.action.id)!;
    expect(resolution).toMatchObject({ status: "FAILED", reasonCode: "object_already_held" });
    const event = next.reports[0]!.observableEvents.find(({ sourceActionId }) => sourceActionId === attempt.action.id)!;
    expect(event.observableCueIds).toContain("prerequisite_failed");
    expect(event.resultPropositions[0]?.predicate).toBe("ATTEMPT_FAILED");
  });

  it("keeps OFFER separate from possession and ownership until a recipient explicitly accepts with TAKE", () => {
    const state = initialState();
    const snapshot = state.snapshot;
    const object = snapshot.objects[0]!;
    const player = snapshot.characters.find(({ id }) => id === "actor_player")!;
    const recipient = snapshot.characters.find(({ id }) => id === "actor_counterpart")!;
    player.zoneId = object.zoneId;
    recipient.zoneId = object.zoneId;
    object.holderId = player.id;
    snapshot.worldFacts = snapshot.worldFacts.filter(({ proposition }) => !(proposition.subjectId === object.id && proposition.predicate === "HELD_BY"));
    snapshot.worldFacts.push({ id: "fact_test_player_holder", proposition: { subjectId: object.id, predicate: "HELD_BY", objectId: player.id }, truth: true, sourceHistoryEventIds: [] });
    const ownerBefore = object.ownerId;
    const offer = makeDirectPackage(
      actionBuildContext(snapshot),
      content,
      player.id,
      "action_offer_object",
      recipient.id,
      [{ subjectId: object.id, predicate: "AVAILABLE_TO", objectId: recipient.id }],
      { objectId: object.id, recipientId: recipient.id },
    );
    const afterOffer = structuredClone(snapshot);
    expect(resolveActionPackage(snapshot, afterOffer, offer, 1).resolution.status).toBe("SUCCESS");
    expect(afterOffer.objects[0]).toMatchObject({ holderId: player.id, ownerId: ownerBefore });

    afterOffer.beat += 1;
    const accept = makeDirectPackage(
      actionBuildContext(afterOffer),
      content,
      recipient.id,
      "action_take",
      object.id,
      [{ subjectId: object.id, predicate: "HELD_BY", objectId: recipient.id }],
      { objectId: object.id },
    );
    const afterAcceptance = structuredClone(afterOffer);
    expect(resolveActionPackage(afterOffer, afterAcceptance, accept, 2).resolution.status).toBe("SUCCESS");
    expect(afterAcceptance.objects[0]).toMatchObject({ holderId: recipient.id, ownerId: ownerBefore });
  });

  it("resolves proposal on one Beat and a belief-scored Deal acceptance on the next", () => {
    let state = initialState();
    const counterpart = state.snapshot.characters.find(({ id }) => id === "actor_counterpart")!;
    const counterpartGoal = state.snapshot.goals.find(({ id }) => id === counterpart.primaryGoalId)!;
    const requested: Proposition = { subjectId: "primary_object", predicate: "AVAILABLE_TO", objectId: "actor_player" };
    const proposal = makeDealPackage(
      actionBuildContext(state.snapshot),
      content,
      "actor_player",
      counterpart.id,
      requested,
      counterpartGoal.target,
    );
    state = resolveBeat(state, proposal, content);
    expect(state.snapshot.deals.find(({ id }) => id === proposal.proposedDeal!.id)?.status).toBe("PROPOSED");

    state = resolveBeat(state, makeWaitPackage(actionBuildContext(state.snapshot), "actor_player"), content);
    const response = state.reports[1]!.committedActions.find(({ action }) => (
      action.family === "DEAL_RESPONSE" && action.dealId === proposal.proposedDeal!.id
    ))?.action;
    expect(response).toMatchObject({ family: "DEAL_RESPONSE", response: "ACCEPT" });
    expect(state.snapshot.deals.find(({ id }) => id === proposal.proposedDeal!.id)?.status).toBe("ACCEPTED");
    expect(state.snapshot.obligations.filter(({ dealId }) => dealId === proposal.proposedDeal!.id)).toHaveLength(2);
  });

  it("advances Scene Pressure once after action resolution and records it separately from Social Pressure", () => {
    const state = initialState();
    const before = state.snapshot.scenePressure.beatsRemaining;
    const next = resolveBeat(state, makeWaitPackage(actionBuildContext(state.snapshot), "actor_player"), content);
    expect(next.snapshot.scenePressure.beatsRemaining).toBe(before - 1);
    expect(next.reports[0]!.scenePressureEventIds).toHaveLength(1);
    expect(next.reports[0]!.observableEvents.find(({ id }) => id === next.reports[0]!.scenePressureEventIds[0])?.observableCueIds).toContain("scene_pressure_tick");
  });

  it("terminates when the primary object can no longer participate in the room conflict", () => {
    const state = initialState();
    state.snapshot.objects[0]!.zoneId = "zone_outside_scene";
    const next = resolveBeat(state, makeWaitPackage(actionBuildContext(state.snapshot), "actor_player"), content);
    expect(next.snapshot.phase).toBe("TERMINAL");
    expect(next.snapshot.terminalReason).toBe("central_conflict_impossible");
    expect(next.reports[0]!.terminalReason).toBe("central_conflict_impossible");
  });
});

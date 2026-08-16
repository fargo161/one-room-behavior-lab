import { describe, expect, it } from "vitest";
import {
  actionBuildContext,
  evaluateAcceptedDeals,
  makeAskPackage,
  makeDirectPackage,
  makeWaitPackage,
  type LivingComicEngineState,
} from "./actions";
import { buildObserverInterpretationView, interpretPerception } from "./cognition";
import { loadDefaultContent } from "./content";
import { narrativeRoleRefs } from "./core/roles";
import { assertWorldFact } from "./core/worldFacts";
import { createReplaySpec, replayFromSpec, resolveBeat, startScene } from "./engine";
import { generateScene, validateGeneratedScene } from "./generation";
import { buildPlayerSafeView } from "./presentation";
import { realizeMessage } from "./realization";
import type { ActionResolution, HistoricalEvent, ObservableEvent, Perception, Proposition } from "./schemas";
import { directDraftChoices, socialSemanticOptions } from "./web/playerDraft";

const content = loadDefaultContent();

const readyState = (seed = 14): LivingComicEngineState => {
  const generated = generateScene(seed, content);
  return startScene(generated, generated.playerOptions[0]!.id);
};

describe("Living Comic v0.1 reconciliation invariants", () => {
  it("resolves the first Beat across generated content, including context-only protection Goals", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const generated = generateScene(seed, content);
      const state = startScene(generated, generated.playerOptions[0]!.id);
      expect(() => resolveBeat(state, makeWaitPackage(actionBuildContext(state.snapshot), "actor_player"), content)).not.toThrow();
    }
  });

  it("uses seeded tie-break order without changing narrative role bindings", () => {
    const scenes = Array.from({ length: 20 }, (_, index) => generateScene(index + 1, content));
    const orders = new Set(scenes.map(({ snapshot }) => snapshot.stableActorOrder.join("|")));
    expect(orders.size).toBeGreaterThan(1);
    for (const { snapshot } of scenes) {
      expect(new Set(snapshot.stableActorOrder)).toEqual(new Set(["actor_player", "actor_counterpart", "actor_third_party"]));
      const refsBefore = narrativeRoleRefs(snapshot);
      const reversed = structuredClone(snapshot);
      reversed.stableActorOrder.reverse();
      expect(narrativeRoleRefs(reversed)).toEqual(refsBefore);
      expect(refsBefore).toMatchObject({
        SELF: "actor_player",
        COUNTERPART: "actor_counterpart",
        THIRD_PARTY: "actor_third_party",
      });
    }
  });

  it("rejects grounded asymmetry that is not relevant to a Goal or obstacle", () => {
    const generated = structuredClone(generateScene(314159, content));
    const sourceIds = generated.snapshot.history.slice(0, 2).map(({ id }) => id);
    const unrelatedTruth: Proposition = { subjectId: "scene_room", predicate: "AMBIENT_SIGNAL_ACTIVE", value: true };
    generated.snapshot.worldFacts.push({
      id: "fact_unrelated_ambient_signal",
      proposition: unrelatedTruth,
      truth: true,
      sourceHistoryEventIds: [sourceIds[0]!],
    });
    generated.snapshot.beliefs = [
      {
        id: "belief_unrelated_truth",
        actorId: "actor_counterpart",
        proposition: unrelatedTruth,
        certainty: "CERTAIN",
        sourceEventIds: [sourceIds[0]!],
      },
      {
        id: "belief_unrelated_false",
        actorId: "actor_third_party",
        proposition: { ...unrelatedTruth, value: false },
        certainty: "UNCERTAIN",
        sourceEventIds: [sourceIds[1]!],
      },
    ];
    const validation = validateGeneratedScene(generated, content);
    expect(validation.valid).toBe(false);
    expect(validation.trace.find(({ checkId }) => checkId === "check_information_asymmetry")?.passed).toBe(false);
  });

  it("does not expose authoritative holder truth in Play until the player knows it", () => {
    const state = readyState();
    const object = state.snapshot.objects[0]!;
    object.visible = true;
    state.snapshot.beliefs = state.snapshot.beliefs.filter(({ actorId, proposition }) => !(
      actorId === "actor_player" && proposition.subjectId === object.id && proposition.predicate === "HELD_BY"
    ));
    let play = buildPlayerSafeView(state, content);
    expect(play.objects.find(({ id }) => id === object.id)?.holderLabel).toBeNull();

    state.snapshot.beliefs.push({
      id: "belief_player_knows_holder",
      actorId: "actor_player",
      proposition: { subjectId: object.id, predicate: "HELD_BY", objectId: object.holderId! },
      certainty: "CERTAIN",
      sourceEventIds: [state.snapshot.history[0]!.id],
    });
    play = buildPlayerSafeView(state, content);
    expect(play.objects.find(({ id }) => id === object.id)?.holderLabel).not.toBeNull();
  });

  it("uses legitimate known history as interpretation evidence without reading sender private Reason", () => {
    const state = readyState();
    const observerId = "actor_counterpart";
    const view = buildObserverInterpretationView(state.snapshot, observerId);
    const heldGoalDefinitionIds = content.goals
      .filter(({ targetTemplate }) => targetTemplate.predicate === "HELD_BY")
      .map(({ id }) => id);
    const reasonDefinition = content.reasons.find(({ compatibleGoalIds }) =>
      compatibleGoalIds.some((goalId) => heldGoalDefinitionIds.includes(goalId)),
    )!;
    const historyActionId = reasonDefinition.groundingHistoryActionIds[0]!;
    const knownEvent: HistoricalEvent = {
      id: "history_event_known_sender",
      actionId: historyActionId,
      actorId: "actor_player",
      targetId: "primary_object",
      locationId: "scene_room",
      result: { subjectId: "actor_player", predicate: "PREVIOUSLY_ACTED", objectId: "primary_object" },
      secondaryParticipantIds: [observerId],
    };
    view.relationships = [];
    view.knownHistory = [knownEvent];
    view.reason = null;
    view.goal = null;
    view.beliefs = [];
    const event: ObservableEvent = {
      id: "event_ambiguous_known_history",
      beat: 1,
      sourceActionId: "action_ambiguous_known_history",
      historyActionId: "history_action_said",
      actorId: "actor_player",
      resultPropositions: [{ subjectId: "actor_player", predicate: "COMMUNICATED_WITH", objectId: observerId }],
      channels: ["VISUAL"],
      contentPropositionIds: [],
      targetEntityIds: [observerId],
      observableCueIds: ["ambiguous_social_occurrence"],
      messageId: null,
      salient: false,
    };
    const perception: Perception = {
      id: "perception_ambiguous_known_history",
      observerId,
      eventId: event.id,
      channelsReceived: ["VISUAL"],
      registeredPropositions: [{ subjectId: "actor_player", predicate: "COMMUNICATED_WITH", objectId: observerId }],
      noticedActorId: "actor_player",
      noticedTargetIds: [observerId],
    };
    const withoutKnownHistory = interpretPerception({ ...view, knownHistory: [] }, perception, event, content);
    const withoutHistoryAccessCandidate = withoutKnownHistory.candidateScores.find(({ inferredGoal }) => inferredGoal?.predicate === "HELD_BY")!;
    expect(withoutHistoryAccessCandidate.inferredReasonId).toBeNull();

    const interpretation = interpretPerception(view, perception, event, content);
    const accessCandidate = interpretation.candidateScores.find(({ inferredGoal }) => inferredGoal?.predicate === "HELD_BY")!;
    expect(accessCandidate.evidenceRefs).toContain(knownEvent.id);
    const inferredReason = content.reasons.find(({ id }) => id === accessCandidate.inferredReasonId);
    expect(inferredReason).toBeDefined();
    expect(inferredReason!.compatibleGoalIds.some((goalId) => heldGoalDefinitionIds.includes(goalId))).toBe(true);
    expect(inferredReason!.groundingHistoryActionIds).toContain(historyActionId);
    const sender = state.snapshot.characters.find(({ id }) => id === "actor_player")!;
    expect(accessCandidate.evidenceRefs).not.toContain(sender.reasonId ?? "no_private_reason");
  });

  it("keeps BASED realization semantically bounded to the Message claims", () => {
    const state = readyState();
    const requested: Proposition = { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" };
    const forbidden = /you know how this ends|only trying to help|i know this is difficult/i;
    for (const basedVibeId of content.basedVibes.map(({ id }) => id)) {
      const actionPackage = makeAskPackage(
        actionBuildContext(state.snapshot),
        content,
        "actor_player",
        "actor_counterpart",
        requested,
        { basedVibeId },
      );
      expect(realizeMessage(actionPackage.message!, content, state.snapshot.seed, 0).wording).not.toMatch(forbidden);
    }
  });

  it("records the actual violating action as the cause of a broken Deal", () => {
    const state = readyState();
    const snapshot = state.snapshot;
    snapshot.deals.push({
      id: "deal_test_break",
      proposerId: "actor_counterpart",
      recipientId: "actor_player",
      requestedTermIds: ["deal_term_test_break"],
      offeredTermIds: [],
      status: "ACCEPTED",
      supersedesDealId: null,
    });
    snapshot.dealTerms.push({
      id: "deal_term_test_break",
      responsibleActorId: "actor_player",
      desiredChange: { subjectId: "primary_object", predicate: "VISIBLE", value: false },
    });
    snapshot.obligations.push({
      id: "obligation_test_break",
      dealId: "deal_test_break",
      termId: "deal_term_test_break",
      actorId: "actor_player",
      status: "OPEN",
    });
    assertWorldFact(snapshot, { subjectId: "primary_object", predicate: "VISIBLE", value: true });

    const unrelatedAction = makeWaitPackage(actionBuildContext(snapshot), "actor_counterpart").action;
    const violatingAction = makeWaitPackage(actionBuildContext(snapshot), "actor_player").action;
    const resolutions: ActionResolution[] = [
      {
        actionId: unrelatedAction.id,
        status: "SUCCESS",
        reasonCode: "resolved_successfully",
        resultPropositions: [{ subjectId: "unrelated", predicate: "UNCHANGED", value: true }],
        observableEventIds: ["event_unrelated"],
      },
      {
        actionId: violatingAction.id,
        status: "SUCCESS",
        reasonCode: "resolved_successfully",
        resultPropositions: [{ subjectId: "primary_object", predicate: "VISIBLE", value: true }],
        observableEventIds: ["event_violation"],
      },
    ];
    const changes = evaluateAcceptedDeals(snapshot, resolutions, [unrelatedAction, violatingAction]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ nextStatus: "BROKEN", causeActionId: violatingAction.id });
  });

  it("promotes multi-result grounded behavior into controlled runtime history", () => {
    let state = readyState();
    const object = state.snapshot.objects[0]!;
    assertWorldFact(state.snapshot, { subjectId: object.id, predicate: "HELD_BY", objectId: "actor_player" });
    const show = makeDirectPackage(
      actionBuildContext(state.snapshot),
      content,
      "actor_player",
      "action_show",
      "actor_counterpart",
      [{ subjectId: object.id, predicate: "VISIBLE_TO", objectId: "actor_counterpart" }],
      { objectId: object.id, recipientId: "actor_counterpart" },
    );
    state = resolveBeat(state, show, content);
    const playerEvent = state.reports[0]!.observableEvents.find(({ sourceActionId }) => sourceActionId === show.action.id)!;
    expect(playerEvent.historyActionId).toBe("history_action_showed");
    const promoted = state.snapshot.history.filter(({ id }) => state.reports[0]!.historyPromotionIds.includes(id));
    expect(promoted.filter(({ actionId }) => actionId === "history_action_showed").length).toBeGreaterThanOrEqual(2);
  });

  it("replays committed player packages into byte-equivalent deterministic state", () => {
    let state = readyState(14);
    state = resolveBeat(state, makeWaitPackage(actionBuildContext(state.snapshot), "actor_player"), content);
    const spec = createReplaySpec(state);
    const replayed = replayFromSpec(spec, content);
    expect(replayed).toEqual(state);
  });

  it("filters Direct drafts by current prerequisites while preserving semantic social choices", () => {
    const state = readyState();
    const object = state.snapshot.objects[0]!;
    object.visible = true;
    object.holderId = "actor_counterpart";
    let direct = directDraftChoices(state.snapshot, content);
    expect(direct.some(({ operationId }) => ["action_offer_object", "action_show", "action_hide"].includes(operationId))).toBe(false);

    object.holderId = "actor_player";
    direct = directDraftChoices(state.snapshot, content);
    expect(direct.some(({ operationId }) => operationId === "action_offer_object")).toBe(true);
    expect(direct.some(({ operationId }) => operationId === "action_show")).toBe(true);
    expect(direct.some(({ operationId }) => operationId === "action_hide")).toBe(true);

    const exitZone = state.snapshot.room.zoneIds.find((id) => id.includes("exit"))!;
    state.snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!.zoneId = "zone_entry";
    expect(directDraftChoices(state.snapshot, content).some(({ operationId }) => operationId === "action_leave")).toBe(false);
    state.snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!.zoneId = exitZone;
    expect(directDraftChoices(state.snapshot, content).some(({ operationId }) => operationId === "action_leave")).toBe(true);

    const social = socialSemanticOptions(state.snapshot, "actor_counterpart");
    expect(new Set(social.requested.map(({ proposition }) => JSON.stringify(proposition))).size).toBeGreaterThan(1);
    expect(new Set(social.offers.map(({ proposition }) => JSON.stringify(proposition))).size).toBeGreaterThan(1);
  });
});

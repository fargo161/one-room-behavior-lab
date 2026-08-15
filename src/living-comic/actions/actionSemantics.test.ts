import { describe, expect, it } from "vitest";
import { loadDefaultContent } from "../content";
import { assertWorldFact } from "../core/worldFacts";
import { generateScene } from "../generation";
import { startScene } from "../engine";
import {
  actionDraftSchema,
  type Belief,
  type Proposition,
} from "../schemas";
import { applyDealResponse, evaluateAcceptedDeals, registerDealProposal } from "./deals";
import {
  actionBuildContext,
  makeAskPackage,
  makeDealPackage,
  makeDealResponsePackage,
  makeDirectPackage,
  makePressurePackage,
  makeWaitPackage,
} from "./factories";
import { routeIntention } from "./functionRouting";
import {
  buildActorDecisionView,
  decisionViewContainsHiddenWorldTruth,
  selectNpcAction,
} from "./npcSelection";

const content = loadDefaultContent();

const testState = () => {
  const generated = generateScene(14, content);
  return startScene(generated, generated.playerOptions[0]!.id);
};

describe("Phase 4 Function routing and shared action grammar", () => {
  it("routes intention through Function before exposing behavior definitions", () => {
    const access: Proposition = { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" };
    const sensory: Proposition = { subjectId: "primary_object", predicate: "VISIBLE", value: false };
    const escape: Proposition = { subjectId: "actor_player", predicate: "LOCATED_AT", objectId: "zone_exit" };
    expect(routeIntention([access], content)).toMatchObject({ compatibleFunctionIds: ["ACCESS"], ruleId: "route_intention_by_predicate_semantics" });
    expect(routeIntention([access], content).candidateOperationIds).toContain("action_take");
    expect(routeIntention([sensory], content).compatibleFunctionIds).toEqual(["SENSORY"]);
    expect(routeIntention([sensory], content).candidateOperationIds).toContain("action_hide");
    expect(routeIntention([escape], content).compatibleFunctionIds).toEqual(["ESCAPE"]);
    expect(routeIntention([escape], content).candidateOperationIds).toContain("action_leave");
    expect(routeIntention([escape], content).candidateOperationIds).not.toContain("action_take");
  });

  it("builds Direct, Ask, Pressure, Deal, Deal Response, and Wait from shared contracts", () => {
    const state = testState();
    const context = actionBuildContext(state.snapshot);
    const desired: Proposition = { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" };
    const threatened: Proposition = { subjectId: "actor_counterpart", predicate: "EXPOSED", value: true };
    const offered: Proposition = { subjectId: "actor_counterpart", predicate: "PROTECTED", value: true };
    const direct = makeDirectPackage(context, content, "actor_player", "action_take", "primary_object", [desired], { objectId: "primary_object" });
    const ask = makeAskPackage(context, content, "actor_player", "actor_counterpart", desired);
    const pressure = makePressurePackage(context, content, "actor_player", "actor_counterpart", desired, threatened);
    const deal = makeDealPackage(context, content, "actor_player", "actor_counterpart", desired, offered);
    const accept = makeDealResponsePackage(context, "actor_counterpart", deal.proposedDeal!.id, "ACCEPT");
    const wait = makeWaitPackage(context, "actor_player");
    [direct, ask, pressure, deal, accept, wait].forEach(({ action }) => expect(actionDraftSchema.safeParse(action).success).toBe(true));
    expect([direct.action.family, ask.action.family, pressure.action.family, deal.action.family, accept.action.family, wait.action.family]).toEqual([
      "DIRECT", "SOCIAL", "SOCIAL", "SOCIAL", "DEAL_RESPONSE", "WAIT",
    ]);
    expect(ask.action).toMatchObject({ family: "SOCIAL", tactic: "ASK" });
    expect(pressure.action).toMatchObject({ family: "SOCIAL", tactic: "PRESSURE" });
    expect(deal.action).toMatchObject({ family: "SOCIAL", tactic: "DEAL" });
  });

  it("selects NPC actions from a truth-free view with deterministic score evidence", () => {
    const state = testState();
    const view = buildActorDecisionView(state.snapshot, "actor_counterpart");
    expect(decisionViewContainsHiddenWorldTruth(view)).toBe(false);
    const first = selectNpcAction(view, content);
    const second = selectNpcAction(structuredClone(view), content);
    expect(first).toEqual(second);
    expect(first.trace.tieBreakRule).toBe("TOTAL_DESC_THEN_SEMANTIC_ACTION_ID_ASC");
    expect(first.trace.candidateScores.every(({ components }) => components.some(({ componentId }) => componentId === "primary_goal_progress"))).toBe(true);
    expect(first.trace.observedBeliefIds).toEqual(view.beliefs.map(({ id }) => id).sort());
  });

  it("changes an NPC's later action when corrected belief makes TAKE possible", () => {
    const state = testState();
    const snapshot = state.snapshot;
    const actor = snapshot.characters.find(({ id }) => id === "actor_third_party")!;
    actor.zoneId = "zone_table";
    const goal = snapshot.goals.find(({ id }) => id === actor.primaryGoalId)!;
    goal.definitionId = "goal_possess_primary_object";
    goal.target = { subjectId: "primary_object", predicate: "HELD_BY", objectId: actor.id };
    const falseBeliefs: Belief[] = [
      { id: "belief_test_false_holder", actorId: actor.id, proposition: { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" }, certainty: "CERTAIN", sourceEventIds: ["history_event_test"] },
      { id: "belief_test_player_zone", actorId: actor.id, proposition: { subjectId: "actor_player", predicate: "LOCATED_AT", objectId: "zone_entry" }, certainty: "CERTAIN", sourceEventIds: ["history_event_test"] },
    ];
    snapshot.beliefs = [...snapshot.beliefs.filter(({ actorId }) => actorId !== actor.id), ...falseBeliefs];
    const before = selectNpcAction(buildActorDecisionView(snapshot, actor.id), content);
    expect(before.package.action).toMatchObject({ family: "SOCIAL", tactic: "PRESSURE" });

    snapshot.beliefs = snapshot.beliefs.filter(({ actorId }) => actorId !== actor.id);
    snapshot.beliefs.push(
      { id: "belief_test_correct_holder", actorId: actor.id, proposition: { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" }, certainty: "CERTAIN", sourceEventIds: ["history_event_test"] },
      { id: "belief_test_counterpart_zone", actorId: actor.id, proposition: { subjectId: "actor_counterpart", predicate: "LOCATED_AT", objectId: "zone_table" }, certainty: "CERTAIN", sourceEventIds: ["history_event_test"] },
    );
    const after = selectNpcAction(buildActorDecisionView(snapshot, actor.id), content);
    expect(after.package.action).toMatchObject({ family: "DIRECT", operationId: "action_take" });
    expect(after.trace.candidateScores.find(({ actionId }) => actionId.includes("action_take"))?.allowedByBeliefs).toBe(true);
  });
});

describe("Phase 4 Deal lifecycle", () => {
  it("creates obligations on acceptance and fulfills them from world truth", () => {
    const state = testState();
    const snapshot = state.snapshot;
    const context = actionBuildContext(snapshot);
    const requested: Proposition = { subjectId: "primary_object", predicate: "AVAILABLE_TO", objectId: "actor_counterpart" };
    const offered: Proposition = { subjectId: "actor_player", predicate: "PROTECTED", value: true };
    const proposal = makeDealPackage(context, content, "actor_player", "actor_counterpart", requested, offered);
    expect(registerDealProposal(snapshot, proposal)[0]).toMatchObject({ priorStatus: "NONE", nextStatus: "PROPOSED" });
    const acceptance = makeDealResponsePackage(context, "actor_counterpart", proposal.proposedDeal!.id, "ACCEPT");
    const accepted = applyDealResponse(snapshot, acceptance);
    expect(accepted[0]).toMatchObject({ priorStatus: "PROPOSED", nextStatus: "ACCEPTED" });
    expect(snapshot.obligations).toHaveLength(2);
    expect(snapshot.obligations.every(({ status }) => status === "OPEN")).toBe(true);

    assertWorldFact(snapshot, requested);
    assertWorldFact(snapshot, offered);
    const fulfilled = evaluateAcceptedDeals(snapshot, [], []);
    expect(fulfilled[0]).toMatchObject({ priorStatus: "ACCEPTED", nextStatus: "FULFILLED" });
    expect(snapshot.obligations.every(({ status }) => status === "FULFILLED")).toBe(true);
  });

  it("supports rejection and linked counter-proposals without mutating the old proposal into the new one", () => {
    const state = testState();
    const snapshot = state.snapshot;
    const context = actionBuildContext(snapshot);
    const requested: Proposition = { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" };
    const offered: Proposition = { subjectId: "primary_object", predicate: "VISIBLE", value: true };
    const rejectedProposal = makeDealPackage(context, content, "actor_player", "actor_counterpart", requested, offered);
    registerDealProposal(snapshot, rejectedProposal);
    const rejection = makeDealResponsePackage(context, "actor_counterpart", rejectedProposal.proposedDeal!.id, "REJECT");
    expect(applyDealResponse(snapshot, rejection)[0]?.nextStatus).toBe("REJECTED");

    const counterState = testState();
    counterState.snapshot.beat = 1;
    const counterContext = actionBuildContext(counterState.snapshot);
    const original = makeDealPackage(counterContext, content, "actor_player", "actor_third_party", requested, offered);
    registerDealProposal(counterState.snapshot, original);
    const counterProposal = makeDealPackage(counterContext, content, "actor_third_party", "actor_player", offered, requested, {}, original.proposedDeal!.id);
    const counter = makeDealResponsePackage(
      counterContext,
      "actor_third_party",
      original.proposedDeal!.id,
      "COUNTER",
      { deal: counterProposal.proposedDeal!, terms: counterProposal.dealTerms! },
    );
    const changes = applyDealResponse(counterState.snapshot, counter);
    expect(changes.map(({ nextStatus }) => nextStatus)).toEqual(["SUPERSEDED", "PROPOSED"]);
    expect(counterState.snapshot.deals.find(({ id }) => id === original.proposedDeal!.id)?.status).toBe("SUPERSEDED");
    expect(counterState.snapshot.deals.find(({ supersedesDealId }) => supersedesDealId === original.proposedDeal!.id)?.status).toBe("PROPOSED");
  });

  it("marks an accepted Deal and its obligation BROKEN when the responsible actor causes a contradictory result", () => {
    const state = testState();
    const snapshot = state.snapshot;
    const context = actionBuildContext(snapshot);
    const requested: Proposition = { subjectId: "actor_counterpart", predicate: "PROTECTED", value: true };
    const offered: Proposition = { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" };
    const proposal = makeDealPackage(context, content, "actor_player", "actor_counterpart", requested, offered);
    registerDealProposal(snapshot, proposal);
    applyDealResponse(snapshot, makeDealResponsePackage(context, "actor_counterpart", proposal.proposedDeal!.id, "ACCEPT"));
    const violatingAction = makeDirectPackage(context, content, "actor_player", "action_offer_object", "actor_counterpart", [
      { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" },
    ], { objectId: "primary_object", recipientId: "actor_counterpart" }).action;
    const changes = evaluateAcceptedDeals(snapshot, [{
      actionId: violatingAction.id,
      status: "SUCCESS",
      reasonCode: "resolved_successfully",
      resultPropositions: [{ subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" }],
      observableEventIds: ["event_test_break"],
    }], [violatingAction]);
    expect(changes[0]).toMatchObject({ priorStatus: "ACCEPTED", nextStatus: "BROKEN" });
    expect(snapshot.deals.find(({ id }) => id === proposal.proposedDeal!.id)?.status).toBe("BROKEN");
    expect(snapshot.obligations.find(({ actorId }) => actorId === "actor_player")?.status).toBe("BROKEN");
  });
});

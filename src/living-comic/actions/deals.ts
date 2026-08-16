import { stableRuntimeId } from "../core/ids";
import { propositionKey, propositionsEqual } from "../core/propositions";
import { worldHas } from "../core/worldFacts";
import type {
  ActionDraft,
  ActionResolution,
  DealLifecycleChange,
  DealResponseAction,
  RuntimeSnapshot,
} from "../schemas";
import type { ActionPackage } from "./types";

export function registerDealProposal(snapshot: RuntimeSnapshot, actionPackage: ActionPackage): DealLifecycleChange[] {
  const deal = actionPackage.proposedDeal;
  if (!deal || !actionPackage.dealTerms) return [];
  if (!snapshot.deals.some(({ id }) => id === deal.id)) snapshot.deals.push(structuredClone(deal));
  for (const term of actionPackage.dealTerms) {
    if (!snapshot.dealTerms.some(({ id }) => id === term.id)) snapshot.dealTerms.push(structuredClone(term));
  }
  return [{
    dealId: deal.id,
    priorStatus: "NONE",
    nextStatus: "PROPOSED",
    obligationIds: [],
    causeActionId: actionPackage.action.id,
  }];
}

export function applyDealResponse(snapshot: RuntimeSnapshot, actionPackage: ActionPackage): DealLifecycleChange[] {
  if (actionPackage.action.family !== "DEAL_RESPONSE") return [];
  const action: DealResponseAction = actionPackage.action;
  const deal = snapshot.deals.find(({ id }) => id === action.dealId);
  if (!deal || deal.status !== "PROPOSED" || deal.recipientId !== action.actorId) return [];

  if (action.response === "REJECT") {
    deal.status = "REJECTED";
    return [{ dealId: deal.id, priorStatus: "PROPOSED", nextStatus: "REJECTED", obligationIds: [], causeActionId: action.id }];
  }
  if (action.response === "COUNTER") {
    const counter = actionPackage.proposedDeal;
    if (!counter || !actionPackage.dealTerms || counter.supersedesDealId !== deal.id) return [];
    deal.status = "SUPERSEDED";
    snapshot.deals.push(structuredClone(counter));
    snapshot.dealTerms.push(...structuredClone(actionPackage.dealTerms));
    return [
      { dealId: deal.id, priorStatus: "PROPOSED", nextStatus: "SUPERSEDED", obligationIds: [], causeActionId: action.id },
      { dealId: counter.id, priorStatus: "NONE", nextStatus: "PROPOSED", obligationIds: [], causeActionId: action.id },
    ];
  }

  deal.status = "ACCEPTED";
  const termIds = [...deal.requestedTermIds, ...deal.offeredTermIds];
  const obligationIds: string[] = [];
  for (const termId of termIds) {
    const term = snapshot.dealTerms.find(({ id }) => id === termId);
    if (!term) continue;
    const obligationId = stableRuntimeId("obligation", deal.id, term.id);
    obligationIds.push(obligationId);
    if (!snapshot.obligations.some(({ id }) => id === obligationId)) {
      snapshot.obligations.push({ id: obligationId, dealId: deal.id, termId: term.id, actorId: term.responsibleActorId, status: "OPEN" });
    }
  }
  return [{ dealId: deal.id, priorStatus: "PROPOSED", nextStatus: "ACCEPTED", obligationIds, causeActionId: action.id }];
}

export function evaluateAcceptedDeals(
  snapshot: RuntimeSnapshot,
  resolutions: ActionResolution[],
  actions: ActionDraft[],
): DealLifecycleChange[] {
  const changes: DealLifecycleChange[] = [];
  for (const deal of snapshot.deals.filter(({ status }) => status === "ACCEPTED")) {
    const obligations = snapshot.obligations.filter(({ dealId }) => dealId === deal.id);
    let brokenByActionId: string | null = null;
    const fulfilledByActionIds = new Set<string>();
    for (const obligation of obligations.filter(({ status }) => status === "OPEN")) {
      const term = snapshot.dealTerms.find(({ id }) => id === obligation.termId);
      if (!term) continue;
      if (worldHas(snapshot, term.desiredChange)) {
        obligation.status = "FULFILLED";
        const fulfillmentResolution = resolutions.find((resolution) => (
          resolution.status === "SUCCESS"
          && resolution.resultPropositions.some((result) => propositionsEqual(result, term.desiredChange))
        ));
        if (fulfillmentResolution) fulfilledByActionIds.add(fulfillmentResolution.actionId);
        continue;
      }
      const violatingResolution = resolutions.find((resolution) => (
        resolution.status === "SUCCESS"
        && actions.find(({ id }) => id === resolution.actionId)?.actorId === obligation.actorId
        && resolution.resultPropositions.some((result) => (
          propositionKey(result) === propositionKey(term.desiredChange)
          && !propositionsEqual(result, term.desiredChange)
        ))
      ));
      if (violatingResolution) {
        obligation.status = "BROKEN";
        brokenByActionId ??= violatingResolution.actionId;
      }
    }
    if (obligations.some(({ status }) => status === "BROKEN")) {
      deal.status = "BROKEN";
      changes.push({
        dealId: deal.id,
        priorStatus: "ACCEPTED",
        nextStatus: "BROKEN",
        obligationIds: obligations.filter(({ status }) => status === "BROKEN").map(({ id }) => id),
        causeActionId: brokenByActionId,
      });
    } else if (obligations.length > 0 && obligations.every(({ status }) => status === "FULFILLED")) {
      deal.status = "FULFILLED";
      changes.push({
        dealId: deal.id,
        priorStatus: "ACCEPTED",
        nextStatus: "FULFILLED",
        obligationIds: obligations.map(({ id }) => id),
        causeActionId: [...fulfilledByActionIds].sort()[0] ?? null,
      });
    }
  }
  return changes;
}

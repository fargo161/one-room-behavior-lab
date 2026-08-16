import { propositionIdentity, propositionKey, propositionsEqual } from "../core/propositions";
import type {
  ContentManifest,
  Deal,
  DealTerm,
  NpcCandidateScore,
  Proposition,
  RuntimeSnapshot,
  ScoreComponent,
} from "../schemas";
import {
  makeAskPackage,
  makeDealPackage,
  makeDealResponsePackage,
  makeDirectPackage,
  makePressurePackage,
  makeWaitPackage,
} from "./factories";
import { routeIntention } from "./functionRouting";
import type { ActionPackage, ActorDecisionView, SelectedNpcAction } from "./types";

interface ScoredPackage {
  package: ActionPackage;
  allowedByBeliefs: boolean;
  directObstacleFit: boolean;
  dealResponseBias?: number;
}

export interface NpcScoringProfile {
  primaryGoalProgress: number;
  activeObstacleRelevance: number;
  secondaryGoalPreservation: number;
  secondaryGoalViolation: number;
  acceptedDealFulfillment: number;
  acceptedDealViolation: number;
  urgentScenePressureResponse: number;
  causalFunctionFit: number;
}

export const defaultNpcScoringProfile: Readonly<NpcScoringProfile> = Object.freeze({
  primaryGoalProgress: 100,
  activeObstacleRelevance: 40,
  secondaryGoalPreservation: 25,
  secondaryGoalViolation: -25,
  acceptedDealFulfillment: 20,
  acceptedDealViolation: -40,
  urgentScenePressureResponse: 15,
  causalFunctionFit: 10,
});

export function buildActorDecisionView(snapshot: RuntimeSnapshot, actorId: string): ActorDecisionView {
  const actor = snapshot.characters.find(({ id }) => id === actorId);
  if (!actor || actor.role === "PLAYER_ROLE") throw new Error(`NPC decision view requires an active NPC: ${actorId}`);
  const primaryGoal = snapshot.goals.find(({ id }) => id === actor.primaryGoalId);
  if (!primaryGoal) throw new Error(`NPC ${actorId} has no primary Goal`);
  const reason = snapshot.reasons.find(({ id }) => id === actor.reasonId) ?? null;
  const obstacle = snapshot.obstacles.find(({ id }) => primaryGoal.obstacleIds.includes(id)) ?? null;
  return {
    actionBuildContext: {
      sceneId: snapshot.sceneId,
      beat: snapshot.beat,
      baselineVibeByActorId: { [actorId]: actor.baselineVibeId },
    },
    decisionSnapshotId: snapshot.stateId,
    beat: snapshot.beat,
    actor: structuredClone(actor),
    actorIds: snapshot.characters.map(({ id }) => id),
    primaryGoal: structuredClone(primaryGoal),
    secondaryGoals: structuredClone(snapshot.goals.filter(({ id }) => actor.secondaryGoalIds.includes(id))),
    reason: structuredClone(reason),
    obstacle: structuredClone(obstacle),
    beliefs: structuredClone(snapshot.beliefs.filter((belief) => belief.actorId === actorId)),
    obligations: structuredClone(snapshot.obligations.filter((obligation) => obligation.actorId === actorId && obligation.status === "OPEN")),
    relevantDeals: structuredClone(snapshot.deals.filter((deal) => (
      (deal.recipientId === actorId || deal.proposerId === actorId)
      && ["PROPOSED", "ACCEPTED"].includes(deal.status)
    ))),
    dealTerms: structuredClone(snapshot.dealTerms),
    scenePressure: structuredClone(snapshot.scenePressure),
    primaryObjectId: snapshot.objects[0]?.id ?? "primary_object",
    roomId: snapshot.room.id,
    exitZoneId: snapshot.room.zoneIds.find((id) => id.includes("exit")) ?? snapshot.room.zoneIds.at(-1)!,
  };
}

const believedObject = (view: ActorDecisionView, subjectId: string, predicate: string): string | undefined => (
  view.beliefs
    .filter((belief) => belief.proposition.subjectId === subjectId && belief.proposition.predicate === predicate)
    .sort((left, right) => (left.certainty === "CERTAIN" ? -1 : 1) - (right.certainty === "CERTAIN" ? -1 : 1))[0]
    ?.proposition.objectId
);

const conflict = (left: Proposition, right: Proposition): boolean => (
  propositionKey(left) === propositionKey(right) && !propositionsEqual(left, right)
);

const selectTargetActor = (view: ActorDecisionView): string => {
  const directObject = view.primaryGoal.target.objectId;
  if (directObject && view.actorIds.includes(directObject) && directObject !== view.actor.id) return directObject;
  if (view.actorIds.includes(view.primaryGoal.target.subjectId) && view.primaryGoal.target.subjectId !== view.actor.id) {
    return view.primaryGoal.target.subjectId;
  }
  const believedHolder = believedObject(view, view.primaryObjectId, "HELD_BY");
  if (believedHolder && believedHolder !== view.actor.id) return believedHolder;
  return view.actorIds.filter((id) => id !== view.actor.id).sort()[0]!;
};

const directAllowedByBeliefs = (view: ActorDecisionView, operationId: string): boolean => {
  const believedHolder = believedObject(view, view.primaryObjectId, "HELD_BY");
  if (operationId === "action_offer_object") return believedHolder === view.actor.id;
  if (["action_hide", "action_show"].includes(operationId) && believedHolder && believedHolder !== view.actor.id) return false;
  if (operationId !== "action_take") return true;
  if (believedHolder === view.actor.id) return false;
  if (!believedHolder) return true;
  const believedHolderZone = believedObject(view, believedHolder, "LOCATED_AT");
  return !believedHolderZone || believedHolderZone === view.actor.zoneId;
};

const directParameters = (view: ActorDecisionView, operationId: string, targetActorId: string) => {
  switch (operationId) {
    case "action_offer_object":
      return { targetId: targetActorId, objectId: view.primaryObjectId, recipientId: targetActorId };
    case "action_show":
      return { targetId: targetActorId, objectId: view.primaryObjectId, recipientId: targetActorId };
    case "action_approach":
      return { targetId: targetActorId, destinationZoneId: null };
    case "action_withdraw":
      return { targetId: view.exitZoneId, destinationZoneId: "zone_entry" };
    case "action_leave":
      return { targetId: view.exitZoneId, destinationZoneId: view.exitZoneId };
    case "action_open":
    case "action_close":
    case "action_hide":
    case "action_take":
    default:
      return { targetId: view.primaryObjectId, objectId: view.primaryObjectId };
  }
};

const responseCandidates = (view: ActorDecisionView, content: ContentManifest): ScoredPackage[] => {
  const deal = view.relevantDeals.find(({ recipientId, status }) => recipientId === view.actor.id && status === "PROPOSED");
  if (!deal) return [];
  const requested = view.dealTerms.filter(({ id }) => deal.requestedTermIds.includes(id));
  const offered = view.dealTerms.filter(({ id }) => deal.offeredTermIds.includes(id));
  const offeredAdvancesGoal = offered.some(({ desiredChange }) => propositionsEqual(desiredChange, view.primaryGoal.target));
  const requestConflictsGoal = requested.some(({ desiredChange }) => conflict(desiredChange, view.primaryGoal.target));
  const counterProposal = requested[0] && offered[0]
    ? makeDealPackage(
      view.actionBuildContext,
      content,
      view.actor.id,
      deal.proposerId,
      offered[0].desiredChange,
      requested[0].desiredChange,
      {},
      deal.id,
    )
    : null;
  return [
    { package: makeDealResponsePackage(view.actionBuildContext, view.actor.id, deal.id, "ACCEPT"), allowedByBeliefs: true, directObstacleFit: false, dealResponseBias: offeredAdvancesGoal ? 160 : requestConflictsGoal ? 20 : 100 },
    { package: makeDealResponsePackage(view.actionBuildContext, view.actor.id, deal.id, "REJECT"), allowedByBeliefs: true, directObstacleFit: false, dealResponseBias: requestConflictsGoal ? 160 : 60 },
    {
      package: makeDealResponsePackage(
        view.actionBuildContext,
        view.actor.id,
        deal.id,
        "COUNTER",
        counterProposal?.proposedDeal && counterProposal.dealTerms
          ? { deal: counterProposal.proposedDeal, terms: counterProposal.dealTerms }
          : null,
      ),
      allowedByBeliefs: counterProposal !== null,
      directObstacleFit: false,
      dealResponseBias: offeredAdvancesGoal || requestConflictsGoal ? 80 : 120,
    },
  ];
};

export function buildNpcCandidates(view: ActorDecisionView, content: ContentManifest): ScoredPackage[] {
  const responses = responseCandidates(view, content);
  if (responses.length > 0) return [...responses, { package: makeWaitPackage(view.actionBuildContext, view.actor.id), allowedByBeliefs: true, directObstacleFit: false }];

  const routing = routeIntention([view.primaryGoal.target], content);
  const targetActorId = selectTargetActor(view);
  const candidates: ScoredPackage[] = [];
  for (const operationId of routing.candidateOperationIds) {
    const definition = content.directActions.find(({ id }) => id === operationId)!;
    const parameters = directParameters(view, operationId, targetActorId);
    try {
      const actionPackage = makeDirectPackage(
        view.actionBuildContext,
        content,
        view.actor.id,
        operationId,
        parameters.targetId,
        [view.primaryGoal.target],
        parameters,
      );
      candidates.push({
        package: actionPackage,
        allowedByBeliefs: directAllowedByBeliefs(view, operationId),
        directObstacleFit: definition.resultPredicates.includes(view.primaryGoal.target.predicate),
      });
    } catch {
      // A routed Function may expose operations whose narrower definition does
      // not support this intention. Those are absent rather than post-tagged.
    }
  }

  const threat: Proposition = { subjectId: targetActorId, predicate: "EXPOSED", value: true };
  const reciprocal: Proposition = { subjectId: targetActorId, predicate: "PROTECTED", value: true };
  candidates.push(
    { package: makeAskPackage(view.actionBuildContext, content, view.actor.id, targetActorId, view.primaryGoal.target), allowedByBeliefs: true, directObstacleFit: false },
    { package: makePressurePackage(view.actionBuildContext, content, view.actor.id, targetActorId, view.primaryGoal.target, threat), allowedByBeliefs: true, directObstacleFit: true },
    { package: makeDealPackage(view.actionBuildContext, content, view.actor.id, targetActorId, view.primaryGoal.target, reciprocal), allowedByBeliefs: true, directObstacleFit: false },
    { package: makeWaitPackage(view.actionBuildContext, view.actor.id), allowedByBeliefs: true, directObstacleFit: false },
  );
  return candidates;
}

const scorePackage = (view: ActorDecisionView, candidate: ScoredPackage, profile: NpcScoringProfile): NpcCandidateScore => {
  const { action } = candidate.package;
  const components: ScoreComponent[] = [];
  const add = (componentId: string, score: number, explanation: string) => components.push({ componentId, score, explanation });

  const primaryProgress = action.intention.some((intention) => propositionsEqual(intention, view.primaryGoal.target));
  add("primary_goal_progress", primaryProgress ? profile.primaryGoalProgress : 0, primaryProgress ? "Immediate intention matches the primary Goal target." : "No direct primary Goal progress.");
  add("active_obstacle_relevance", candidate.directObstacleFit ? profile.activeObstacleRelevance : 0, candidate.directObstacleFit ? "Candidate directly addresses the current obstacle/target predicate." : "Candidate does not directly change the obstacle predicate.");
  const advancesSecondary = view.secondaryGoals.some((goal) => action.intention.some((item) => propositionsEqual(item, goal.target)));
  const violatesSecondary = view.secondaryGoals.some((goal) => action.intention.some((item) => conflict(item, goal.target)));
  add(
    "secondary_goal_tradeoff",
    advancesSecondary ? profile.secondaryGoalPreservation : violatesSecondary ? profile.secondaryGoalViolation : 0,
    advancesSecondary ? "Candidate advances a secondary Goal." : violatesSecondary ? "Candidate violates a secondary Goal." : "Candidate is neutral to secondary Goals.",
  );

  const obligationTerms = view.obligations.flatMap((obligation) => {
    const deal = view.relevantDeals.find(({ id }) => id === obligation.dealId);
    const term = view.dealTerms.find(({ id }) => id === obligation.termId);
    return deal && term ? [{ obligation, term }] : [];
  });
  const fulfillsObligation = obligationTerms.some(({ term }) => action.intention.some((item) => propositionsEqual(item, term.desiredChange)));
  const violatesObligation = obligationTerms.some(({ term }) => action.intention.some((item) => conflict(item, term.desiredChange)));
  add("accepted_deal_obligation", fulfillsObligation ? profile.acceptedDealFulfillment : violatesObligation ? profile.acceptedDealViolation : 0, fulfillsObligation ? "Candidate fulfills an accepted Deal term." : violatesObligation ? "Candidate violates an accepted Deal term." : "Candidate is neutral to open obligations.");

  const pressureUrgent = view.scenePressure.active && view.scenePressure.beatsRemaining <= 2;
  const pressureResponsive = pressureUrgent && (
    action.functionIds.includes("ESCAPE")
    || action.functionIds.includes("SENSORY")
    || (action.family === "SOCIAL" && action.tactic === "PRESSURE")
  );
  add("scene_pressure_urgency", pressureResponsive ? profile.urgentScenePressureResponse : 0, pressureResponsive ? "Candidate responds to imminent Scene Pressure." : "No urgency bonus applies.");
  add("function_fit", action.functionIds.length > 0 ? profile.causalFunctionFit : 0, action.functionIds.length > 0 ? "Candidate was causally routed through a compatible Function." : "WAIT has no Function fit.");
  if (candidate.dealResponseBias !== undefined) add("deal_response_fit", candidate.dealResponseBias, "Deal response is scored from offered benefit and requested conflict.");

  return {
    actionId: action.id,
    family: action.family,
    allowedByBeliefs: candidate.allowedByBeliefs,
    totalScore: components.reduce((sum, component) => sum + component.score, 0),
    components,
  };
};

export function selectNpcAction(
  view: ActorDecisionView,
  content: ContentManifest,
  profile: NpcScoringProfile = defaultNpcScoringProfile,
): SelectedNpcAction {
  const candidates = buildNpcCandidates(view, content);
  const scored = candidates.map((candidate) => ({ candidate, score: scorePackage(view, candidate, profile) }));
  const allowed = scored.filter(({ score }) => score.allowedByBeliefs);
  const ranked = (allowed.length > 0 ? allowed : scored).sort((left, right) => (
    right.score.totalScore - left.score.totalScore
    || left.score.actionId.localeCompare(right.score.actionId)
  ));
  const selected = ranked[0];
  if (!selected) throw new Error(`NPC ${view.actor.id} produced no action candidates`);
  return {
    package: selected.candidate.package,
    trace: {
      actorId: view.actor.id,
      decisionSnapshotId: view.decisionSnapshotId,
      observedBeliefIds: view.beliefs.map(({ id }) => id).sort(),
      candidateScores: scored.map(({ score }) => score).sort((left, right) => left.actionId.localeCompare(right.actionId)),
      selectedActionId: selected.score.actionId,
      tieBreakRule: "TOTAL_DESC_THEN_SEMANTIC_ACTION_ID_ASC",
    },
  };
}

export function dealTermsFor(deal: Deal, terms: DealTerm[]): DealTerm[] {
  const ids = new Set([...deal.requestedTermIds, ...deal.offeredTermIds]);
  return terms.filter(({ id }) => ids.has(id));
}

export const decisionViewContainsHiddenWorldTruth = (view: ActorDecisionView): boolean => (
  "worldFacts" in view || "playerDraft" in view || "sameBeatActions" in view
);

export const beliefFingerprint = (view: ActorDecisionView): string => view.beliefs
  .map((belief) => `${belief.id}:${propositionIdentity(belief.proposition)}:${belief.certainty}`)
  .sort()
  .join("|");

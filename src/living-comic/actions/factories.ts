import { stableRuntimeId } from "../core/ids";
import type {
  ContentManifest,
  Deal,
  DealResponseAction,
  DealTerm,
  DirectAction,
  Proposition,
  SemanticMessage,
  SocialAction,
  WaitAction,
} from "../schemas";
import { routeIntention } from "./functionRouting";
import type { ActionBuildContext, ActionPackage } from "./types";

const actionId = (context: ActionBuildContext, actorId: string, family: string, detail: string): string => (
  stableRuntimeId("action", context.sceneId, context.beat + 1, actorId, family, detail)
);

export const actionBuildContext = (snapshot: { sceneId: string; beat: number; characters: Array<{ id: string; baselineVibeId: string }> }): ActionBuildContext => ({
  sceneId: snapshot.sceneId,
  beat: snapshot.beat,
  baselineVibeByActorId: Object.fromEntries(snapshot.characters.map(({ id, baselineVibeId }) => [id, baselineVibeId])),
});

const claim = (messageId: string, ordinal: number, kind: SemanticMessage["claims"][number]["kind"], proposition: Proposition) => ({
  id: stableRuntimeId("message_claim", messageId, ordinal),
  kind,
  proposition,
});

export function makeWaitPackage(context: ActionBuildContext, actorId: string): ActionPackage {
  const action: WaitAction = {
    id: actionId(context, actorId, "wait", "wait"),
    actorId,
    family: "WAIT",
    intention: [],
    functionIds: [],
  };
  return { action };
}

export function makeDirectPackage(
  context: ActionBuildContext,
  content: ContentManifest,
  actorId: string,
  operationId: string,
  targetId: string,
  intention: Proposition[],
  parameters: Partial<Pick<DirectAction, "objectId" | "recipientId" | "destinationZoneId">> = {},
): ActionPackage {
  const definition = content.directActions.find(({ id }) => id === operationId);
  if (!definition) throw new Error(`Unknown Direct Action definition: ${operationId}`);
  const routing = routeIntention(intention, content);
  const functionIds = routing.compatibleFunctionIds.filter((id) => definition.compatibleFunctions.includes(id));
  if (functionIds.length === 0) {
    throw new Error(`${operationId} is not reachable from the supplied immediate intention`);
  }
  return {
    action: {
      id: actionId(context, actorId, "direct", operationId),
      actorId,
      family: "DIRECT",
      intention,
      functionIds,
      operationId,
      targetId,
      objectId: parameters.objectId ?? null,
      recipientId: parameters.recipientId ?? null,
      destinationZoneId: parameters.destinationZoneId ?? null,
    },
  };
}

interface SocialMessageOptions {
  claimedReasonId?: string | null;
  disclosure?: SemanticMessage["disclosure"];
  delivery?: SemanticMessage["delivery"];
  basedVibeId?: string;
  paralanguageCueIds?: string[];
}

const makeSocialPackage = (
  context: ActionBuildContext,
  content: ContentManifest,
  actorId: string,
  targetActorId: string,
  tactic: SocialAction["tactic"],
  desiredStateChange: Proposition,
  claims: SemanticMessage["claims"],
  speechAct: SemanticMessage["speechAct"],
  options: SocialMessageOptions,
  deal?: { deal: Deal; terms: DealTerm[] },
): ActionPackage => {
  const routing = routeIntention([desiredStateChange], content);
  if (routing.status === "UNSUPPORTED") {
    throw new Error(`Unsupported immediate intention predicate(s): ${routing.unsupportedPredicates.join(", ")}`);
  }
  const id = actionId(context, actorId, "social", tactic.toLowerCase());
  const basedVibeId = options.basedVibeId ?? context.baselineVibeByActorId[actorId] ?? "vibe_as";
  const disclosure = options.disclosure ?? "DIRECT";
  const delivery = options.delivery ?? "OPEN";
  const messageId = stableRuntimeId("message", id, basedVibeId, disclosure, delivery);
  const message: SemanticMessage = {
    id: messageId,
    senderId: actorId,
    recipientId: targetActorId,
    tactic,
    desiredStateChange,
    speechAct,
    claims: claims.map((item, index) => ({ ...item, id: stableRuntimeId("message_claim", messageId, index + 1) })),
    disclosure,
    claimedReasonId: options.claimedReasonId ?? null,
    basedVibeId,
    paralanguageCueIds: options.paralanguageCueIds ?? [],
    delivery,
    dealId: deal?.deal.id ?? null,
  };
  const action: SocialAction = {
    id,
    actorId,
    family: "SOCIAL",
    intention: [desiredStateChange],
    functionIds: routing.compatibleFunctionIds,
    tactic,
    targetActorId,
    messageId,
    dealId: deal?.deal.id ?? null,
  };
  return { action, message, proposedDeal: deal?.deal, dealTerms: deal?.terms };
};

export function makeAskPackage(
  context: ActionBuildContext,
  content: ContentManifest,
  actorId: string,
  targetActorId: string,
  requestedChange: Proposition,
  options: SocialMessageOptions = {},
): ActionPackage {
  const id = actionId(context, actorId, "social", "ask");
  const messageId = stableRuntimeId("message", id);
  return makeSocialPackage(
    context,
    content,
    actorId,
    targetActorId,
    "ASK",
    requestedChange,
    [claim(messageId, 1, "REQUESTED_CHANGE", requestedChange)],
    "REQUEST",
    options,
  );
}

export function makePressurePackage(
  context: ActionBuildContext,
  content: ContentManifest,
  actorId: string,
  targetActorId: string,
  requestedChange: Proposition,
  threatenedConsequence: Proposition,
  options: SocialMessageOptions = {},
): ActionPackage {
  const id = actionId(context, actorId, "social", "pressure");
  const messageId = stableRuntimeId("message", id);
  return makeSocialPackage(
    context,
    content,
    actorId,
    targetActorId,
    "PRESSURE",
    requestedChange,
    [
      claim(messageId, 1, "REQUESTED_CHANGE", requestedChange),
      claim(messageId, 2, "THREATENED_CONSEQUENCE", threatenedConsequence),
    ],
    "WARNING",
    options,
  );
}

export function makeDealPackage(
  context: ActionBuildContext,
  content: ContentManifest,
  proposerId: string,
  recipientId: string,
  requestedChange: Proposition,
  offeredChange: Proposition,
  options: SocialMessageOptions = {},
  supersedesDealId: string | null = null,
): ActionPackage {
  const actionSemanticId = actionId(context, proposerId, "social", "deal");
  const dealId = stableRuntimeId("deal", actionSemanticId);
  const requestedTerm: DealTerm = {
    id: stableRuntimeId("deal_term", dealId, "requested"),
    responsibleActorId: recipientId,
    desiredChange: requestedChange,
  };
  const offeredTerm: DealTerm = {
    id: stableRuntimeId("deal_term", dealId, "offered"),
    responsibleActorId: proposerId,
    desiredChange: offeredChange,
  };
  const deal: Deal = {
    id: dealId,
    proposerId,
    recipientId,
    requestedTermIds: [requestedTerm.id],
    offeredTermIds: [offeredTerm.id],
    status: "PROPOSED",
    supersedesDealId,
  };
  const messageId = stableRuntimeId("message", actionSemanticId);
  return makeSocialPackage(
    context,
    content,
    proposerId,
    recipientId,
    "DEAL",
    requestedChange,
    [
      claim(messageId, 1, "REQUESTED_CHANGE", requestedChange),
      claim(messageId, 2, "OFFERED_CHANGE", offeredChange),
    ],
    "PROMISE",
    options,
    { deal, terms: [requestedTerm, offeredTerm] },
  );
}

export function makeDealResponsePackage(
  context: ActionBuildContext,
  actorId: string,
  dealId: string,
  response: DealResponseAction["response"],
  counter: { deal: Deal; terms: DealTerm[] } | null = null,
): ActionPackage {
  const status = response === "ACCEPT" ? "ACCEPTED" : response === "REJECT" ? "REJECTED" : "SUPERSEDED";
  const intention: Proposition = { subjectId: dealId, predicate: "DEAL_STATUS", value: status };
  return {
    action: {
      id: actionId(context, actorId, "deal_response", response.toLowerCase()),
      actorId,
      family: "DEAL_RESPONSE",
      intention: [intention],
      functionIds: ["ACCESS"],
      response,
      dealId,
      counterDealId: counter?.deal.id ?? null,
    },
    proposedDeal: counter?.deal,
    dealTerms: counter?.terms,
  };
}

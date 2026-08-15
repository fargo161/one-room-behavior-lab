import { stableRuntimeId } from "../core/ids";
import { assertWorldFact, worldHas } from "../core/worldFacts";
import {
  applyDealResponse,
  registerDealProposal,
} from "../actions/deals";
import type { ActionPackage } from "../actions/types";
import type {
  ActionDraft,
  ActionResolution,
  DealLifecycleChange,
  DirectAction,
  ObservableEvent,
  Proposition,
  RuntimeSnapshot,
} from "../schemas";

export const actionPriority = (action: ActionDraft): number => {
  if (action.family === "DIRECT") {
    if (["action_approach", "action_withdraw"].includes(action.operationId)) return 2;
    if (action.operationId === "action_leave") return 5;
    return 3;
  }
  if (action.family === "SOCIAL" && action.functionIds.includes("ATTENTION")) return 1;
  return 4;
};

interface PrerequisiteResult {
  valid: boolean;
  reasonCode: string;
}

const directPrerequisite = (snapshot: RuntimeSnapshot, action: DirectAction): PrerequisiteResult => {
  const actor = snapshot.characters.find(({ id }) => id === action.actorId);
  if (!actor?.active) return { valid: false, reasonCode: "actor_inactive" };
  const objectId = action.objectId ?? action.targetId;
  const object = snapshot.objects.find(({ id }) => id === objectId);
  switch (action.operationId) {
    case "action_take":
      if (!object) return { valid: false, reasonCode: "target_missing" };
      if (actor.zoneId !== object.zoneId) return { valid: false, reasonCode: "target_out_of_reach" };
      if (object.holderId !== null) {
        const offered = worldHas(snapshot, { subjectId: object.id, predicate: "OFFERED_TO", objectId: actor.id });
        const available = worldHas(snapshot, { subjectId: object.id, predicate: "AVAILABLE_TO", objectId: actor.id });
        if (!offered || !available) return { valid: false, reasonCode: "object_already_held" };
      }
      return { valid: true, reasonCode: "prerequisites_met" };
    case "action_offer_object":
      if (!object || object.holderId !== actor.id) return { valid: false, reasonCode: "actor_not_holder" };
      if (!action.recipientId) return { valid: false, reasonCode: "recipient_missing" };
      return { valid: true, reasonCode: "prerequisites_met" };
    case "action_show":
    case "action_hide":
      if (!object || object.holderId !== actor.id) return { valid: false, reasonCode: "actor_not_holder" };
      return { valid: true, reasonCode: "prerequisites_met" };
    case "action_open":
      if (!object || object.open === null) return { valid: false, reasonCode: "target_not_openable" };
      if (object.open) return { valid: false, reasonCode: "target_already_open" };
      return { valid: true, reasonCode: "prerequisites_met" };
    case "action_close":
      if (!object || object.open === null) return { valid: false, reasonCode: "target_not_closable" };
      if (!object.open) return { valid: false, reasonCode: "target_already_closed" };
      return { valid: true, reasonCode: "prerequisites_met" };
    case "action_approach":
      return snapshot.entities.some(({ id }) => id === action.targetId)
        ? { valid: true, reasonCode: "prerequisites_met" }
        : { valid: false, reasonCode: "target_missing" };
    case "action_withdraw":
      return action.destinationZoneId && snapshot.room.zoneIds.includes(action.destinationZoneId)
        ? { valid: true, reasonCode: "prerequisites_met" }
        : { valid: false, reasonCode: "destination_missing" };
    case "action_leave":
      return actor.zoneId === action.targetId
        ? { valid: true, reasonCode: "prerequisites_met" }
        : { valid: false, reasonCode: "actor_not_at_exit" };
    default:
      return { valid: false, reasonCode: "unsupported_operation" };
  }
};

const eventFor = (
  snapshot: RuntimeSnapshot,
  action: ActionDraft,
  ordinal: number,
  resultPropositions: Proposition[],
  status: ActionResolution["status"],
  actionPackage: ActionPackage,
): ObservableEvent => {
  const message = actionPackage.message;
  const targetEntityIds = action.family === "DIRECT"
    ? [action.targetId, action.objectId, action.recipientId].filter((value): value is string => value !== null)
    : action.family === "SOCIAL"
      ? [action.targetActorId]
      : [];
  const social = action.family === "SOCIAL";
  return {
    id: stableRuntimeId("event", snapshot.sceneId, "beat", snapshot.beat + 1, ordinal, action.id),
    beat: snapshot.beat + 1,
    sourceActionId: action.id,
    actorId: action.actorId,
    resultPropositions,
    channels: social ? ["VISUAL", "AUDITORY", "COMMUNICATION_CONTENT"] : ["VISUAL"],
    contentPropositionIds: message?.claims.map(({ id }) => id) ?? [],
    targetEntityIds,
    observableCueIds: status === "SUCCESS"
      ? social
        ? ["ambiguous_social_occurrence", "communication_occurred"]
        : action.family === "DIRECT" ? [action.operationId] : ["principal_action_completed"]
      : ["failed_attempt", status === "INVALIDATED" ? "commitment_invalidated" : "prerequisite_failed"],
    messageId: message?.id ?? null,
    salient: status !== "SUCCESS" || action.family === "DEAL_RESPONSE",
  };
};

const resolveDirectResult = (snapshot: RuntimeSnapshot, action: DirectAction): Proposition[] => {
  const objectId = action.objectId ?? action.targetId;
  const actor = snapshot.characters.find(({ id }) => id === action.actorId)!;
  const targetActor = snapshot.characters.find(({ id }) => id === action.targetId);
  const targetObject = snapshot.objects.find(({ id }) => id === action.targetId);
  switch (action.operationId) {
    case "action_take":
      return [{ subjectId: objectId, predicate: "HELD_BY", objectId: action.actorId }];
    case "action_offer_object":
      return [
        { subjectId: objectId, predicate: "OFFERED_TO", objectId: action.recipientId! },
        { subjectId: objectId, predicate: "AVAILABLE_TO", objectId: action.recipientId! },
      ];
    case "action_show":
      return [
        { subjectId: objectId, predicate: "VISIBLE", value: true },
        { subjectId: objectId, predicate: "VISIBLE_TO", objectId: action.recipientId ?? action.targetId },
      ];
    case "action_hide":
      return [{ subjectId: objectId, predicate: "VISIBLE", value: false }];
    case "action_open":
      return [{ subjectId: objectId, predicate: "OPEN", value: true }];
    case "action_close":
      return [{ subjectId: objectId, predicate: "OPEN", value: false }];
    case "action_approach":
      return [{ subjectId: actor.id, predicate: "LOCATED_AT", objectId: targetActor?.zoneId ?? targetObject?.zoneId ?? action.destinationZoneId ?? actor.zoneId }];
    case "action_withdraw":
      return [{ subjectId: actor.id, predicate: "LOCATED_AT", objectId: action.destinationZoneId ?? "zone_entry" }];
    case "action_leave":
      return [
        { subjectId: actor.id, predicate: "LOCATED_AT", objectId: action.targetId },
        { subjectId: actor.id, predicate: "ACTIVE_IN_ROOM", value: false },
      ];
    default:
      return [];
  }
};

export interface PackageResolutionResult {
  resolution: ActionResolution;
  event: ObservableEvent;
  stateChanges: Proposition[];
  dealChanges: DealLifecycleChange[];
}

export function resolveActionPackage(
  preBeat: RuntimeSnapshot,
  current: RuntimeSnapshot,
  actionPackage: ActionPackage,
  ordinal: number,
): PackageResolutionResult {
  const { action } = actionPackage;
  let status: ActionResolution["status"] = "SUCCESS";
  let reasonCode = "resolved_successfully";
  let resultPropositions: Proposition[] = [];
  let dealChanges: DealLifecycleChange[] = [];

  if (action.family === "DIRECT") {
    const pre = directPrerequisite(preBeat, action);
    const now = directPrerequisite(current, action);
    if (!pre.valid) {
      status = "FAILED";
      reasonCode = pre.reasonCode;
    } else if (!now.valid) {
      status = "INVALIDATED";
      reasonCode = now.reasonCode;
    } else {
      resultPropositions = resolveDirectResult(current, action);
      resultPropositions.forEach((proposition) => assertWorldFact(current, proposition));
    }
  } else if (action.family === "SOCIAL") {
    if (!actionPackage.message) {
      status = "FAILED";
      reasonCode = "message_missing";
    } else {
      if (!current.messages.some(({ id }) => id === actionPackage.message!.id)) current.messages.push(structuredClone(actionPackage.message));
      resultPropositions.push({ subjectId: action.actorId, predicate: "COMMUNICATED_WITH", objectId: action.targetActorId });
      if (action.functionIds.includes("ATTENTION")) {
        resultPropositions.push({ subjectId: action.targetActorId, predicate: "ATTENDING_TO", objectId: action.actorId });
      }
      if (action.tactic === "DEAL") dealChanges.push(...registerDealProposal(current, actionPackage));
    }
  } else if (action.family === "DEAL_RESPONSE") {
    dealChanges = applyDealResponse(current, actionPackage);
    if (dealChanges.length === 0) {
      status = "FAILED";
      reasonCode = "deal_response_invalid";
    } else {
      resultPropositions = [{ subjectId: action.dealId, predicate: "DEAL_STATUS", value: dealChanges[0]!.nextStatus }];
    }
  } else {
    resultPropositions = [{ subjectId: action.actorId, predicate: "WAITED", value: true }];
  }

  if (status !== "SUCCESS") {
    resultPropositions = [{ subjectId: action.id, predicate: "ATTEMPT_FAILED", value: true }];
  }
  const event = eventFor(current, action, ordinal, resultPropositions, status, actionPackage);
  const resolution: ActionResolution = {
    actionId: action.id,
    status,
    reasonCode,
    resultPropositions,
    observableEventIds: [event.id],
  };
  return { resolution, event, stateChanges: status === "SUCCESS" ? resultPropositions : [], dealChanges };
}

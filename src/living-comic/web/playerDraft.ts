import { worldHas } from "../core/worldFacts";
import type { ContentManifest, Proposition, RuntimeSnapshot } from "../schemas";

export interface SemanticDraftOption {
  id: string;
  label: string;
  proposition: Proposition;
}

export interface SocialSemanticOptions {
  requested: SemanticDraftOption[];
  consequences: SemanticDraftOption[];
  offers: SemanticDraftOption[];
}

const option = (id: string, label: string, proposition: Proposition): SemanticDraftOption => ({ id, label, proposition });

export function socialSemanticOptions(snapshot: RuntimeSnapshot, targetActorId: string): SocialSemanticOptions {
  const playerId = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!.id;
  const object = snapshot.objects[0]!;
  const roomId = snapshot.room.id;
  const centerZoneId = snapshot.room.zoneIds.find((id) => id.includes("center")) ?? snapshot.room.zoneIds[1]!;
  const exitZoneId = snapshot.room.zoneIds.find((id) => id.includes("exit")) ?? snapshot.room.zoneIds.at(-1)!;
  return {
    requested: [
      option("request_attention", "Pay attention to me", { subjectId: targetActorId, predicate: "ATTENDING_TO", objectId: playerId }),
      option("request_object_available", "Make the central object available to me", { subjectId: object.id, predicate: "AVAILABLE_TO", objectId: playerId }),
      option("request_show_object", "Show me the central object", { subjectId: object.id, predicate: "VISIBLE_TO", objectId: playerId }),
      option("request_conceal_object", "Keep the central object concealed", { subjectId: object.id, predicate: "VISIBLE", value: false }),
      option("request_access", "Give me access to the room/resource", { subjectId: roomId, predicate: "ACCESSIBLE_TO", objectId: playerId }),
      option("request_exit_available", "Keep the exit available", { subjectId: roomId, predicate: "EXIT_AVAILABLE", value: true }),
      option("request_hold_center", "Stay at the room center", { subjectId: targetActorId, predicate: "LOCATED_AT", objectId: centerZoneId }),
      option("request_leave", "Move toward the exit", { subjectId: targetActorId, predicate: "LOCATED_AT", objectId: exitZoneId }),
    ],
    consequences: [
      option("consequence_exposed", "They are left exposed", { subjectId: targetActorId, predicate: "EXPOSED", value: true }),
      option("consequence_access_denied", "Their access is denied", { subjectId: roomId, predicate: "ACCESS_DENIED_TO", objectId: targetActorId }),
      option("consequence_object_hidden", "The central object is hidden", { subjectId: object.id, predicate: "VISIBLE", value: false }),
      option("consequence_exit", "They are pushed toward the exit", { subjectId: targetActorId, predicate: "LOCATED_AT", objectId: exitZoneId }),
    ],
    offers: [
      option("offer_object_available", "Make the central object available to them", { subjectId: object.id, predicate: "AVAILABLE_TO", objectId: targetActorId }),
      option("offer_access", "Preserve their access", { subjectId: roomId, predicate: "ACCESSIBLE_TO", objectId: targetActorId }),
      option("offer_show_object", "Show them the central object", { subjectId: object.id, predicate: "VISIBLE_TO", objectId: targetActorId }),
      option("offer_reveal_object", "Reveal the central object", { subjectId: object.id, predicate: "VISIBLE", value: true }),
      option("offer_attention", "Give them my attention", { subjectId: playerId, predicate: "ATTENDING_TO", objectId: targetActorId }),
      option("offer_help_exit", "Help them reach the exit", { subjectId: targetActorId, predicate: "LOCATED_AT", objectId: exitZoneId }),
    ],
  };
}

export interface DirectDraftChoice {
  id: string;
  label: string;
  operationId: string;
  targetId: string;
  intention: Proposition[];
  parameters: {
    objectId?: string;
    recipientId?: string;
    destinationZoneId?: string;
  };
}

export function directDraftChoices(snapshot: RuntimeSnapshot, content: ContentManifest): DirectDraftChoice[] {
  const player = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!;
  const playerId = player.id;
  const choices: DirectDraftChoice[] = [];
  const hasDefinition = (id: string) => content.directActions.some((definition) => definition.id === id);
  const add = (choice: DirectDraftChoice) => { if (hasDefinition(choice.operationId)) choices.push(choice); };

  snapshot.objects.forEach((object) => {
    const objectLabel = object.id.replaceAll("_", " ");
    const canTake = object.visible
      && player.zoneId === object.zoneId
      && (object.holderId === null || (
        worldHas(snapshot, { subjectId: object.id, predicate: "OFFERED_TO", objectId: playerId })
        && worldHas(snapshot, { subjectId: object.id, predicate: "AVAILABLE_TO", objectId: playerId })
      ));
    if (canTake) add({
      id: `take_${object.id}`,
      label: `Take ${objectLabel}`,
      operationId: "action_take",
      targetId: object.id,
      intention: [{ subjectId: object.id, predicate: "HELD_BY", objectId: playerId }],
      parameters: { objectId: object.id },
    });

    if (object.holderId === playerId) {
      snapshot.characters.filter(({ id, active }) => id !== playerId && active).forEach((actor) => {
        add({
          id: `offer_${object.id}_${actor.id}`,
          label: `Offer ${objectLabel} to ${actor.id.replace("actor_", "")}`,
          operationId: "action_offer_object",
          targetId: actor.id,
          intention: [{ subjectId: object.id, predicate: "AVAILABLE_TO", objectId: actor.id }],
          parameters: { objectId: object.id, recipientId: actor.id },
        });
        add({
          id: `show_${object.id}_${actor.id}`,
          label: `Show ${objectLabel} to ${actor.id.replace("actor_", "")}`,
          operationId: "action_show",
          targetId: actor.id,
          intention: [{ subjectId: object.id, predicate: "VISIBLE_TO", objectId: actor.id }],
          parameters: { objectId: object.id, recipientId: actor.id },
        });
      });
      add({
        id: `hide_${object.id}`,
        label: `Hide ${objectLabel}`,
        operationId: "action_hide",
        targetId: object.id,
        intention: [{ subjectId: object.id, predicate: "VISIBLE", value: false }],
        parameters: { objectId: object.id },
      });
    }

    if (object.visible && object.open !== null) {
      add({
        id: `${object.open ? "close" : "open"}_${object.id}`,
        label: `${object.open ? "Close" : "Open"} ${objectLabel}`,
        operationId: object.open ? "action_close" : "action_open",
        targetId: object.id,
        intention: [{ subjectId: object.id, predicate: "OPEN", value: !object.open }],
        parameters: { objectId: object.id },
      });
    }

    if (object.visible) add({
      id: `approach_${object.id}`,
      label: `Approach ${objectLabel}`,
      operationId: "action_approach",
      targetId: object.id,
      intention: [{ subjectId: playerId, predicate: "LOCATED_AT", objectId: object.zoneId }],
      parameters: {},
    });
  });

  snapshot.characters.filter(({ id, active }) => id !== playerId && active).forEach((actor) => add({
    id: `approach_${actor.id}`,
    label: `Approach ${actor.id.replace("actor_", "")}`,
    operationId: "action_approach",
    targetId: actor.id,
    intention: [{ subjectId: playerId, predicate: "LOCATED_AT", objectId: actor.zoneId }],
    parameters: {},
  }));
  snapshot.room.zoneIds.filter((zoneId) => zoneId !== player.zoneId).forEach((zoneId) => add({
    id: `withdraw_${zoneId}`,
    label: `Move to ${zoneId.replace("zone_", "").replaceAll("_", " ")}`,
    operationId: "action_withdraw",
    targetId: zoneId,
    intention: [{ subjectId: playerId, predicate: "LOCATED_AT", objectId: zoneId }],
    parameters: { destinationZoneId: zoneId },
  }));

  const exitZoneId = snapshot.room.zoneIds.find((id) => id.includes("exit"));
  if (exitZoneId && player.zoneId === exitZoneId) add({
    id: "leave_room",
    label: "Leave the room",
    operationId: "action_leave",
    targetId: exitZoneId,
    intention: [{ subjectId: playerId, predicate: "LOCATED_AT", objectId: exitZoneId }],
    parameters: {},
  });

  return choices;
}

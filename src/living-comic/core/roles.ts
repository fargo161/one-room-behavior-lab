import type { Character, RuntimeSnapshot } from "../schemas";

export type NarrativeRole = Character["role"];

export function actorIdForRole(
  snapshot: Pick<RuntimeSnapshot, "characters">,
  role: NarrativeRole,
): string {
  const actor = snapshot.characters.find((character) => character.role === role);
  if (!actor) throw new Error(`Missing actor for narrative role ${role}`);
  return actor.id;
}

export function narrativeRoleRefs(
  snapshot: Pick<RuntimeSnapshot, "characters" | "objects" | "room">,
): Record<string, string> {
  return {
    SELF: actorIdForRole(snapshot, "PLAYER_ROLE"),
    COUNTERPART: actorIdForRole(snapshot, "COUNTERPART_ROLE"),
    THIRD_PARTY: actorIdForRole(snapshot, "THIRD_PARTY_ROLE"),
    PRIMARY_OBJECT: snapshot.objects[0]!.id,
    ROOM: snapshot.room.id,
    EXIT_ZONE: snapshot.room.zoneIds.find((id) => id.includes("exit")) ?? snapshot.room.zoneIds.at(-1)!,
  };
}

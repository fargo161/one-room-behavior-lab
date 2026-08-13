import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionComposer, RoomTableau } from "../../app/BehaviorLab";
import { createEmptyPlan, createInitialSessionV3, makeInteractAction, makeMoveAction, resolveBeatV3 } from "./engine";
import type { ActorPlan, BehaviorLabSessionV3, PlannedAction, WorldStateV3 } from "./types";

const plan = (world: WorldStateV3, actions: PlannedAction[]): ActorPlan => ({ actorId: "PLAYER", beat: world.beat, actions, plannedFromStateId: world.stateId });
const noNpcs = (world: WorldStateV3) => ({ MARA: createEmptyPlan(world, "MARA"), DREW: createEmptyPlan(world, "DREW") });
const renderRoom = (session: BehaviorLabSessionV3) => renderToStaticMarkup(<RoomTableau session={session} />);

describe("semantic closure dynamic room rendering", () => {
  it("re-renders a held envelope at its holder's new location instead of the table", () => {
    const session = createInitialSessionV3(4);
    session.world.actors.PLAYER.position = "TABLE";
    const before = renderRoom(session);
    expect(before).toContain("Envelope available beside the table");
    const take = makeInteractAction(session.world, "PLAYER", "ENVELOPE", "TAKE", 1);
    const move = makeMoveAction(session.world, "PLAYER", "WINDOW", 2);
    const world = resolveBeatV3(session.world, plan(session.world, [take, move]), { npcPlans: noNpcs(session.world) });
    const after = renderRoom({ ...session, world, playerPlan: createEmptyPlan(world, "PLAYER") });
    expect(after).toContain("Envelope held at the room center held by You");
    expect(after).toMatch(/envelope-world[^"]*at-center/);
    expect(after).not.toContain("Envelope held beside the table held by You");
  });

  it("does not ordinarily render a locked-away envelope", () => {
    const session = createInitialSessionV3();
    session.world.envelope = { ...session.world.envelope, state: "LOCKED_AWAY", holderId: null, guardedBy: null, visible: false, position: "CABINET" };
    expect(renderRoom(session)).not.toMatch(/aria-label="Envelope/);
  });

  it("renders player SECURE only while the player physically holds the envelope", () => {
    const session = createInitialSessionV3(4);
    const initial = renderToStaticMarkup(<ActionComposer session={session} onAdd={() => {}} initialKind="INTERACT" />);
    expect(initial).not.toContain(">Secure<");
    session.world.actors.PLAYER.position = "TABLE";
    session.world.envelope = { ...session.world.envelope, state: "HELD", holderId: "PLAYER", position: "TABLE" };
    const holding = renderToStaticMarkup(<ActionComposer session={session} onAdd={() => {}} initialKind="INTERACT" />);
    expect(holding).toContain(">Secure<");
    expect(holding).not.toContain(">Lock away<");
  });
});

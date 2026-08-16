import { describe, expect, it } from "vitest";
import { actionBuildContext, makeAskPackage } from "../actions";
import { loadDefaultContent } from "../content";
import { resolveBeat, startScene } from "../engine";
import { generateScene } from "../generation";
import type { Proposition } from "../schemas";
import { buildDebugView, buildPlayerSafeView } from "./adapters";

const content = loadDefaultContent();

describe("Phase 8 Play and Debug adapter boundary", () => {
  it("builds Play from player perception without leaking NPC private state", () => {
    const generated = generateScene(14, content);
    const initial = startScene(generated, generated.playerOptions[0]!.id);
    const request: Proposition = { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" };
    const state = resolveBeat(initial, makeAskPackage(actionBuildContext(initial.snapshot), content, "actor_player", "actor_counterpart", request, { delivery: "PRIVATE" }), content);
    const npc = state.snapshot.characters.find(({ role }) => role === "THIRD_PARTY_ROLE")!;
    const npcGoalId = npc.primaryGoalId!;
    const npcReasonId = npc.reasonId!;
    const npcBeliefId = state.snapshot.beliefs.find(({ actorId }) => actorId === npc.id)?.id;
    const thirdPartyPerception = state.reports[0]!.perceptions.find(({ observerId }) => observerId === npc.id)!;
    thirdPartyPerception.registeredPropositions.push({ subjectId: "private_sentinel", predicate: "PRIVATE_NPC_INFERENCE", value: true });

    const play = buildPlayerSafeView(state, content);
    const serialized = JSON.stringify(play);
    expect(serialized).not.toContain("private_sentinel");
    expect(serialized).not.toContain(npcGoalId);
    expect(serialized).not.toContain(npcReasonId);
    if (npcBeliefId) expect(serialized).not.toContain(npcBeliefId);
    expect(serialized).not.toContain("candidateScores");
    expect(serialized).not.toContain("interpretations");
    expect(play.resultPanels.every(({ eventId }) => state.reports[0]!.perceptions.some(({ observerId, eventId: perceived }) => observerId === "actor_player" && perceived === eventId))).toBe(true);
  });

  it("keeps full authoritative state and causal reports in read-only Debug data", () => {
    const generated = generateScene(14, content);
    const state = startScene(generated, generated.playerOptions[0]!.id);
    const debug = buildDebugView(state, generated);
    expect(debug.snapshot.skeletonDefinitionId).toBe(generated.snapshot.skeletonDefinitionId);
    expect(debug.snapshot.goals.some(({ actorId }) => actorId !== "actor_player")).toBe(true);
    expect(debug.generationTrace).toEqual(generated.generationTrace);
  });
});

import { describe, expect, it } from "vitest";
import { runPhase6Demonstration } from "./phase6Demonstration";

describe("Phase 6 deterministic multi-Beat demonstration", () => {
  it("replays five Beats with every required principal/social record family", () => {
    const first = runPhase6Demonstration();
    const second = runPhase6Demonstration();
    expect(first).toEqual(second);
    expect(first.state.reports).toHaveLength(5);
    expect(first.playerActionKinds).toEqual(["ASK", "DEAL", "WAIT", "PRESSURE", "action_approach"]);
    const allActions = first.state.reports.flatMap(({ committedActions }) => committedActions.map(({ action }) => action));
    expect(allActions.some(({ family }) => family === "DIRECT")).toBe(true);
    expect(allActions.some((action) => action.family === "SOCIAL" && action.tactic === "ASK")).toBe(true);
    expect(allActions.some((action) => action.family === "SOCIAL" && action.tactic === "PRESSURE")).toBe(true);
    expect(allActions.some((action) => action.family === "SOCIAL" && action.tactic === "DEAL")).toBe(true);
    expect(allActions.some(({ family }) => family === "DEAL_RESPONSE")).toBe(true);
    expect(allActions.some(({ family }) => family === "WAIT")).toBe(true);
  });

  it("records proposal, acceptance, obligations, and a complete causal chain", () => {
    const demo = runPhase6Demonstration();
    expect(demo.dealLifecycle).toContain("PROPOSED");
    expect(demo.dealLifecycle).toContain("ACCEPTED");
    expect(demo.state.snapshot.obligations.length).toBeGreaterThanOrEqual(2);
    expect(demo.causalChain.goalId).toBeTruthy();
    expect(demo.causalChain.intention.length).toBeGreaterThan(0);
    expect(demo.causalChain.functionIds.length).toBeGreaterThan(0);
    expect(demo.causalChain.actionId).toBeTruthy();
    expect(demo.causalChain.eventIds.length).toBeGreaterThan(0);
    expect(demo.causalChain.perceptionIds.length).toBeGreaterThan(0);
    expect(demo.causalChain.interpretationIds.length).toBeGreaterThan(0);
    expect(demo.causalChain.beliefUpdateIds.length).toBeGreaterThan(0);
  });

  it("shows all three actions committed before each Beat resolves", () => {
    const demo = runPhase6Demonstration();
    for (const report of demo.state.reports) {
      expect(report.committedActions).toHaveLength(3);
      expect(new Set(report.committedActions.map(({ commitSnapshotId }) => commitSnapshotId))).toEqual(new Set([report.preBeatSnapshotId]));
      expect(new Set(report.npcDecisions.map(({ decisionSnapshotId }) => decisionSnapshotId))).toEqual(new Set([report.preBeatSnapshotId]));
    }
  });
});

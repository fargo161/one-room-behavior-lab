import { describe, expect, it } from "vitest";
import { loadDefaultContent } from "../content";
import { createReplaySpec, replayFromSpec } from "../engine";
import { runPhase9Acceptance } from "./phase9Acceptance";

describe("Living Comic v0.1 Phase 9 canonical acceptance fixture", () => {
  it("proves the locked causal loop in one deterministic manually reproducible run", () => {
    const content = loadDefaultContent();
    const run = runPhase9Acceptance(content);

    expect(run.summary.seed).toBe(2);
    expect(run.summary.beatCount).toBe(9);
    expect(run.summary.playerActionKinds).toEqual([
      "ASK",
      "ASK",
      "DEAL",
      "WAIT",
      "DEAL",
      "WAIT",
      "action_approach",
      "PRESSURE",
      "action_withdraw",
    ]);
    expect(run.summary.dealStatuses).toEqual(["REJECTED", "ACCEPTED"]);
    expect(run.summary.obligationStatuses).toEqual(["OPEN", "OPEN"]);
    expect(run.summary.privateOccurrenceWithoutContent).toBe(true);
    expect(run.summary.privateRecipientReceivedContent).toBe(true);
    expect(run.summary.attentionWasDiverted).toBe(true);
    expect(run.summary.falseBeliefWasWeakened).toBe(true);
    expect(run.summary.falseBeliefWasRevised).toBe(true);
    expect(run.summary.finalCorrectedBelief).toEqual({
      subjectId: "actor_player",
      predicate: "LOCATED_AT",
      objectId: "zone_exit",
    });
    expect(run.summary.differentInterpretationEventCount).toBeGreaterThan(0);
    expect(run.summary.historyActionIds).toContain("history_action_said");
    expect(run.summary.historyActionIds).toContain("history_action_accepted_deal");
    expect(run.summary.historyActionIds).toContain("history_action_approached");
    expect(run.summary.historyActionIds).toContain("history_action_withdrew");
    expect(run.summary.terminalReason).toBe("skeleton_terminal_predicate");
    expect(run.summary.replayEquivalent).toBe(true);

    const replayed = replayFromSpec(createReplaySpec(run.state), content);
    expect(replayed).toEqual(run.state);
  });
});

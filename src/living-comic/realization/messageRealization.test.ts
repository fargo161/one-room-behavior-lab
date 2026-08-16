import { describe, expect, it } from "vitest";
import { actionBuildContext, makeAskPackage } from "../actions";
import { buildPerceptions, buildObserverInterpretationView, interpretPerception } from "../cognition";
import { loadDefaultContent } from "../content";
import { resolveActionPackage, startScene } from "../engine";
import { generateScene } from "../generation";
import type { Proposition } from "../schemas";
import { deliveryOptionsFor, realizeActionPackage, realizeMessage } from "./messageRealization";

const content = loadDefaultContent();

const testState = () => {
  const generated = generateScene(14, content);
  return startScene(generated, generated.playerOptions[0]!.id);
};

describe("Phase 7 BASED and controlled multimodal realization", () => {
  it("offers plain-language delivery choices without exposing Vibe codes in their labels", () => {
    const options = deliveryOptionsFor("ASK", content);
    expect(options).toHaveLength(4);
    expect(options.map(({ basedVibeId }) => basedVibeId)).toEqual(["vibe_sd", "vibe_se", "vibe_eb", "vibe_as"]);
    expect(options.every(({ label }) => !/\b(?:AB|AS|SD|SE|EB|AD|DB|DE)\b/.test(label))).toBe(true);
  });

  it("realizes wording deterministically from semantic Message plus seed", () => {
    const state = testState();
    const requested: Proposition = { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" };
    const packageWithMessage = makeAskPackage(actionBuildContext(state.snapshot), content, "actor_player", "actor_counterpart", requested, { basedVibeId: "vibe_sd" });
    const first = realizeMessage(packageWithMessage.message!, content, state.snapshot.seed, 0);
    expect(first).toEqual(realizeMessage(packageWithMessage.message!, content, state.snapshot.seed, 0));
    expect(realizeMessage(packageWithMessage.message!, content, state.snapshot.seed, 1).id).not.toBe(first.id);
  });

  it("changes structured cues and observer interpretation while preserving semantic content", () => {
    const state = testState();
    const requested: Proposition = { subjectId: "actor_counterpart", predicate: "ATTENDING_TO", objectId: "actor_player" };
    const commanding = realizeActionPackage(
      makeAskPackage(actionBuildContext(state.snapshot), content, "actor_player", "actor_counterpart", requested, { basedVibeId: "vibe_as", delivery: "PRIVATE" }),
      content,
      state.snapshot.seed,
    );
    const coaxing = realizeActionPackage(
      makeAskPackage(actionBuildContext(state.snapshot), content, "actor_player", "actor_counterpart", requested, { basedVibeId: "vibe_sd", delivery: "PRIVATE" }),
      content,
      state.snapshot.seed,
    );
    expect(commanding.action.intention).toEqual(coaxing.action.intention);
    expect(commanding.message!.desiredStateChange).toEqual(coaxing.message!.desiredStateChange);
    expect(commanding.realizedMessage).not.toMatchObject({
      poseId: coaxing.realizedMessage!.poseId,
      faceId: coaxing.realizedMessage!.faceId,
      balloonId: coaxing.realizedMessage!.balloonId,
      paralanguageCueIds: coaxing.realizedMessage!.paralanguageCueIds,
      interpretationCueIds: coaxing.realizedMessage!.interpretationCueIds,
    });

    const resolveAndInterpret = (actionPackage: typeof commanding) => {
      const current = structuredClone(state.snapshot);
      const result = resolveActionPackage(state.snapshot, current, actionPackage, 1);
      const perception = buildPerceptions(current, [result.event]).perceptions.find(({ observerId }) => observerId === "actor_third_party")!;
      const view = buildObserverInterpretationView(current, "actor_third_party");
      view.goal = null;
      view.beliefs = [];
      return { event: result.event, interpretation: interpretPerception(view, perception, result.event, content) };
    };
    const commandingResult = resolveAndInterpret(commanding);
    const coaxingResult = resolveAndInterpret(coaxing);
    expect(commandingResult.event.observableCueIds).toContain("cue_control");
    expect(coaxingResult.event.observableCueIds).toContain("cue_invitation");
    expect(commandingResult.interpretation.inferredFunctionIds).toContain("ACCESS");
    expect(coaxingResult.interpretation.inferredFunctionIds).toContain("ATTENTION");
  });
});

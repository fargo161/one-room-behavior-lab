import { describe, expect, it } from "vitest";
import { makeAskPackage, actionBuildContext } from "../actions";
import { loadDefaultContent } from "../content";
import { generateScene } from "../generation";
import { startScene } from "../engine";
import { resolveActionPackage } from "../engine/resolution";
import type {
  ObservableEvent,
  Perception,
  Proposition,
} from "../schemas";
import { updateBeliefs } from "./beliefs";
import {
  buildObserverInterpretationView,
  interpretNpcPerceptions,
  interpretPerception,
} from "./interpretation";
import { buildPerceptions } from "./perception";

const content = loadDefaultContent();

const stateForCognition = () => {
  const generated = generateScene(104729, content);
  const state = startScene(generated, generated.playerOptions[0]!.id);
  state.snapshot.scenePressure.beatsRemaining = 8;
  return state;
};

const socialOccurrenceEvent = (): ObservableEvent => ({
  id: "event_test_ambiguous_social",
  beat: 1,
  sourceActionId: "action_test_ambiguous_social",
  historyActionId: "history_action_said",
  actorId: "actor_player",
  resultPropositions: [{ subjectId: "actor_player", predicate: "COMMUNICATED_WITH", objectId: "actor_counterpart" }],
  channels: ["VISUAL", "AUDITORY", "COMMUNICATION_CONTENT"],
  contentPropositionIds: [],
  targetEntityIds: ["actor_counterpart"],
  observableCueIds: ["ambiguous_social_occurrence"],
  messageId: null,
  salient: false,
});

const occurrencePerception = (observerId: string): Perception => ({
  id: `perception_test_${observerId}`,
  observerId,
  eventId: "event_test_ambiguous_social",
  channelsReceived: ["VISUAL"],
  registeredPropositions: [{ subjectId: "actor_player", predicate: "COMMUNICATED_WITH", objectId: "actor_counterpart" }],
  noticedActorId: "actor_player",
  noticedTargetIds: ["actor_counterpart"],
});

describe("Phase 6 attention and channel-limited perception", () => {
  it("allows message occurrence perception without communication content", () => {
    const state = stateForCognition();
    const requested: Proposition = { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" };
    const ask = makeAskPackage(
      actionBuildContext(state.snapshot),
      content,
      "actor_player",
      "actor_counterpart",
      requested,
      { delivery: "PRIVATE" },
    );
    const current = structuredClone(state.snapshot);
    const resolution = resolveActionPackage(state.snapshot, current, ask, 1);
    const result = buildPerceptions(current, [resolution.event]);
    const recipient = result.perceptions.find(({ observerId }) => observerId === "actor_counterpart")!;
    const thirdParty = result.perceptions.find(({ observerId }) => observerId === "actor_third_party")!;
    expect(recipient.channelsReceived).toContain("COMMUNICATION_CONTENT");
    expect(recipient.registeredPropositions).toContainEqual(requested);
    expect(thirdParty.channelsReceived).not.toContain("COMMUNICATION_CONTENT");
    expect(thirdParty.registeredPropositions).toEqual([
      { subjectId: "actor_player", predicate: "COMMUNICATED_WITH", objectId: "actor_counterpart" },
    ]);
  });

  it("lets an earlier attention event change later same-Beat perception without replanning", () => {
    const state = stateForCognition();
    state.snapshot.attentionStates.find(({ actorId }) => actorId === "actor_third_party")!.primaryFocusId = "actor_player";
    const attentionEvent: ObservableEvent = {
      id: "event_test_attention_first",
      beat: 1,
      sourceActionId: "action_test_attention_first",
      historyActionId: null,
      actorId: "actor_player",
      resultPropositions: [{ subjectId: "actor_third_party", predicate: "ATTENDING_TO", objectId: "primary_object" }],
      channels: ["VISUAL", "AUDITORY"],
      contentPropositionIds: [],
      targetEntityIds: ["actor_third_party"],
      observableCueIds: ["attention_redirect"],
      messageId: null,
      salient: true,
    };
    const laterEvent: ObservableEvent = {
      id: "event_test_later_hide",
      beat: 1,
      sourceActionId: "action_test_later_hide",
      historyActionId: "history_action_hid",
      actorId: "actor_counterpart",
      resultPropositions: [{ subjectId: "primary_object", predicate: "VISIBLE", value: false }],
      channels: ["VISUAL"],
      contentPropositionIds: [],
      targetEntityIds: ["primary_object"],
      observableCueIds: ["action_hide"],
      messageId: null,
      salient: false,
    };
    const withoutRedirect = buildPerceptions(state.snapshot, [laterEvent]);
    const withRedirect = buildPerceptions(state.snapshot, [attentionEvent, laterEvent]);
    expect(withoutRedirect.perceptions.find(({ observerId, eventId }) => observerId === "actor_third_party" && eventId === laterEvent.id)?.registeredPropositions).toEqual([
      { subjectId: "actor_counterpart", predicate: "OBSERVED_ACTING", value: true },
    ]);
    expect(withRedirect.perceptions.find(({ observerId, eventId }) => observerId === "actor_third_party" && eventId === laterEvent.id)?.registeredPropositions).toContainEqual(
      { subjectId: "primary_object", predicate: "VISIBLE", value: false },
    );
    expect(withRedirect.attentionTrace[0]).toMatchObject({ actorId: "actor_third_party", priorFocusId: "actor_player", nextFocusId: "primary_object" });
  });
});

describe("Phase 6 interpretation and explicit belief revision", () => {
  it("lets two actors interpret the same evidence differently from beliefs and Goal context", () => {
    const state = stateForCognition();
    const event = socialOccurrenceEvent();
    const accessView = buildObserverInterpretationView(state.snapshot, "actor_counterpart");
    accessView.beliefs = [{
      id: "belief_test_access_context",
      actorId: accessView.observer.id,
      proposition: { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" },
      certainty: "CERTAIN",
      sourceEventIds: ["history_event_test"],
    }];
    const attentionView = buildObserverInterpretationView(state.snapshot, "actor_third_party");
    attentionView.beliefs = [];
    attentionView.goal = {
      id: "goal_test_exit_context",
      definitionId: "goal_prevent_exit",
      actorId: attentionView.observer.id,
      target: { subjectId: "actor_player", predicate: "EXIT_BLOCKED", value: true },
      primary: true,
      obstacleIds: ["obstacle_test_exit_context"],
    };
    const access = interpretPerception(accessView, occurrencePerception(accessView.observer.id), event, content);
    const attention = interpretPerception(attentionView, occurrencePerception(attentionView.observer.id), event, content);
    expect(access.inferredFunctionIds).toContain("ACCESS");
    expect(access.inferredGoal).toEqual({ subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" });
    expect(attention.inferredFunctionIds).toContain("ATTENTION");
    expect(attention.inferredGoal?.predicate).toBe("ATTENDING_TO");
    expect(access.candidateScores).not.toEqual(attention.candidateScores);
  });

  it("creates a false belief from interpretation, then revises it from direct later evidence", () => {
    const state = stateForCognition();
    const observerId = "actor_third_party";
    state.snapshot.beliefs = state.snapshot.beliefs.filter(({ actorId, proposition }) => !(
      actorId === observerId && proposition.subjectId === "primary_object" && proposition.predicate === "HELD_BY"
    ));
    const event = socialOccurrenceEvent();
    const view = buildObserverInterpretationView(state.snapshot, observerId);
    view.beliefs = [];
    view.goal = null;
    const falseInterpretation = interpretPerception(view, occurrencePerception(observerId), event, content);
    expect(falseInterpretation.inferredGoal).toEqual({ subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" });
    const created = updateBeliefs(state.snapshot, [], [falseInterpretation]);
    expect(created[0]).toMatchObject({ updateKind: "CREATED", nextBelief: { certainty: "UNCERTAIN" } });
    expect(created[0]!.nextBelief.proposition).not.toEqual(
      state.snapshot.worldFacts.find(({ proposition }) => proposition.subjectId === "primary_object" && proposition.predicate === "HELD_BY")?.proposition,
    );

    const directPerception: Perception = {
      id: "perception_test_correct_holder",
      observerId,
      eventId: "event_test_correct_holder",
      channelsReceived: ["VISUAL"],
      registeredPropositions: [{ subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" }],
      noticedActorId: "actor_counterpart",
      noticedTargetIds: ["primary_object"],
    };
    const revised = updateBeliefs(state.snapshot, [directPerception], []);
    expect(revised[0]).toMatchObject({ updateKind: "REVISED", nextBelief: { certainty: "CERTAIN" } });
    expect(revised[0]!.nextBelief.proposition).toEqual({ subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" });
  });

  it("weakens a contradictory CERTAIN belief before later evidence replaces it", () => {
    const state = stateForCognition();
    const observerId = "actor_third_party";
    state.snapshot.beliefs = state.snapshot.beliefs.filter(({ actorId, proposition }) => !(
      actorId === observerId && proposition.subjectId === "primary_object" && proposition.predicate === "HELD_BY"
    ));
    state.snapshot.beliefs.push({
      id: "belief_test_certain_false",
      actorId: observerId,
      proposition: { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" },
      certainty: "CERTAIN",
      sourceEventIds: ["history_event_test"],
    });
    const perception: Perception = {
      id: "perception_test_contradiction",
      observerId,
      eventId: "event_test_contradiction",
      channelsReceived: ["VISUAL"],
      registeredPropositions: [{ subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" }],
      noticedActorId: "actor_counterpart",
      noticedTargetIds: ["primary_object"],
    };
    expect(updateBeliefs(state.snapshot, [perception], [])[0]).toMatchObject({ updateKind: "WEAKENED", nextBelief: { certainty: "UNCERTAIN" } });
    expect(updateBeliefs(state.snapshot, [{ ...perception, id: "perception_test_confirmation" }], [])[0]).toMatchObject({ updateKind: "REVISED", nextBelief: { certainty: "CERTAIN" } });
  });

  it("never assigns NPC-style interpretation as authoritative player belief", () => {
    const state = stateForCognition();
    const event = socialOccurrenceEvent();
    const playerPerception = occurrencePerception("actor_player");
    const npcPerception = occurrencePerception("actor_third_party");
    const interpretations = interpretNpcPerceptions(state.snapshot, [playerPerception, npcPerception], [event], content);
    expect(interpretations.some(({ observerId }) => observerId === "actor_player")).toBe(false);
    expect(interpretations.some(({ observerId }) => observerId === "actor_third_party")).toBe(true);
  });
});

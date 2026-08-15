import { describe, expect, it } from "vitest";
import { contradictoryPropositionPairs, propositionKey } from "./propositions";

describe("Living Comic proposition cardinality", () => {
  it("treats HELD_BY as a functional relation", () => {
    const first = { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_player" } as const;
    const second = { subjectId: "primary_object", predicate: "HELD_BY", objectId: "actor_counterpart" } as const;
    expect(propositionKey(first)).toBe(propositionKey(second));
    expect(contradictoryPropositionPairs([first, second])).toHaveLength(1);
  });

  it("allows multi-valued access relations for different actors", () => {
    const first = { subjectId: "scene_room", predicate: "ACCESS_DENIED_TO", objectId: "actor_player" } as const;
    const second = { subjectId: "scene_room", predicate: "ACCESS_DENIED_TO", objectId: "actor_counterpart" } as const;
    expect(propositionKey(first)).not.toBe(propositionKey(second));
    expect(contradictoryPropositionPairs([first, second])).toEqual([]);
  });
});

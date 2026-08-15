import { describe, expect, it } from "vitest";
import { contradictoryPropositionPairs, propositionKey } from "./propositions";
import { exportPredicateSemanticContract, propositionCardinality } from "./predicateSemantics";

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

  it("loads a portable central cardinality contract", () => {
    const contract = exportPredicateSemanticContract();
    expect(contract.version).toBe("predicate_semantics_v0_1");
    expect(contract.predicates.find(({ predicate }) => predicate === "OWNED_BY")?.objectCardinality).toBe("FUNCTIONAL");
    expect(contract.predicates.find(({ predicate }) => predicate === "ACCESSIBLE_TO")?.objectCardinality).toBe("MULTI_VALUED");
    expect(propositionCardinality({ subjectId: "scene_room", predicate: "ACCESSIBLE_TO", objectId: "actor_player" })).toBe("MULTI_VALUED");
  });
});

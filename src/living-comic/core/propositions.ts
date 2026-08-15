import type { Proposition } from "../schemas";
import { propositionCardinality } from "./predicateSemantics";

/**
 * A key identifies the semantic slot whose values may conflict. Functional
 * object relations have one slot per subject/predicate. Multi-valued relations
 * such as ACCESSIBLE_TO have one slot per subject/predicate/object, allowing a
 * room to grant or deny access to more than one actor without false conflict.
 */
export const propositionKey = (value: Proposition): string => [
  value.subjectId,
  value.predicate,
  value.objectId && propositionCardinality(value) === "MULTI_VALUED" ? value.objectId : undefined,
].filter(Boolean).join("|");

export const propositionIdentity = (value: Proposition): string => [
  propositionKey(value),
  value.objectId ?? JSON.stringify(value.value),
].join("|");

export const propositionsEqual = (left: Proposition, right: Proposition): boolean => (
  propositionIdentity(left) === propositionIdentity(right)
);

export const containsProposition = (values: readonly Proposition[], target: Proposition): boolean => (
  values.some((value) => propositionsEqual(value, target))
);

export const contradictoryPropositionPairs = (values: readonly Proposition[]): Array<[Proposition, Proposition]> => {
  const result: Array<[Proposition, Proposition]> = [];
  for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < values.length; rightIndex += 1) {
      const left = values[leftIndex] as Proposition;
      const right = values[rightIndex] as Proposition;
      if (propositionKey(left) === propositionKey(right) && !propositionsEqual(left, right)) {
        result.push([left, right]);
      }
    }
  }
  return result;
};

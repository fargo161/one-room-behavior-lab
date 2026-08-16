import { z } from "zod";
import rawPredicateSemantics from "../../../content/semantic/predicate-semantics.json";
import type { Proposition } from "../schemas";

const predicateCardinalitySchema = z.enum(["FUNCTIONAL", "MULTI_VALUED"]);

export const predicateSemanticContractSchema = z.object({
  version: z.literal("predicate_semantics_v0_1"),
  defaultObjectCardinality: predicateCardinalitySchema,
  predicates: z.array(z.object({
    predicate: z.string().regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/),
    objectCardinality: predicateCardinalitySchema,
    meaning: z.string().min(1),
  })),
}).superRefine((value, context) => {
  const seen = new Set<string>();
  value.predicates.forEach(({ predicate }, index) => {
    if (seen.has(predicate)) {
      context.addIssue({ code: "custom", path: ["predicates", index, "predicate"], message: `Duplicate predicate classification: ${predicate}` });
    }
    seen.add(predicate);
  });
});

export type PredicateCardinality = z.infer<typeof predicateCardinalitySchema>;
export type PredicateSemanticContract = z.infer<typeof predicateSemanticContractSchema>;

export const predicateSemanticContract: PredicateSemanticContract = predicateSemanticContractSchema.parse(rawPredicateSemantics);

const objectCardinalityByPredicate = new Map(
  predicateSemanticContract.predicates.map(({ predicate, objectCardinality }) => [predicate, objectCardinality]),
);

export function propositionCardinality(proposition: Proposition): PredicateCardinality {
  if (proposition.objectId === undefined) return "FUNCTIONAL";
  return objectCardinalityByPredicate.get(proposition.predicate)
    ?? predicateSemanticContract.defaultObjectCardinality;
}

export function exportPredicateSemanticContract(): PredicateSemanticContract {
  return structuredClone(predicateSemanticContract);
}

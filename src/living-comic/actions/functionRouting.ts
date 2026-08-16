import type { ContentManifest, FunctionId, Proposition } from "../schemas";
import type { FunctionRoutingDecision } from "./types";

const functionIdsForProposition = (proposition: Proposition): FunctionId[] => {
  const { predicate } = proposition;
  if (predicate === "LOCATED_AT") {
    return proposition.objectId?.includes("exit") ? ["ESCAPE"] : ["ACCESS", "ATTENTION"];
  }
  if (/^(LOCATED_IN|DEPARTED|ACTIVE_IN_ROOM|EXIT_)/.test(predicate)) return ["ESCAPE"];
  if (/^(HELD_BY|OWNED_BY|CONTROLLED_BY|ACCESS|OFFERED_TO|AVAILABLE_TO)/.test(predicate)) return ["ACCESS"];
  if (/^(VISIBLE|VISIBLE_TO|DISCLOSED_TO|SEALED|OPEN)/.test(predicate)) return ["SENSORY"];
  if (/^(ATTENDING_TO|EXPOSED)/.test(predicate)) return ["ATTENTION"];
  return [];
};

export function routeIntention(
  intention: Proposition[],
  content: ContentManifest,
): FunctionRoutingDecision {
  const compatibleFunctionIds = [...new Set(intention.flatMap(functionIdsForProposition))];
  const unsupportedPredicates = [...new Set(intention
    .filter((proposition) => functionIdsForProposition(proposition).length === 0)
    .map(({ predicate }) => predicate))].sort();
  const candidateOperationIds = content.directActions
    .filter(({ compatibleFunctions }) => compatibleFunctions.some((id) => compatibleFunctionIds.includes(id)))
    .map(({ id }) => id)
    .sort();
  return {
    intention,
    compatibleFunctionIds,
    candidateOperationIds,
    status: unsupportedPredicates.length === 0 ? "RESOLVED" : "UNSUPPORTED",
    unsupportedPredicates,
    ruleId: "route_intention_by_predicate_semantics",
  };
}

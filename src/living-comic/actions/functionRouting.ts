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
  if (/^(ATTENDING_TO|EXPOSED|PROTECTED)/.test(predicate)) return ["ATTENTION"];
  return ["ATTENTION"];
};

export function routeIntention(
  intention: Proposition[],
  content: ContentManifest,
): FunctionRoutingDecision {
  const compatibleFunctionIds = [...new Set(intention.flatMap(functionIdsForProposition))];
  const candidateOperationIds = content.directActions
    .filter(({ compatibleFunctions }) => compatibleFunctions.some((id) => compatibleFunctionIds.includes(id)))
    .map(({ id }) => id)
    .sort();
  return {
    intention,
    compatibleFunctionIds,
    candidateOperationIds,
    ruleId: "route_intention_by_predicate_semantics",
  };
}

import { stableRuntimeId } from "../core/ids";
import { propositionKey, propositionsEqual } from "../core/propositions";
import type {
  Belief,
  BeliefUpdate,
  Interpretation,
  Perception,
  Proposition,
  RuntimeSnapshot,
} from "../schemas";

const nonFactualPredicates = new Set([
  "ACTED",
  "ATTEMPT_FAILED",
  "COMMUNICATED_WITH",
  "DEAL_STATUS",
  "OBSERVED_ACTING",
  "PRESSURE_TICK",
  "WAITED",
]);

interface Evidence {
  actorId: string;
  proposition: Proposition;
  direct: boolean;
  sourceInterpretationId: string | null;
  sourcePerceptionIds: string[];
}

const replaceBelief = (snapshot: RuntimeSnapshot, prior: Belief | undefined, next: Belief): void => {
  if (prior) snapshot.beliefs = snapshot.beliefs.filter(({ id }) => id !== prior.id);
  snapshot.beliefs.push(next);
};

const applyEvidence = (snapshot: RuntimeSnapshot, evidence: Evidence, ordinal: number): BeliefUpdate => {
  const prior = snapshot.beliefs.find((belief) => (
    belief.actorId === evidence.actorId
    && propositionKey(belief.proposition) === propositionKey(evidence.proposition)
  ));
  let proposition = evidence.proposition;
  let certainty: Belief["certainty"] = evidence.direct ? "CERTAIN" : "UNCERTAIN";
  let updateKind: BeliefUpdate["updateKind"] = "CREATED";

  if (prior && propositionsEqual(prior.proposition, evidence.proposition)) {
    certainty = evidence.direct || prior.certainty === "CERTAIN" ? "CERTAIN" : "UNCERTAIN";
    updateKind = "CONFIRMED";
  } else if (prior && evidence.direct && prior.certainty === "CERTAIN") {
    proposition = prior.proposition;
    certainty = "UNCERTAIN";
    updateKind = "WEAKENED";
  } else if (prior && evidence.direct) {
    certainty = "CERTAIN";
    updateKind = "REVISED";
  } else if (prior) {
    proposition = prior.proposition;
    certainty = "UNCERTAIN";
    updateKind = "WEAKENED";
  }

  const nextBelief: Belief = {
    id: stableRuntimeId("belief", snapshot.sceneId, "beat", snapshot.beat + 1, evidence.actorId, ordinal),
    actorId: evidence.actorId,
    proposition,
    certainty,
    sourceEventIds: evidence.sourcePerceptionIds,
  };
  replaceBelief(snapshot, prior, nextBelief);
  return {
    id: stableRuntimeId("belief_update", nextBelief.id),
    actorId: evidence.actorId,
    priorBeliefId: prior?.id ?? null,
    nextBelief,
    updateKind,
    sourceInterpretationId: evidence.sourceInterpretationId,
    sourcePerceptionIds: evidence.sourcePerceptionIds,
  };
};

export function updateBeliefs(
  snapshot: RuntimeSnapshot,
  perceptions: Perception[],
  interpretations: Interpretation[],
): BeliefUpdate[] {
  const evidence: Evidence[] = [];
  for (const interpretation of interpretations) {
    if (interpretation.inferredGoal) {
      evidence.push({
        actorId: interpretation.observerId,
        proposition: interpretation.inferredGoal,
        direct: false,
        sourceInterpretationId: interpretation.id,
        sourcePerceptionIds: interpretation.perceptionIds,
      });
    }
  }
  for (const perception of perceptions) {
    for (const proposition of perception.registeredPropositions.filter(({ predicate }) => !nonFactualPredicates.has(predicate))) {
      evidence.push({
        actorId: perception.observerId,
        proposition,
        direct: true,
        sourceInterpretationId: null,
        sourcePerceptionIds: [perception.id],
      });
    }
  }
  return evidence.map((item, index) => applyEvidence(snapshot, item, index + 1));
}

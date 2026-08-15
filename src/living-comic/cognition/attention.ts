import type { AttentionState, ObservableEvent, Proposition } from "../schemas";

export interface AttentionTraceEntry {
  eventId: string;
  actorId: string;
  priorFocusId: string | null;
  nextFocusId: string | null;
  cause: Proposition;
}

export function applyAttentionEvent(
  attentionStates: AttentionState[],
  event: ObservableEvent,
): { attentionStates: AttentionState[]; trace: AttentionTraceEntry[] } {
  const next = structuredClone(attentionStates);
  const trace: AttentionTraceEntry[] = [];
  for (const proposition of event.resultPropositions.filter(({ predicate }) => predicate === "ATTENDING_TO")) {
    const attention = next.find(({ actorId }) => actorId === proposition.subjectId);
    if (!attention || !proposition.objectId) continue;
    const priorFocusId = attention.primaryFocusId;
    attention.primaryFocusId = proposition.objectId;
    trace.push({
      eventId: event.id,
      actorId: attention.actorId,
      priorFocusId,
      nextFocusId: attention.primaryFocusId,
      cause: proposition,
    });
  }
  return { attentionStates: next, trace };
}

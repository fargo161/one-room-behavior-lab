import { stableRuntimeId } from "../core/ids";
import type {
  AttentionState,
  Channel,
  ObservableEvent,
  Perception,
  RuntimeSnapshot,
  SemanticMessage,
} from "../schemas";
import { applyAttentionEvent, type AttentionTraceEntry } from "./attention";

export interface PerceptionPipelineResult {
  perceptions: Perception[];
  attentionAfter: AttentionState[];
  attentionTrace: AttentionTraceEntry[];
}

const uniqueChannels = (channels: Channel[]): Channel[] => [...new Set(channels)];

const accessibleChannels = (
  observerId: string,
  attention: AttentionState,
  event: ObservableEvent,
  message: SemanticMessage | undefined,
): Channel[] => {
  const channels: Channel[] = [];
  const isRecipient = message?.recipientId === observerId;
  const focused = attention.primaryFocusId === event.actorId
    || event.targetEntityIds.includes(attention.primaryFocusId ?? "");

  if (event.channels.includes("VISUAL") && (focused || attention.ambientChannels.includes("VISUAL") || event.salient)) {
    channels.push("VISUAL");
  }
  if (event.channels.includes("AUDITORY") && (isRecipient || focused || attention.ambientChannels.includes("AUDITORY") || event.salient)) {
    channels.push("AUDITORY");
  }
  if (event.channels.includes("COMMUNICATION_CONTENT") && message) {
    if (isRecipient || (message.delivery === "OPEN" && focused)) channels.push("COMMUNICATION_CONTENT");
  }
  return uniqueChannels(channels);
};

export function buildPerceptions(
  snapshot: RuntimeSnapshot,
  events: ObservableEvent[],
): PerceptionPipelineResult {
  let attentionAfter = structuredClone(snapshot.attentionStates);
  const perceptions: Perception[] = [];
  const attentionTrace: AttentionTraceEntry[] = [];

  for (const event of events) {
    const message = event.messageId ? snapshot.messages.find(({ id }) => id === event.messageId) : undefined;
    for (const observer of snapshot.characters.filter(({ active }) => active)) {
      if (observer.id === event.actorId) continue;
      const attention = attentionAfter.find(({ actorId }) => actorId === observer.id);
      if (!attention) continue;
      const channelsReceived = accessibleChannels(observer.id, attention, event, message);
      if (channelsReceived.length === 0) continue;
      const occurrenceOnly = message && !channelsReceived.includes("COMMUNICATION_CONTENT");
      const focused = attention.primaryFocusId === event.actorId
        || event.targetEntityIds.includes(attention.primaryFocusId ?? "");
      const ambientPhysicalOnly = !message && !focused && !event.salient;
      const registeredPropositions = occurrenceOnly
        ? event.resultPropositions.filter(({ predicate }) => predicate === "COMMUNICATED_WITH")
        : ambientPhysicalOnly
          ? [{ subjectId: event.actorId, predicate: "OBSERVED_ACTING", value: true }]
        : [
          ...event.resultPropositions,
          ...(channelsReceived.includes("COMMUNICATION_CONTENT")
            ? message?.claims
              .filter(({ id }) => event.contentPropositionIds.includes(id))
              .map(({ proposition }) => proposition) ?? []
            : []),
          ];
      perceptions.push({
        id: stableRuntimeId("perception", snapshot.sceneId, "beat", snapshot.beat + 1, observer.id, event.id),
        observerId: observer.id,
        eventId: event.id,
        channelsReceived,
        registeredPropositions,
        noticedActorId: event.actorId,
        noticedTargetIds: event.targetEntityIds,
      });
    }
    const attentionResult = applyAttentionEvent(attentionAfter, event);
    attentionAfter = attentionResult.attentionStates;
    attentionTrace.push(...attentionResult.trace);
  }

  return { perceptions, attentionAfter, attentionTrace };
}

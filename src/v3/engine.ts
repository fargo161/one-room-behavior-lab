import { initialAttention, prototypeConfig, roomAnchorLabels, roomEventDefinitions } from "./config";
import {
  createStructuredMessage,
  defaultPlayerMessageDraft,
  derivePackagingEvidence,
  messageToDraft,
  partialMessageFragment,
  renderMessage,
  validateMessageDraft,
} from "./messages";
import { actorIds, roomAnchors } from "./types";
import type {
  ActionResolution,
  ActorId,
  ActorPlan,
  ActorStateV3,
  Attribution,
  BehaviorLabSessionV3,
  CausalHistoryEvent,
  DeliveryMode,
  DistractionBelief,
  DistractionOutcome,
  DistractAction,
  EnvelopeState,
  InteractAction,
  MessageAction,
  MessageCompatibilityResult,
  MessageComponentCategory,
  MessageDraftV3,
  MoveAction,
  MoveTarget,
  NpcId,
  NpcPriorityWeights,
  ObservationRecord,
  PlannedAction,
  PlanValidation,
  PlannerCandidateRationale,
  ReceptionKind,
  ReceptionRecord,
  ResolutionStatus,
  RoomAnchor,
  RoomEventState,
  ScanAction,
  StructuredMessageEvent,
  TerminalStateV3,
  WorldStateV3,
} from "./types";

const clone = <T,>(value: T): T => structuredClone(value);
const actorName = (actorId: ActorId) => actorId === "PLAYER" ? "You" : actorId === "MARA" ? "Mara" : "Drew";

interface MutationContext {
  beat: number;
  slot: number;
  actorId: ActorId | null;
  actionId: string;
  sourceEventId: string;
  status: ResolutionStatus;
  reception?: ReceptionKind | null;
  visibility?: string | null;
  attribution?: Attribution | null;
  sourceTraceRefs?: string[];
}

class MutationRecorderV3 {
  constructor(private readonly world: WorldStateV3) {}

  record<T>(path: string, priorState: T, newState: T, ruleId: string, cause: string, context: MutationContext, apply: () => void): string {
    const id = `TRACE_B${String(context.beat).padStart(2, "0")}_${String(this.world.traces.length + 1).padStart(4, "0")}`;
    apply();
    this.world.traces.push({
      id,
      beat: context.beat,
      slot: context.slot,
      sequence: this.world.traces.length + 1,
      actorId: context.actorId,
      actionId: context.actionId,
      sourceEventId: context.sourceEventId,
      path,
      priorState: clone(priorState),
      newState: clone(newState),
      ruleId,
      cause,
      resolutionStatus: context.status,
      receptionResult: context.reception ?? null,
      visibility: context.visibility ?? null,
      attribution: context.attribution ?? null,
      sourceTraceRefs: [...(context.sourceTraceRefs ?? [])],
    });
    return id;
  }

  history(beat: number, actorId: ActorId | null, actionId: string, text: string, traceRefs: string[] = [], playerVisible = true): CausalHistoryEvent {
    const event: CausalHistoryEvent = {
      id: `HISTORY_B${String(beat).padStart(2, "0")}_${String(this.world.history.length + 1).padStart(4, "0")}`,
      beat,
      actorId,
      actionId,
      text,
      traceRefs,
      playerVisible,
    };
    this.world.history.push(event);
    return event;
  }

  latestTraceFor(path: string): string[] {
    const match = [...this.world.traces].reverse().find((trace) => trace.path === path);
    return match ? [match.id] : [];
  }
}

const initialActor = (id: ActorId): ActorStateV3 => ({
  id,
  name: actorName(id),
  active: true,
  position: id === "DREW" ? "TABLE" : "CENTER",
  attention: clone(initialAttention[id]),
  gaze: id === "PLAYER" ? "Mara" : id === "MARA" ? "Player" : "the envelope",
  orientation: id === "MARA" ? "angled toward the door" : id === "DREW" ? "square to the table" : "open to the room",
  posture: id === "MARA" ? "contained, ready to move" : id === "DREW" ? "still and territorial" : "alert",
  hands: id === "DREW" ? "one hand near the table" : "visible and free",
  face: id === "MARA" ? "ATTENTIVE" : "COMPOSED",
  apCommitted: 0,
  observations: [],
  distractionBeliefs: [],
  vigilance: 0,
  guardCompromisedUntilBeat: null,
  drewConcern: 0,
  maraExitPressure: 0,
  drewTrajectory: id === "DREW" ? "NORMAL" : null,
  maraTrajectory: id === "MARA" ? "ENGAGED" : null,
});

const eventFor = (seed: number, beat: number): RoomEventState => {
  const index = Math.abs(seed * 31 + beat * 17) % roomEventDefinitions.length;
  return { ...clone(roomEventDefinitions[index]), id: `ROOM_EVENT_B${String(beat).padStart(2, "0")}_${index}`, beat };
};

const placeholderEvent = (): RoomEventState => ({
  id: "ROOM_EVENT_PENDING",
  beat: 0,
  family: "OCCUPATION",
  effectId: "LIGHT_OCCUPATION",
  title: "Room settles",
  description: "The room is quiet.",
  noise: "QUIET",
  attentionActorId: null,
  attentionTarget: null,
  actionableEffect: "No new opening is visible.",
  durationBeats: null,
});

function setActorField<K extends keyof ActorStateV3>(world: WorldStateV3, recorder: MutationRecorderV3, actorId: ActorId, field: K, value: ActorStateV3[K], ruleId: string, cause: string, context: MutationContext): string | null {
  const prior = world.actors[actorId][field];
  if (JSON.stringify(prior) === JSON.stringify(value)) return null;
  return recorder.record(`actors.${actorId}.${String(field)}`, prior, value, ruleId, cause, context, () => {
    world.actors[actorId][field] = clone(value) as ActorStateV3[K];
  });
}

function incrementActorMetric(world: WorldStateV3, recorder: MutationRecorderV3, actorId: ActorId, field: "drewConcern" | "maraExitPressure" | "vigilance", amount: number, ruleId: string, cause: string, context: MutationContext): string | null {
  return setActorField(world, recorder, actorId, field, Math.max(0, world.actors[actorId][field] + amount), ruleId, cause, context);
}

const addTemporaryAffordance = (world: WorldStateV3, recorder: MutationRecorderV3, id: WorldStateV3["room"]["temporaryAffordances"][number]["id"], event: RoomEventState, context: MutationContext, refs: string[]) => {
  const next = [...world.room.temporaryAffordances.filter((item) => item.id !== id), { id, sourceEventId: event.id, expiresAfterBeat: world.beat }];
  refs.push(recorder.record("room.temporaryAffordances", world.room.temporaryAffordances, next, "RULE_ROOM_EVENT_TEMPORARY_AFFORDANCE", "The scenario-authored event creates an explicit Beat-scoped affordance.", { ...context, sourceTraceRefs: refs }, () => { world.room.temporaryAffordances = next; }));
};

function prepareRoomEvent(world: WorldStateV3, recorder: MutationRecorderV3): void {
  const event = eventFor(world.seed, world.beat);
  const context: MutationContext = { beat: world.beat, slot: 0, actorId: null, actionId: event.id, sourceEventId: event.id, status: "NORMAL" };
  const unexpired = world.room.temporaryAffordances.filter((item) => item.expiresAfterBeat >= world.beat);
  if (unexpired.length !== world.room.temporaryAffordances.length) {
    recorder.record("room.temporaryAffordances", world.room.temporaryAffordances, unexpired, "RULE_ROOM_EVENT_AFFORDANCE_EXPIRY", "Beat-scoped affordances expire deterministically before the next event.", context, () => { world.room.temporaryAffordances = unexpired; });
  }
  if (world.room.envelopeAccessRevealed && !unexpired.some((item) => item.id === "ENVELOPE_REVEALED")) {
    recorder.record("room.envelopeAccessRevealed", true, false, "RULE_ROOM_EVENT_AFFORDANCE_EXPIRY", "The temporary exposed-seal affordance expired.", context, () => { world.room.envelopeAccessRevealed = false; });
  }
  const eventTrace = recorder.record("currentRoomEvent", world.currentRoomEvent, event, "RULE_SEEDED_ROOM_EVENT", "The seed and Beat select one deterministic tactical room event.", context, () => {
    world.currentRoomEvent = clone(event);
    world.roomEvents.push(clone(event));
  });
  const refs = [eventTrace];
  refs.push(recorder.record("roomNoise", world.roomNoise, event.noise, "RULE_ROOM_EVENT_NOISE", "The event sets the current audibility context.", { ...context, sourceTraceRefs: refs }, () => { world.roomNoise = event.noise; }));

  if (event.effectId === "OPEN_DOOR" && !world.room.doorOpen) {
    refs.push(recorder.record("room.doorOpen", false, true, "RULE_ROOM_EVENT_POSITION_CHANGE", "The door event persistently changes room state.", { ...context, sourceTraceRefs: refs }, () => { world.room.doorOpen = true; }));
  }
  if (event.effectId === "REVEAL_ENVELOPE") {
    if (!world.room.envelopeAccessRevealed) refs.push(recorder.record("room.envelopeAccessRevealed", false, true, "RULE_ROOM_EVENT_REVEAL_ACCESS", "The event reveals a concrete inspection affordance.", { ...context, sourceTraceRefs: refs }, () => { world.room.envelopeAccessRevealed = true; }));
    addTemporaryAffordance(world, recorder, "ENVELOPE_REVEALED", event, context, refs);
  }
  if (event.effectId === "NATURAL_PHONE_DISTRACTION") {
    addTemporaryAffordance(world, recorder, "DREW_NATURALLY_DISTRACTED", event, context, refs);
    const compromised = setActorField(world, recorder, "DREW", "guardCompromisedUntilBeat", world.beat, "RULE_NATURAL_DISTRACTION_GUARD_OPENING", "A causally independent room event compromises Drew's guard without player attribution.", { ...context, sourceTraceRefs: refs });
    if (compromised) refs.push(compromised);
  }
  if (event.effectId === "LIGHT_OCCUPATION") {
    addTemporaryAffordance(world, recorder, "LIGHT_FLICKER_OPENING", event, context, refs);
    const hands = setActorField(world, recorder, "DREW", "hands", "raised briefly against the flickering light", "RULE_OCCUPATION_CHANGES_TABLEAU", "The occupation event visibly changes Drew's hand posture.", { ...context, sourceTraceRefs: refs });
    if (hands) refs.push(hands);
  }
  if (event.effectId === "HALLWAY_INTERRUPTION") {
    const pressure = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", 1, "RULE_INTERRUPTION_EXIT_SALIENCE", "The hallway interruption makes the exit more salient to Mara.", { ...context, sourceTraceRefs: refs });
    if (pressure) refs.push(pressure);
  }
  if (event.attentionActorId && event.attentionTarget) {
    const attention = setActorField(world, recorder, event.attentionActorId, "attention", event.attentionTarget, "RULE_ROOM_EVENT_ATTENTION", event.actionableEffect, { ...context, sourceTraceRefs: refs });
    if (attention) refs.push(attention);
    const gaze = setActorField(world, recorder, event.attentionActorId, "gaze", event.title.toLowerCase(), "RULE_TABLEAU_GAZE_FOLLOWS_ATTENTION", "Gaze makes the event-driven attention change observable.", { ...context, sourceTraceRefs: refs });
    if (gaze) refs.push(gaze);
  }
  recorder.history(world.beat, null, event.id, `${event.title}: ${event.description} ${event.actionableEffect}`, refs);
}

export function createInitialWorldV3(seed: number = prototypeConfig.defaultSeed): WorldStateV3 {
  const world: WorldStateV3 = {
    version: "0.3.0",
    stateId: `WORLD_SEED_${seed}_B01`,
    seed,
    beat: 1,
    maxBeats: prototypeConfig.maxBeats,
    actors: { PLAYER: initialActor("PLAYER"), MARA: initialActor("MARA"), DREW: initialActor("DREW") },
    envelope: { id: "ENVELOPE", state: "AVAILABLE", position: "TABLE", holderId: null, guardedBy: null, visible: true },
    room: { doorOpen: false, envelopeAccessRevealed: false, temporaryAffordances: [] },
    roomNoise: "QUIET",
    currentRoomEvent: placeholderEvent(),
    roomEvents: [],
    messages: [],
    receptions: [],
    traces: [],
    history: [],
    lastPlans: {},
    lastResolutions: [],
    terminal: null,
  };
  prepareRoomEvent(world, new MutationRecorderV3(world));
  world.stateId = `WORLD_SEED_${seed}_B01_T${world.traces.length}`;
  return world;
}

export const createEmptyPlan = (world: WorldStateV3, actorId: ActorId): ActorPlan => ({ actorId, beat: world.beat, actions: [], plannedFromStateId: world.stateId });
const actionId = (world: WorldStateV3, actorId: ActorId, ordinal: number, kind: PlannedAction["kind"]) => `ACT_B${String(world.beat).padStart(2, "0")}_${actorId}_${String(ordinal).padStart(2, "0")}_${kind}`;

const asMoveTarget = (target: RoomAnchor | ActorId): MoveTarget => roomAnchors.includes(target as RoomAnchor) ? { kind: "LOCATION", id: target as RoomAnchor } : { kind: "ACTOR", id: target as ActorId };

export const makeMoveAction = (world: WorldStateV3, actorId: ActorId, target: RoomAnchor | ActorId, ordinal: number): MoveAction => {
  const resolved = asMoveTarget(target);
  return { id: actionId(world, actorId, ordinal, "MOVE"), actorId, kind: "MOVE", cost: 1, beat: world.beat, ordinal, target: resolved, plannedTargetPosition: resolved.kind === "LOCATION" ? resolved.id : world.actors[resolved.id].position };
};

export const makeMessageAction = (world: WorldStateV3, actorId: ActorId, draft: MessageDraftV3, ordinal: number): MessageAction => {
  const message = createStructuredMessage(actorId, world.beat, draft);
  return {
    id: actionId(world, actorId, ordinal, "MESSAGE"), actorId, kind: "MESSAGE", cost: 1, beat: world.beat, ordinal, message,
    plannedSenderPosition: world.actors[actorId].position,
    plannedRecipientPositions: Object.fromEntries(message.intendedRecipients.map((id) => [id, world.actors[id].position])),
    plannedCompatibility: validateMessageDraft(world, draft),
  };
};

export const makeScanAction = (world: WorldStateV3, actorId: ActorId, targetType: ScanAction["targetType"], targetId: ScanAction["targetId"], ordinal: number): ScanAction => ({ id: actionId(world, actorId, ordinal, "SCAN"), actorId, kind: "SCAN", cost: 1, beat: world.beat, ordinal, targetType, targetId });
export const makeInteractAction = (world: WorldStateV3, actorId: ActorId, targetId: InteractAction["targetId"], operation: InteractAction["operation"], ordinal: number): InteractAction => ({ id: actionId(world, actorId, ordinal, "INTERACT"), actorId, kind: "INTERACT", cost: 1, beat: world.beat, ordinal, targetId, operation, plannedTargetPosition: targetId === "ENVELOPE" ? world.envelope.position : "DOOR" });
export const makeDistractAction = (world: WorldStateV3, targetActorId: NpcId, mode: DistractAction["mode"], ordinal: number): DistractAction => ({ id: actionId(world, "PLAYER", ordinal, "DISTRACT"), actorId: "PLAYER", kind: "DISTRACT", cost: 1, beat: world.beat, ordinal, targetActorId, mode });

export function validatePlan(world: WorldStateV3, plan: ActorPlan): PlanValidation {
  const issues: string[] = [];
  if (plan.beat !== world.beat) issues.push("The plan belongs to a different Beat.");
  if (plan.actions.length > prototypeConfig.apPerActor) issues.push("A fourth 1-AP action exceeds the 3-AP Beat budget.");
  const recipients = new Set<ActorId>();
  for (const action of plan.actions) {
    if (action.actorId !== plan.actorId) issues.push(`${action.id} belongs to another actor.`);
    if (action.kind === "DISTRACT" && plan.actorId !== "PLAYER") issues.push("DISTRACT is player-only in v0.3.");
    if (action.kind === "MESSAGE") {
      const compatibility = validateMessageDraft(world, messageToDraft(action.message));
      if (!compatibility.valid) issues.push(...compatibility.invalidReasons.map((issue) => `${action.id}: ${issue}`));
      for (const recipientId of action.message.intendedRecipients) {
        if (recipients.has(recipientId)) issues.push(`${actorName(recipientId)} is already an intended direct recipient this Beat.`);
        recipients.add(recipientId);
      }
    }
  }
  const apCommitted = plan.actions.reduce((total, action) => total + action.cost, 0);
  return { legal: issues.length === 0 && apCommitted <= prototypeConfig.apPerActor, issues, apCommitted, apRemaining: Math.max(0, prototypeConfig.apPerActor - apCommitted) };
}

export function appendPlayerAction(session: BehaviorLabSessionV3, action: PlannedAction): BehaviorLabSessionV3 {
  const nextPlan = { ...session.playerPlan, actions: [...session.playerPlan.actions, action] };
  const validation = validatePlan(session.world, nextPlan);
  if (!validation.legal) return { ...session, queueNotice: validation.issues[0] ?? "That action is not legal." };
  return { ...session, playerPlan: nextPlan, queueNotice: `${action.kind} queued. ${validation.apRemaining} AP remaining.` };
}
export function removePlayerAction(session: BehaviorLabSessionV3, index: number): BehaviorLabSessionV3 { return { ...session, playerPlan: { ...session.playerPlan, actions: session.playerPlan.actions.filter((_, itemIndex) => itemIndex !== index) }, queueNotice: "Action removed from the Beat plan." }; }
export function reorderPlayerAction(session: BehaviorLabSessionV3, from: number, to: number): BehaviorLabSessionV3 {
  if (to < 0 || to >= session.playerPlan.actions.length) return session;
  const actions = [...session.playerPlan.actions];
  const [moved] = actions.splice(from, 1);
  actions.splice(to, 0, moved);
  return { ...session, playerPlan: { ...session.playerPlan, actions }, queueNotice: "Action order updated." };
}

export function roomDistance(from: RoomAnchor, to: RoomAnchor): number {
  if (from === to) return 0;
  const visited = new Set<RoomAnchor>([from]);
  const queue: Array<{ anchor: RoomAnchor; distance: number }> = [{ anchor: from, distance: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const next of prototypeConfig.roomGraph[current.anchor]) {
      if (next === to) return current.distance + 1;
      if (!visited.has(next)) { visited.add(next); queue.push({ anchor: next, distance: current.distance + 1 }); }
    }
  }
  return Number.POSITIVE_INFINITY;
}

export const actorProximity = (world: WorldStateV3, left: ActorId, right: ActorId): number => roomDistance(world.actors[left].position, world.actors[right].position);

const nextStepToward = (from: RoomAnchor, to: RoomAnchor): RoomAnchor | null => {
  if (from === to) return null;
  return [...prototypeConfig.roomGraph[from]].sort((left, right) => roomDistance(left, to) - roomDistance(right, to) || left.localeCompare(right))[0] ?? null;
};

const attentionIncludes = (observer: ActorStateV3, senderId: ActorId, recipients: ActorId[]): boolean => observer.attention.kind === "ACTOR" && (observer.attention.id === senderId || recipients.includes(observer.attention.id as ActorId));

export function plausibleDeliveryModes(world: WorldStateV3, senderId: ActorId, recipientId: ActorId): DeliveryMode[] {
  const distance = actorProximity(world, senderId, recipientId);
  return ["NORMAL", ...(distance <= prototypeConfig.reception.lowVoiceDirectMaxDistance ? ["LOW_VOICE" as const] : []), ...(distance <= prototypeConfig.reception.whisperDirectMaxDistance ? ["WHISPER" as const] : [])];
}

function resolveObserverReception(world: WorldStateV3, message: StructuredMessageEvent, observerId: ActorId, delivery: DeliveryMode): ReceptionKind {
  const observer = world.actors[observerId];
  if (!observer.active) return "NONE";
  const sender = world.actors[message.senderId];
  const distance = roomDistance(observer.position, sender.position);
  const attentive = attentionIncludes(observer, message.senderId, message.intendedRecipients);
  const noisePenalty = world.roomNoise === "LOUD" ? prototypeConfig.reception.loudRoomDistancePenalty : 0;
  if (message.intendedRecipients.includes(observerId)) {
    const max = delivery === "WHISPER" ? prototypeConfig.reception.whisperDirectMaxDistance : delivery === "LOW_VOICE" ? prototypeConfig.reception.lowVoiceDirectMaxDistance - noisePenalty : prototypeConfig.reception.normalDirectMaxDistance - noisePenalty;
    return distance <= max ? "DIRECT" : "NONE";
  }
  if (delivery === "WHISPER") {
    if (distance === 0 && attentive) return "OVERHEARD_FULL";
    if (distance <= 1 && attentive) return "OVERHEARD_PARTIAL";
    if (distance <= prototypeConfig.reception.noticedOnlyMaxDistance && (attentive || observer.attention.kind === "LOCATION" && observer.attention.id === sender.position)) return "NOTICED_ONLY";
    return "NONE";
  }
  if (delivery === "LOW_VOICE") {
    if (distance <= prototypeConfig.reception.lowVoiceFullOverhearMaxDistance - noisePenalty && attentive) return "OVERHEARD_FULL";
    if (distance <= 2 - noisePenalty && attentive) return "OVERHEARD_PARTIAL";
    if (distance <= prototypeConfig.reception.noticedOnlyMaxDistance) return "NOTICED_ONLY";
    return "NONE";
  }
  if (distance <= prototypeConfig.reception.normalFullOverhearMaxDistance - noisePenalty) return "OVERHEARD_FULL";
  if (attentive && distance <= 3 - noisePenalty) return "OVERHEARD_PARTIAL";
  if (distance <= prototypeConfig.reception.noticedOnlyMaxDistance + 1 - noisePenalty) return "NOTICED_ONLY";
  return "NONE";
}

const recordReception = (world: WorldStateV3, recorder: MutationRecorderV3, message: StructuredMessageEvent, actorId: ActorId, kind: ReceptionKind, delivery: DeliveryMode, context: MutationContext): ReceptionRecord => {
  const reception: ReceptionRecord = { id: `RECEPTION_${message.id}_${actorId}`, beat: world.beat, messageId: message.id, actorId, kind, content: kind === "DIRECT" || kind === "OVERHEARD_FULL" ? message.surfaceText : null, fragment: kind === "OVERHEARD_PARTIAL" ? partialMessageFragment(message) : null, deliveryResolvedAs: delivery, sourceTraceRefs: [...(context.sourceTraceRefs ?? [])] };
  const trace = recorder.record(`receptions.${reception.id}`, null, reception, "RULE_ACTOR_SPECIFIC_RECEPTION", "Reception resolves from current geometry, noise, attention, delivery, and intended address.", { ...context, reception: kind }, () => world.receptions.push(reception));
  reception.sourceTraceRefs.push(trace);
  return reception;
};

function updateDrewTrajectory(world: WorldStateV3, recorder: MutationRecorderV3, trigger: string, context: MutationContext): string[] {
  const drew = world.actors.DREW;
  const thresholds = prototypeConfig.failThresholds;
  const current = drew.drewTrajectory ?? "NORMAL";
  let next = current;
  if (drew.drewConcern >= thresholds.drewLockdown && ["SECRECY_LEAK", "PLAYER_TOUCH_ENVELOPE", "MARA_AT_EXIT", "OBSERVED_EXPLOIT"].includes(trigger)) next = "LOCKDOWN";
  else if (drew.drewConcern >= thresholds.drewSecuring) next = "SECURING";
  else if (drew.drewConcern >= thresholds.drewGuarding) next = "GUARDING";
  else if (drew.drewConcern >= thresholds.drewWatchful) next = "WATCHFUL";
  const trajectoryRank = { NORMAL: 0, WATCHFUL: 1, GUARDING: 2, SECURING: 3, LOCKDOWN: 4, EJECT: 5 } as const;
  if (trajectoryRank[next] < trajectoryRank[current]) next = current;
  const refs: string[] = [];
  const stage = setActorField(world, recorder, "DREW", "drewTrajectory", next, "RULE_DREW_FAIL_TRAJECTORY", `Drew's accumulated concern and ${trigger} determine the scenario-local trajectory.`, context);
  if (stage) refs.push(stage);
  const face = next === "NORMAL" ? "COMPOSED" : next === "WATCHFUL" ? "ATTENTIVE" : next === "EJECT" ? "CLOSED" : "TENSE";
  const faceTrace = setActorField(world, recorder, "DREW", "face", face, "RULE_DREW_TRAJECTORY_TABLEAU", "Drew's face supplies contextual evidence, not a universal code.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...refs] });
  if (faceTrace) refs.push(faceTrace);
  const posture = next === "NORMAL" ? "still and territorial" : next === "WATCHFUL" ? "upright, tracking the room" : next === "EJECT" ? "between you and the exit" : "closed over the envelope";
  const postureTrace = setActorField(world, recorder, "DREW", "posture", posture, "RULE_DREW_TRAJECTORY_TABLEAU", "Posture visibly telegraphs escalation without naming it.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...refs] });
  if (postureTrace) refs.push(postureTrace);
  return refs;
}

function updateMaraTrajectory(world: WorldStateV3, recorder: MutationRecorderV3, trigger: string, context: MutationContext): string[] {
  const mara = world.actors.MARA;
  const thresholds = prototypeConfig.failThresholds;
  const current = mara.maraTrajectory ?? "ENGAGED";
  let next = current;
  if (mara.maraExitPressure >= thresholds.maraFlee && mara.position === "DOOR" && ["BLUNT_WARNING", "DREW_BLOCKING", "PLAYER_PRESSURE"].includes(trigger)) next = "READY_TO_LEAVE";
  else if (mara.maraExitPressure >= thresholds.maraReadyToLeave) next = "READY_TO_LEAVE";
  else if (mara.maraExitPressure >= thresholds.maraNearExit || mara.position === "DOOR") next = "NEAR_EXIT";
  else if (mara.maraExitPressure >= thresholds.maraUneasy) next = "UNEASY";
  const trajectoryRank = { ENGAGED: 0, UNEASY: 1, NEAR_EXIT: 2, READY_TO_LEAVE: 3, FLEE: 4 } as const;
  if (trajectoryRank[next] < trajectoryRank[current]) next = current;
  const refs: string[] = [];
  const stage = setActorField(world, recorder, "MARA", "maraTrajectory", next, "RULE_MARA_FAIL_TRAJECTORY", `Mara's accumulated pressure and ${trigger} determine the scenario-local trajectory.`, context);
  if (stage) refs.push(stage);
  const face = next === "ENGAGED" ? "ATTENTIVE" : next === "UNEASY" ? "UNEASY" : next === "FLEE" ? "RESOLVED" : "TENSE";
  const faceTrace = setActorField(world, recorder, "MARA", "face", face, "RULE_MARA_TRAJECTORY_TABLEAU", "Mara's face supplies contextual evidence.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...refs] });
  if (faceTrace) refs.push(faceTrace);
  const orientation = next === "ENGAGED" ? "angled toward the door" : next === "UNEASY" ? "half-turned toward the door" : "set toward the exit";
  const orientationTrace = setActorField(world, recorder, "MARA", "orientation", orientation, "RULE_MARA_TRAJECTORY_TABLEAU", "Orientation visibly telegraphs Mara's relation to the exit.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...refs] });
  if (orientationTrace) refs.push(orientationTrace);
  return refs;
}

function normalizeEnvelope(world: WorldStateV3, proposed: EnvelopeState): EnvelopeState {
  const next = clone(proposed);
  if (next.state === "LOCKED_AWAY") return { ...next, holderId: null, guardedBy: null, visible: false, position: "CABINET" };
  next.visible = true;
  if (next.holderId) {
    next.position = world.actors[next.holderId].position;
    if (next.state !== "SECURED") next.state = "HELD";
  } else if (next.state === "HELD" || next.state === "SECURED") {
    next.state = next.guardedBy ? "GUARDED" : "MOVED";
  }
  if (next.guardedBy) {
    const guard = world.actors[next.guardedBy];
    if (!guard.active || guard.position !== next.position || next.guardedBy === next.holderId) next.guardedBy = null;
  }
  if (!next.holderId && next.guardedBy) next.state = "GUARDED";
  if (!next.holderId && !next.guardedBy && next.state === "GUARDED") next.state = "MOVED";
  return next;
}

function transitionEnvelope(world: WorldStateV3, recorder: MutationRecorderV3, proposed: EnvelopeState, ruleId: string, cause: string, context: MutationContext): string[] {
  const next = normalizeEnvelope(world, proposed);
  const refs: string[] = [];
  for (const field of ["state", "position", "holderId", "guardedBy", "visible"] as const) {
    if (JSON.stringify(world.envelope[field]) === JSON.stringify(next[field])) continue;
    refs.push(recorder.record(`envelope.${field}`, world.envelope[field], next[field], ruleId, cause, { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...refs] }, () => { (world.envelope[field] as EnvelopeState[typeof field]) = next[field] as EnvelopeState[typeof field]; }));
  }
  return refs;
}

export const objectInvariantIssues = (world: WorldStateV3): string[] => {
  const issues: string[] = [];
  const object = world.envelope;
  if (object.holderId && object.position !== world.actors[object.holderId].position) issues.push("Held object position is stale.");
  if (object.state === "LOCKED_AWAY" && (object.holderId || object.guardedBy || object.visible)) issues.push("Locked-away object retains ordinary control fields.");
  if (object.state === "SECURED" && !object.holderId) issues.push("Secured object lacks a holder.");
  if (object.state === "HELD" && !object.holderId) issues.push("Held object lacks a holder.");
  if (object.guardedBy && (!world.actors[object.guardedBy].active || world.actors[object.guardedBy].position !== object.position || object.guardedBy === object.holderId)) issues.push("Guard relation is not an intentional reachable contest.");
  return issues;
};

const isGuardEnforceable = (world: WorldStateV3, takerId: ActorId): boolean => {
  const guardId = world.envelope.guardedBy;
  if (!guardId || guardId === takerId) return false;
  const guard = world.actors[guardId];
  return guard.active && guard.position === world.envelope.position && guard.guardCompromisedUntilBeat !== world.beat;
};

function resolveMove(world: WorldStateV3, action: MoveAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const actor = world.actors[action.actorId];
  const base: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  if (!actor.active) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} cannot move after leaving the room.`);
  if (action.target.kind === "ACTOR" && !world.actors[action.target.id].active) return resolution(action, slot, "INVALIDATED", `${actorName(action.target.id)} is no longer in the room.`);
  const concreteTarget = action.target.kind === "LOCATION" ? action.target.id : world.actors[action.target.id].position;
  if (actor.position === concreteTarget) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} is already ${action.target.kind === "ACTOR" ? `with ${actorName(action.target.id)}` : roomAnchorLabels[concreteTarget]}.`);
  if (action.actorId === "PLAYER" && concreteTarget === "DOOR" && world.actors.DREW.drewTrajectory === "LOCKDOWN") return resolution(action, slot, "INVALIDATED", "Drew's visible position blocks the route to the door.", recorder.latestTraceFor("actors.DREW.drewTrajectory"));
  const next = nextStepToward(actor.position, concreteTarget);
  if (!next) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} has no legal route.`);
  const retargeted = action.target.kind === "ACTOR" && action.plannedTargetPosition !== concreteTarget;
  const status: ResolutionStatus = retargeted ? "NATURAL_RETARGET" : next === concreteTarget ? "NORMAL" : "DEGRADED";
  const context = { ...base, status };
  const refs: string[] = [];
  const position = setActorField(world, recorder, action.actorId, "position", next, "RULE_DISCRETE_MOVE_STEP", `MOVE advances one physical graph edge toward ${action.target.kind === "ACTOR" ? action.target.id : concreteTarget}.`, context);
  if (position) refs.push(position);
  if (world.envelope.holderId === action.actorId) {
    refs.push(...transitionEnvelope(world, recorder, { ...world.envelope, position: next }, "RULE_OBJECT_FOLLOWS_HOLDER", "A held object follows its holder, and unreachable guard relations end.", { ...context, sourceTraceRefs: refs }));
  }
  const targetLabel = action.target.kind === "ACTOR" ? actorName(action.target.id) : roomAnchorLabels[concreteTarget];
  const orientation = setActorField(world, recorder, action.actorId, "orientation", `oriented toward ${targetLabel}`, "RULE_MOVEMENT_IS_OBSERVABLE", "Movement and its apparent target remain visible social evidence.", { ...context, sourceTraceRefs: refs });
  if (orientation) refs.push(orientation);
  if (action.actorId === "PLAYER" && roomDistance(next, world.actors.MARA.position) === 0) {
    const relief = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", prototypeConfig.impacts.playerNearMaraRelief, "RULE_PLAYER_PROXIMITY_MARA", "Non-threatening proximity gives Mara a bounded reason to remain engaged.", { ...context, sourceTraceRefs: refs });
    if (relief) refs.push(relief);
  }
  if (action.actorId === "PLAYER" && roomDistance(next, world.actors.MARA.position) <= 1 && attentionIncludes(world.actors.DREW, "PLAYER", ["MARA"])) {
    const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", prototypeConfig.impacts.maraNearExitDrewConcern, "RULE_DREW_NOTICES_PLAYER_APPROACH", "Drew is attending to the player's approach.", { ...context, sourceTraceRefs: refs });
    if (concern) refs.push(concern);
    refs.push(...updateDrewTrajectory(world, recorder, "PLAYER_APPROACH", { ...context, sourceTraceRefs: refs }));
  }
  if (action.actorId === "MARA" && next === "DOOR") {
    const pressure = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", 1, "RULE_MARA_MOVES_TOWARD_EXIT", "Mara's movement makes the exit trajectory more immediate.", { ...context, sourceTraceRefs: refs });
    if (pressure) refs.push(pressure);
    refs.push(...updateMaraTrajectory(world, recorder, "MARA_AT_EXIT", { ...context, sourceTraceRefs: refs }));
  }
  const text = retargeted && action.target.kind === "ACTOR" ? `${actorName(action.actorId)} adjusted course and moved one step toward ${actorName(action.target.id)}'s new position.` : `${actorName(action.actorId)} moved ${roomAnchorLabels[next]}.`;
  recorder.history(world.beat, action.actorId, action.id, text, refs);
  return resolution(action, slot, status, text, refs);
}

const resetUnavailableComponent = (draft: MessageDraftV3, category: MessageComponentCategory) => {
  if (category === "refusalSpace") draft.refusalSpace = false;
  else (draft[category] as string) = "NONE";
};

function resolveMessage(world: WorldStateV3, action: MessageAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const sender = world.actors[action.actorId];
  const recipientId = action.message.intendedRecipients[0];
  const recipient = world.actors[recipientId];
  const base: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.message.id, status: "NORMAL" };
  if (!sender.active || !recipient?.active) return resolution(action, slot, "INVALIDATED", "The intended recipient is unavailable.");

  const plannedDraft = messageToDraft(action.message);
  const compatibility = validateMessageDraft(world, plannedDraft);
  if (compatibility.requiredMissing.length || compatibility.invalidReasons.some((reason) => reason.includes("not relevant"))) {
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)}'s committed message could no longer retain its essential meaning.`, []);
    return resolution(action, slot, "INVALIDATED", "Essential message support became unavailable.", [], [], null, compatibility);
  }
  const effectiveDraft = clone(plannedDraft);
  let status: ResolutionStatus = "NORMAL";
  const revalidationRefs: string[] = [];
  if (compatibility.unavailableComponents.length) {
    for (const category of compatibility.unavailableComponents) resetUnavailableComponent(effectiveDraft, category);
    status = "DEGRADED";
    revalidationRefs.push(recorder.record(`messageCompatibility.${action.message.id}`, action.message.components, createStructuredMessage(action.actorId, world.beat, effectiveDraft).components, "RULE_MESSAGE_SUPPORT_REVALIDATION", "Unavailable optional support is explicitly removed while core intent survives.", { ...base, status }, () => {}));
  }
  let delivery = effectiveDraft.deliveryMode;
  const distance = roomDistance(sender.position, recipient.position);
  if (delivery === "WHISPER" && distance > prototypeConfig.reception.whisperDirectMaxDistance) { delivery = distance > 2 ? "NORMAL" : "LOW_VOICE"; status = "DEGRADED"; }
  else if (delivery === "LOW_VOICE" && distance > prototypeConfig.reception.lowVoiceDirectMaxDistance) { delivery = "NORMAL"; status = "DEGRADED"; }
  effectiveDraft.deliveryMode = delivery;
  const effectiveMessage = { ...createStructuredMessage(action.actorId, world.beat, effectiveDraft), id: action.message.id, packagingEvidence: derivePackagingEvidence(effectiveDraft), surfaceText: renderMessage(effectiveDraft) };
  const context = { ...base, status, sourceTraceRefs: revalidationRefs };
  const messageTrace = recorder.record(`messages.${effectiveMessage.id}`, null, effectiveMessage, "RULE_STRUCTURED_MESSAGE_EVENT", "Planned identity and any explicit resolution degradation remain inspectable.", context, () => world.messages.push(effectiveMessage));
  const receptions: ReceptionRecord[] = [];
  for (const actorId of actorIds) {
    if (actorId === action.actorId) continue;
    receptions.push(recordReception(world, recorder, effectiveMessage, actorId, resolveObserverReception(world, effectiveMessage, actorId, delivery), delivery, { ...context, sourceTraceRefs: [...revalidationRefs, messageTrace] }));
  }
  const direct = receptions.find((item) => item.actorId === recipientId);
  if (direct?.kind !== "DIRECT") status = status === "NORMAL" ? "DEGRADED" : status;
  const refs = [messageTrace, ...receptions.flatMap((item) => item.sourceTraceRefs)];
  if (direct?.kind === "DIRECT") {
    const attention = setActorField(world, recorder, recipientId, "attention", { kind: "ACTOR", id: action.actorId }, "RULE_DIRECT_MESSAGE_ATTENTION", "Direct reception turns the recipient toward the speaker.", { ...context, status, reception: "DIRECT", sourceTraceRefs: refs });
    if (attention) refs.push(attention);
    const gaze = setActorField(world, recorder, recipientId, "gaze", actorName(action.actorId), "RULE_DIRECT_MESSAGE_TABLEAU", "Gaze exposes direct reception.", { ...context, status, reception: "DIRECT", sourceTraceRefs: refs });
    if (gaze) refs.push(gaze);
  }
  if (action.actorId === "DREW" && recipientId === "PLAYER" && effectiveMessage.coreContentId === "REPORT_DANGER" && world.actors.DREW.drewTrajectory === "LOCKDOWN" && world.actors.DREW.drewConcern >= prototypeConfig.failThresholds.drewEject) {
    const eject = setActorField(world, recorder, "DREW", "drewTrajectory", "EJECT", "RULE_DREW_EJECTS_THROUGH_MESSAGE", "Drew's accumulated concern and lockdown combine with an ordinary warning.", { ...context, status, reception: direct?.kind ?? null, sourceTraceRefs: refs });
    if (eject) refs.push(eject);
    const player = setActorField(world, recorder, "PLAYER", "active", false, "RULE_DREW_EJECTS_THROUGH_MESSAGE", "Drew's resolved message ends the player's access to the room.", { ...context, status, reception: direct?.kind ?? null, sourceTraceRefs: refs });
    if (player) refs.push(player);
  }
  const drewReception = receptions.find((item) => item.actorId === "DREW");
  if (action.actorId !== "DREW" && drewReception && drewReception.kind !== "NONE") {
    const envelopeRelevant = ["ASK_FOR_ENVELOPE", "SHARE_AUTHORIZATION", "REQUEST_PRIVACY"].includes(effectiveMessage.coreContentId);
    const secrecyOnly = drewReception.kind === "NOTICED_ONLY";
    if (envelopeRelevant || secrecyOnly) {
      const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", secrecyOnly ? prototypeConfig.impacts.noticedSecrecyDrewConcern : prototypeConfig.impacts.envelopeMentionDrewConcern, secrecyOnly ? "RULE_NOTICED_SECRECY_DREW" : "RULE_ENVELOPE_MESSAGE_DREW", secrecyOnly ? "Drew noticed secret communication without its content." : "Drew received envelope-relevant communication.", { ...context, status, reception: drewReception.kind, sourceTraceRefs: refs });
      if (concern) refs.push(concern);
      refs.push(...updateDrewTrajectory(world, recorder, drewReception.kind === "OVERHEARD_PARTIAL" || secrecyOnly ? "SECRECY_LEAK" : "MESSAGE_RECEIVED", { ...context, status, reception: drewReception.kind, sourceTraceRefs: refs }));
    }
  }
  const maraReception = receptions.find((item) => item.actorId === "MARA");
  if (action.actorId !== "MARA" && maraReception && ["DIRECT", "OVERHEARD_FULL", "OVERHEARD_PARTIAL"].includes(maraReception.kind)) {
    if (effectiveMessage.components.warningId !== "NONE" || effectiveMessage.components.directness === "BLUNT") {
      const pressure = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", prototypeConfig.impacts.bluntWarningMaraPressure, "RULE_CONTEXTUAL_PACKAGING_MARA", "Mara reacts to warning/blunt packaging; no emotion is inferred.", { ...context, status, reception: maraReception.kind, sourceTraceRefs: refs });
      if (pressure) refs.push(pressure);
      refs.push(...updateMaraTrajectory(world, recorder, "BLUNT_WARNING", { ...context, status, reception: maraReception.kind, sourceTraceRefs: refs }));
    }
  }
  const deliveryPhrase = delivery === "WHISPER" ? "whispered" : delivery === "LOW_VOICE" ? "spoke quietly" : "said";
  const changed = status === "DEGRADED" ? " The committed delivery or support degraded before resolution." : "";
  recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} ${deliveryPhrase} to ${actorName(recipientId)}: “${effectiveMessage.surfaceText}”${changed}`, refs);
  for (const heard of receptions.filter((item) => item.actorId !== recipientId && item.kind !== "NONE")) {
    const evidence = heard.kind === "OVERHEARD_PARTIAL" ? heard.fragment : heard.kind === "NOTICED_ONLY" ? "the communication, but not its content" : heard.content;
    recorder.history(world.beat, heard.actorId, action.id, `${actorName(heard.actorId)} ${heard.kind === "NOTICED_ONLY" ? "noticed" : "overheard"} ${evidence ?? "the exchange"}.`, heard.sourceTraceRefs);
  }
  return resolution(action, slot, status, direct?.kind === "NONE" ? "The message was spoken but could not reach its intended recipient." : status === "DEGRADED" ? "Message resolved with explicit degradation." : "Message resolved through actor-specific reception.", refs, receptions.map((item) => item.id), null, compatibility);
}

const observationEvidence = (world: WorldStateV3, action: ScanAction): string[] => {
  if (action.targetType === "ROOM") return [`Mara is ${roomAnchorLabels[world.actors.MARA.position]}; Drew is ${roomAnchorLabels[world.actors.DREW.position]}.`, `${world.currentRoomEvent.title} currently shapes the room.`, world.room.doorOpen ? "The door stands open to the hall." : "The door remains mostly closed."];
  if (action.targetType === "OBJECT") return [`The envelope is ${world.envelope.state.toLowerCase().replaceAll("_", " ")} ${roomAnchorLabels[world.envelope.position]}.`, world.envelope.holderId ? `${actorName(world.envelope.holderId)} has it in hand.` : world.envelope.guardedBy ? `${actorName(world.envelope.guardedBy)} keeps a hand close to it.` : "No one is holding it.", world.room.envelopeAccessRevealed ? "Its exposed seal can be read without closing the full distance." : "Papers partly obscure its seal."];
  const target = world.actors[action.targetId as ActorId];
  return [`${target.name} is ${roomAnchorLabels[target.position]}, looking toward ${target.gaze}.`, `${target.posture}; ${target.hands}.`, `${target.orientation}; their face appears ${target.face.toLowerCase()}.`];
};

function resolveScan(world: WorldStateV3, action: ScanAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const actor = world.actors[action.actorId];
  const context: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  if (!actor.active) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} cannot Scan after leaving.`);
  const evidence = observationEvidence(world, action);
  const observation: ObservationRecord = { id: `OBS_B${world.beat}_${action.actorId}_${action.ordinal}`, beat: world.beat, actorId: action.actorId, target: String(action.targetId), evidence, sourceActionId: action.id };
  const trace = recorder.record(`actors.${action.actorId}.observations.${observation.id}`, null, observation, "RULE_SCAN_OBSERVABLE_EVIDENCE", "SCAN records richer observable evidence without exposing hidden trajectory labels.", context, () => actor.observations.push(observation));
  const refs = [trace];
  const attentionTarget = action.targetType === "ACTOR" ? { kind: "ACTOR" as const, id: action.targetId } : action.targetType === "OBJECT" ? { kind: "OBJECT" as const, id: action.targetId } : { kind: "LOCATION" as const, id: "CENTER" };
  const attention = setActorField(world, recorder, action.actorId, "attention", attentionTarget, "RULE_SCAN_DIRECTS_ATTENTION", "Scanning directs attention toward observable evidence.", { ...context, sourceTraceRefs: refs });
  if (attention) refs.push(attention);
  const gaze = setActorField(world, recorder, action.actorId, "gaze", action.targetType === "ACTOR" ? actorName(action.targetId as ActorId) : String(action.targetId).toLowerCase(), "RULE_SCAN_TABLEAU", "Gaze makes the Scan target visible.", { ...context, sourceTraceRefs: refs });
  if (gaze) refs.push(gaze);
  if (action.actorId === "DREW" && action.targetId === "MARA" && world.actors.MARA.position === "DOOR") {
    const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", prototypeConfig.impacts.maraNearExitDrewConcern, "RULE_DREW_SCANS_MARA_AT_EXIT", "Drew's Scan observes Mara at the exit.", { ...context, sourceTraceRefs: refs });
    if (concern) refs.push(concern);
    refs.push(...updateDrewTrajectory(world, recorder, "MARA_AT_EXIT", { ...context, sourceTraceRefs: refs }));
  }
  recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} scanned ${action.targetType === "ROOM" ? "the room" : action.targetId === "ENVELOPE" ? "the envelope" : actorName(action.targetId as ActorId)}. ${evidence.join(" ")}`, refs);
  return resolution(action, slot, "NORMAL", evidence.join(" "), refs);
}

function applyObservedExploit(world: WorldStateV3, recorder: MutationRecorderV3, context: MutationContext, refs: string[]): void {
  for (const observerId of ["MARA", "DREW"] as NpcId[]) {
    const actor = world.actors[observerId];
    const index = actor.distractionBeliefs.findIndex((belief) => belief.beat === world.beat && belief.success && !belief.exploited && ["DIRECT", "LIKELY"].includes(belief.attribution));
    if (index < 0) continue;
    const nextBeliefs = clone(actor.distractionBeliefs);
    nextBeliefs[index].exploited = true;
    const beliefTrace = setActorField(world, recorder, observerId, "distractionBeliefs", nextBeliefs, "RULE_OBSERVED_DISTRACTION_EXPLOIT", "The observer connects an attributable distraction with the player's visible exploitation.", { ...context, attribution: nextBeliefs[index].attribution, sourceTraceRefs: refs });
    if (beliefTrace) refs.push(beliefTrace);
    const attention = setActorField(world, recorder, observerId, "attention", { kind: "ACTOR", id: "PLAYER" }, "RULE_OBSERVED_EXPLOIT_VIGILANCE", "Observed exploitation focuses later attention on the player.", { ...context, attribution: nextBeliefs[index].attribution, sourceTraceRefs: refs });
    if (attention) refs.push(attention);
    if (observerId === "DREW") {
      const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", prototypeConfig.impacts.observedExploitConcern, "RULE_OBSERVED_EXPLOIT_CONCERN", "Drew saw enough to connect manipulation with object access.", { ...context, attribution: nextBeliefs[index].attribution, sourceTraceRefs: refs });
      if (concern) refs.push(concern);
      refs.push(...updateDrewTrajectory(world, recorder, "OBSERVED_EXPLOIT", { ...context, sourceTraceRefs: refs }));
    }
  }
}

function resolveInteract(world: WorldStateV3, action: InteractAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const actor = world.actors[action.actorId];
  const context: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  const unavailable = (summary: string, paths: string[] = []) => { const refs = paths.flatMap((path) => recorder.latestTraceFor(path)); recorder.history(world.beat, action.actorId, action.id, `${summary} The committed AP is not refunded.`, refs); return resolution(action, slot, "INVALIDATED", summary, refs); };
  if (!actor.active) return unavailable(`${actorName(action.actorId)} is no longer available to Interact.`);
  if (action.operation === "LEAVE") {
    if (actor.position !== "DOOR") return unavailable(`${actorName(action.actorId)} cannot leave without reaching the door.`);
    const active = setActorField(world, recorder, action.actorId, "active", false, "RULE_EXIT_INTERACTION", `${actorName(action.actorId)} uses the door from its physical anchor.`, context);
    const refs = active ? [active] : [];
    if (action.actorId === "MARA") { const trajectory = setActorField(world, recorder, "MARA", "maraTrajectory", "FLEE", "RULE_MARA_LEAVES_ROOM", "Mara's ordinary LEAVE action manifests hard failure.", { ...context, sourceTraceRefs: refs }); if (trajectory) refs.push(trajectory); }
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} left through the door.`, refs);
    return resolution(action, slot, "NORMAL", `${actorName(action.actorId)} left the room.`, refs);
  }
  if (action.targetId !== "ENVELOPE") return unavailable("That interaction has no current affordance.");
  const distance = roomDistance(actor.position, world.envelope.position);
  const withinReach = distance === 0;
  if (action.operation === "INSPECT") {
    const inspectRange = world.room.envelopeAccessRevealed ? 2 : 1;
    if (!world.envelope.visible || distance > inspectRange) return unavailable(`${actorName(action.actorId)} cannot inspect the envelope from here.`);
    const evidence = `The envelope is ${world.envelope.state.toLowerCase().replaceAll("_", " ")}; its seal is intact.`;
    const observation: ObservationRecord = { id: `OBS_B${world.beat}_${action.actorId}_ENVELOPE_${action.ordinal}`, beat: world.beat, actorId: action.actorId, target: "ENVELOPE", evidence: [evidence], sourceActionId: action.id };
    const trace = recorder.record(`actors.${action.actorId}.observations.${observation.id}`, null, observation, "RULE_INTERACT_INSPECT_EVIDENCE", "Inspecting records observable object evidence.", context, () => actor.observations.push(observation));
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} inspected the envelope. ${evidence}`, [trace]);
    return resolution(action, slot, action.plannedTargetPosition !== world.envelope.position ? "NATURAL_RETARGET" : "NORMAL", evidence, [trace]);
  }
  if (action.operation === "TAKE") {
    if (!withinReach || world.envelope.state === "SECURED" || world.envelope.state === "LOCKED_AWAY" || world.envelope.holderId || isGuardEnforceable(world, action.actorId)) return unavailable(`${actorName(action.actorId)} cannot take the envelope because access is no longer available.`);
    const refs = transitionEnvelope(world, recorder, { ...world.envelope, state: "HELD", holderId: action.actorId }, "RULE_OBJECT_TAKE", "A reachable envelope can be taken only when no enforceable guard blocks access.", context);
    const hands = setActorField(world, recorder, action.actorId, "hands", "holding the envelope", "RULE_OBJECT_TABLEAU", "Hand state makes possession visible.", { ...context, sourceTraceRefs: refs });
    if (hands) refs.push(hands);
    if (action.actorId === "PLAYER") {
      applyObservedExploit(world, recorder, context, refs);
      const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", 2, "RULE_PLAYER_TOUCHES_ENVELOPE", "The player takes the protected object.", { ...context, sourceTraceRefs: refs });
      if (concern) refs.push(concern);
      refs.push(...updateDrewTrajectory(world, recorder, "PLAYER_TOUCH_ENVELOPE", { ...context, sourceTraceRefs: refs }));
    }
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} took the envelope.`, refs);
    return resolution(action, slot, action.plannedTargetPosition !== world.envelope.position ? "NATURAL_RETARGET" : "NORMAL", `${actorName(action.actorId)} now holds the envelope.`, refs);
  }
  if (action.operation === "PLACE_ON_TABLE") {
    if (world.envelope.holderId !== action.actorId) return unavailable(`${actorName(action.actorId)} cannot place an envelope they do not hold.`);
    const refs = transitionEnvelope(world, recorder, { ...world.envelope, state: "MOVED", holderId: null, position: "TABLE" }, "RULE_OBJECT_PLACE", "Placing releases possession and resolves remaining reachable guard relations coherently.", context);
    const hands = setActorField(world, recorder, action.actorId, "hands", "visible and free", "RULE_OBJECT_TABLEAU", "Hand state shows that possession ended.", { ...context, sourceTraceRefs: refs });
    if (hands) refs.push(hands);
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} placed the envelope on the table.`, refs);
    return resolution(action, slot, "NORMAL", "The envelope is on the table.", refs);
  }
  if (action.operation === "GUARD") {
    if (!withinReach || world.envelope.state === "LOCKED_AWAY" || world.envelope.guardedBy && world.envelope.guardedBy !== action.actorId) return unavailable(`${actorName(action.actorId)} cannot establish a guard from here.`);
    const refs = transitionEnvelope(world, recorder, { ...world.envelope, state: world.envelope.holderId ? world.envelope.state : "GUARDED", guardedBy: action.actorId }, "RULE_OBJECT_GUARD", "A nearby actor establishes an intentional, reachable guard or contest relation.", context);
    const hands = setActorField(world, recorder, action.actorId, "hands", "one hand braced beside the envelope", "RULE_OBJECT_TABLEAU", "Guarding becomes visible through hand state.", { ...context, sourceTraceRefs: refs });
    if (hands) refs.push(hands);
    if (action.actorId === "DREW") {
      refs.push(...updateDrewTrajectory(world, recorder, "GUARD_ACTION", { ...context, sourceTraceRefs: refs }));
      const pressure = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", prototypeConfig.impacts.drewGuardingMaraPressure, "RULE_MARA_SEES_DREW_GUARD", "Drew's visible guarding makes Mara less willing to remain.", { ...context, sourceTraceRefs: refs });
      if (pressure) refs.push(pressure);
      refs.push(...updateMaraTrajectory(world, recorder, "DREW_BLOCKING", { ...context, sourceTraceRefs: refs }));
    }
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} braces a hand beside the envelope.`, refs);
    return resolution(action, slot, "NORMAL", "The envelope is actively guarded.", refs);
  }
  if (action.operation === "SECURE") {
    const controls = world.envelope.guardedBy === action.actorId || world.envelope.holderId === action.actorId;
    if (!withinReach || !controls) return unavailable(`${actorName(action.actorId)} cannot secure the envelope without controlling it.`);
    const refs = transitionEnvelope(world, recorder, { ...world.envelope, state: "SECURED", holderId: action.actorId, guardedBy: world.envelope.guardedBy === action.actorId ? null : world.envelope.guardedBy }, "RULE_OBJECT_SECURE", "A controlling actor converts ordinary control into secured possession.", context);
    const hands = setActorField(world, recorder, action.actorId, "hands", "holding the envelope tight against their body", "RULE_OBJECT_TABLEAU", "Secured possession is directly observable.", { ...context, sourceTraceRefs: refs });
    if (hands) refs.push(hands);
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} secured the envelope against their body.`, refs);
    return resolution(action, slot, "NORMAL", "The envelope is secured.", refs);
  }
  if (action.operation === "LOCK_AWAY") {
    if (action.actorId !== "DREW" || world.envelope.state !== "SECURED" || world.envelope.holderId !== "DREW" || roomDistance(actor.position, "CABINET") > 1) return unavailable("The envelope cannot be locked away from the current state.");
    const refs = transitionEnvelope(world, recorder, { ...world.envelope, state: "LOCKED_AWAY" }, "RULE_OBJECT_LOCK_AWAY", "Drew uses his scenario-specific cabinet affordance; ordinary holder and guard relations end.", context);
    const hands = setActorField(world, recorder, "DREW", "hands", "empty after closing the cabinet", "RULE_OBJECT_TABLEAU", "Drew's hands show that the object is no longer held.", { ...context, sourceTraceRefs: refs });
    if (hands) refs.push(hands);
    recorder.history(world.beat, action.actorId, action.id, "Drew locked the envelope in the cabinet.", refs);
    return resolution(action, slot, "NORMAL", "Drew locked the envelope away.", refs);
  }
  return unavailable("That interaction is unavailable.");
}

function attributionForObserver(world: WorldStateV3, observerId: NpcId, action: DistractAction, success: boolean): Attribution {
  const observer = world.actors[observerId];
  if (!observer.active) return "NONE";
  const distance = roomDistance(observer.position, world.actors.PLAYER.position);
  const watchingPlayer = observer.attention.kind === "ACTOR" && observer.attention.id === "PLAYER";
  const watchingWindow = observer.attention.kind === "LOCATION" && observer.attention.id === "WINDOW";
  if (action.mode === "VISIBLE_CALL") {
    if (observerId === action.targetActorId || watchingPlayer) return "DIRECT";
    if (distance <= 1) return "LIKELY";
    if (distance <= 2) return "POSSIBLE";
    return "NONE";
  }
  if (watchingPlayer || watchingWindow) return success && distance === 0 ? "DIRECT" : "LIKELY";
  if (success && distance === 0) return "POSSIBLE";
  return "NONE";
}

function resolveDistract(world: WorldStateV3, action: DistractAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const target = world.actors[action.targetActorId];
  const context: MutationContext = { beat: world.beat, slot, actorId: "PLAYER", actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  if (!target.active) return resolution(action, slot, "INVALIDATED", `${target.name} is unavailable to distract.`);
  const success = action.mode === "VISIBLE_CALL" || world.actors.PLAYER.position === prototypeConfig.distraction.covertRequiredAnchor;
  const attributionByObserver = Object.fromEntries((["MARA", "DREW"] as NpcId[]).map((id) => [id, attributionForObserver(world, id, action, success)])) as Record<NpcId, Attribution>;
  const targetAttribution = attributionByObserver[action.targetActorId];
  const outcome: DistractionOutcome = { success, eventVisible: success, playerActionVisible: targetAttribution !== "NONE", causalVisibility: ["DIRECT", "LIKELY"].includes(targetAttribution), attributionByObserver };
  const status: ResolutionStatus = success ? "NORMAL" : "INVALIDATED";
  const visibility = `event:${outcome.eventVisible};action:${outcome.playerActionVisible};cause:${outcome.causalVisibility}`;
  const refs: string[] = [];
  if (success) {
    const attention = setActorField(world, recorder, action.targetActorId, "attention", action.mode === "VISIBLE_CALL" ? { kind: "ACTOR", id: "PLAYER" } : { kind: "LOCATION", id: "WINDOW" }, "RULE_DISTRACTION_ATTENTION_EFFECT", "Distraction success changes attention independently from attribution.", { ...context, status, visibility, attribution: targetAttribution });
    if (attention) refs.push(attention);
    const gaze = setActorField(world, recorder, action.targetActorId, "gaze", action.mode === "VISIBLE_CALL" ? "Player" : "the window", "RULE_DISTRACTION_TABLEAU", "Gaze exposes the attention effect.", { ...context, status, visibility, attribution: targetAttribution, sourceTraceRefs: refs });
    if (gaze) refs.push(gaze);
    const compromised = setActorField(world, recorder, action.targetActorId, "guardCompromisedUntilBeat", world.beat, "RULE_DISTRACTION_GUARD_OPENING", "A successful distraction compromises guard enforcement for this Beat.", { ...context, status, visibility, attribution: targetAttribution, sourceTraceRefs: refs });
    if (compromised) refs.push(compromised);
  }
  for (const observerId of ["MARA", "DREW"] as NpcId[]) {
    const attribution = attributionByObserver[observerId];
    if (attribution === "NONE") continue;
    const belief: DistractionBelief = { actionId: action.id, beat: world.beat, targetActorId: action.targetActorId, success, attribution, exploited: false };
    const beliefs = setActorField(world, recorder, observerId, "distractionBeliefs", [...world.actors[observerId].distractionBeliefs, belief], "RULE_OBSERVER_RELATIVE_ATTRIBUTION", "Each observer independently attributes the player-caused event from available evidence.", { ...context, status, visibility, attribution, sourceTraceRefs: refs });
    if (beliefs) refs.push(beliefs);
    const vigilanceAmount = attribution === "DIRECT" ? prototypeConfig.impacts.directManipulationVigilance : attribution === "LIKELY" ? prototypeConfig.impacts.likelyManipulationVigilance : prototypeConfig.impacts.possibleManipulationVigilance;
    const vigilance = incrementActorMetric(world, recorder, observerId, "vigilance", vigilanceAmount, "RULE_ATTRIBUTION_FUTURE_VIGILANCE", "Attributable manipulation changes later attention and planning without becoming a generic punishment meter.", { ...context, status, visibility, attribution, sourceTraceRefs: refs });
    if (vigilance) refs.push(vigilance);
    if (observerId === "DREW" && ["DIRECT", "LIKELY"].includes(attribution)) {
      const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", 1, "RULE_ATTRIBUTABLE_MANIPULATION_CONCERN", "Drew treats attributable manipulation as scenario-relevant.", { ...context, status, visibility, attribution, sourceTraceRefs: refs });
      if (concern) refs.push(concern);
      refs.push(...updateDrewTrajectory(world, recorder, "ATTRIBUTABLE_DISTRACTION", { ...context, status, sourceTraceRefs: refs }));
    }
  }
  const text = success ? action.mode === "VISIBLE_CALL" ? `You called ${target.name}'s attention directly. The opening worked, and ${target.name} saw you create it.` : `A rattle at the window pulled ${target.name}'s gaze away.` : "The window trick failed to create an opening.";
  recorder.history(world.beat, "PLAYER", action.id, text, refs);
  return resolution(action, slot, status, text, refs, [], outcome);
}

function resolution(action: PlannedAction, slot: number, status: ResolutionStatus, summary: string, sourceTraceRefs: string[] = [], receptionIds: string[] = [], distraction: DistractionOutcome | null = null, messageCompatibility: MessageCompatibilityResult | null = null): ActionResolution {
  return { id: `RESOLUTION_${action.id}`, beat: action.beat, slot, actorId: action.actorId, actionId: action.id, actionKind: action.kind, status, summary, apSpent: 1, sourceTraceRefs, receptionIds, distraction, messageCompatibility };
}

function resolveAction(world: WorldStateV3, action: PlannedAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  if (action.kind === "MOVE") return resolveMove(world, action, recorder, slot);
  if (action.kind === "MESSAGE") return resolveMessage(world, action, recorder, slot);
  if (action.kind === "SCAN") return resolveScan(world, action, recorder, slot);
  if (action.kind === "INTERACT") return resolveInteract(world, action, recorder, slot);
  return resolveDistract(world, action, recorder, slot);
}

const npcDraft = (recipientId: ActorId, coreContentId: MessageDraftV3["coreContentId"], deliveryMode: DeliveryMode = "NORMAL", overrides: Partial<MessageDraftV3> = {}): MessageDraftV3 => ({ ...defaultPlayerMessageDraft(), recipientId, coreContentId, deliveryMode, ...overrides });

interface PlannerCandidate {
  label: string;
  goal: keyof NpcPriorityWeights;
  reason: string;
  make: (ordinal: number) => PlannedAction;
}

function actionCurrentlyLegal(world: WorldStateV3, action: PlannedAction): boolean {
  if (!world.actors[action.actorId].active) return false;
  if (action.kind === "MOVE") {
    const target = action.target.kind === "LOCATION" ? action.target.id : world.actors[action.target.id].active ? world.actors[action.target.id].position : null;
    return Boolean(target && target !== world.actors[action.actorId].position && nextStepToward(world.actors[action.actorId].position, target));
  }
  if (action.kind === "MESSAGE") return validateMessageDraft(world, messageToDraft(action.message)).valid && world.actors[action.message.intendedRecipients[0]].active;
  if (action.kind === "INTERACT") {
    if (action.operation === "LEAVE") return world.actors[action.actorId].position === "DOOR";
    const distance = roomDistance(world.actors[action.actorId].position, world.envelope.position);
    if (action.operation === "INSPECT") return world.envelope.visible && distance <= (world.room.envelopeAccessRevealed ? 2 : 1);
    if (action.operation === "TAKE") return distance === 0 && !world.envelope.holderId && !["SECURED", "LOCKED_AWAY"].includes(world.envelope.state) && !isGuardEnforceable(world, action.actorId);
    if (action.operation === "GUARD") return distance === 0 && world.envelope.state !== "LOCKED_AWAY";
    if (action.operation === "SECURE") return distance === 0 && (world.envelope.holderId === action.actorId || world.envelope.guardedBy === action.actorId);
    if (action.operation === "LOCK_AWAY") return action.actorId === "DREW" && world.envelope.state === "SECURED" && world.envelope.holderId === "DREW" && roomDistance(world.actors.DREW.position, "CABINET") <= 1;
    return world.envelope.holderId === action.actorId;
  }
  return true;
}

export function planNpcFromBeatStart(world: WorldStateV3, actorId: NpcId, weightOverrides: Partial<NpcPriorityWeights> = {}): ActorPlan {
  const plan = createEmptyPlan(world, actorId);
  if (!world.actors[actorId].active) return plan;
  const weights: NpcPriorityWeights = { ...prototypeConfig.npcPriorityWeights, ...weightOverrides };
  const candidates: PlannerCandidate[] = [];
  let hardConstraint: PlannerCandidate | null = null;
  if (actorId === "MARA") {
    const mara = world.actors.MARA;
    const exitAction = (ordinal: number) => mara.position === "DOOR" && ["READY_TO_LEAVE", "FLEE"].includes(mara.maraTrajectory ?? "") ? makeInteractAction(world, "MARA", "DOOR", "LEAVE", ordinal) : makeMoveAction(world, "MARA", "DOOR", ordinal);
    if (["NEAR_EXIT", "READY_TO_LEAVE", "FLEE"].includes(mara.maraTrajectory ?? "ENGAGED")) hardConstraint = { label: "preserve access to exit", goal: "preserveExit", reason: "Mara's current trajectory makes the exit mandatory.", make: exitAction };
    candidates.push(
      { label: "preserve access to exit", goal: "preserveExit", reason: "Keep a viable route to the door.", make: exitAction },
      { label: "read Drew", goal: "seekInformation", reason: "Observe Drew's directly visible behavior.", make: (ordinal) => makeScanAction(world, "MARA", "ACTOR", "DREW", ordinal) },
      { label: "ask player intentions", goal: "communicateConcern", reason: "Seek an explicit account from the player.", make: (ordinal) => makeMessageAction(world, "MARA", npcDraft("PLAYER", "ASK_INTENTIONS", "LOW_VOICE"), ordinal) },
      { label: "approach player", goal: "approachOrAvoid", reason: "Adjust social distance from the player.", make: (ordinal) => makeMoveAction(world, "MARA", "PLAYER", ordinal) },
    );
  } else {
    const drew = world.actors.DREW;
    const protect = (ordinal: number): PlannedAction => world.envelope.state === "SECURED" ? makeInteractAction(world, "DREW", "ENVELOPE", "LOCK_AWAY", ordinal) : roomDistance(drew.position, world.envelope.position) > 0 ? makeMoveAction(world, "DREW", world.envelope.position, ordinal) : makeInteractAction(world, "DREW", "ENVELOPE", world.envelope.state === "GUARDED" || world.envelope.holderId === "DREW" ? "SECURE" : "GUARD", ordinal);
    if (["SECURING", "LOCKDOWN", "EJECT"].includes(drew.drewTrajectory ?? "NORMAL")) hardConstraint = { label: "protect the envelope", goal: "protectEnvelope", reason: "Drew's current trajectory mandates object protection.", make: protect };
    candidates.push(
      { label: "protect the envelope", goal: "protectEnvelope", reason: "Maintain physical control of the envelope.", make: protect },
      { label: drew.vigilance > 0 ? "watch the player" : "scan the room", goal: "seekInformation", reason: drew.vigilance > 0 ? "Prior attributable manipulation redirects observation toward the player." : "Build evidence from the room.", make: (ordinal) => makeScanAction(world, "DREW", drew.vigilance > 0 ? "ACTOR" : "ROOM", drew.vigilance > 0 ? "PLAYER" : "ROOM", ordinal) },
      { label: drew.drewTrajectory === "LOCKDOWN" ? "warn the player" : "question Mara", goal: "communicateConcern", reason: drew.drewTrajectory === "LOCKDOWN" ? "Make the visible lockdown warning explicit to the player." : "Ask Mara for her intended next move.", make: (ordinal) => drew.drewTrajectory === "LOCKDOWN" ? makeMessageAction(world, "DREW", npcDraft("PLAYER", "REPORT_DANGER", "NORMAL", { directness: "BLUNT", warningId: "ENVELOPE_MAY_BE_LOST", refusalSpace: false }), ordinal) : makeMessageAction(world, "DREW", npcDraft("MARA", "ASK_INTENTIONS", "LOW_VOICE"), ordinal) },
      { label: "approach Mara", goal: "approachOrAvoid", reason: "Change physical relation to Mara.", make: (ordinal) => makeMoveAction(world, "DREW", "MARA", ordinal) },
    );
  }
  const rationale: PlannerCandidateRationale[] = [];
  const chosen: PlannerCandidate[] = [];
  if (hardConstraint && actionCurrentlyLegal(world, hardConstraint.make(1))) chosen.push(hardConstraint);
  const ranked = [...candidates].sort((left, right) => weights[right.goal] - weights[left.goal] || left.label.localeCompare(right.label));
  for (const candidate of ranked) {
    if (chosen.length >= prototypeConfig.apPerActor || chosen.some((item) => item.label === candidate.label)) continue;
    const action = candidate.make(chosen.length + 1);
    if (!actionCurrentlyLegal(world, action)) continue;
    if (action.kind === "MESSAGE" && chosen.some((item) => { const other = item.make(1); return other.kind === "MESSAGE" && other.message.intendedRecipients[0] === action.message.intendedRecipients[0]; })) continue;
    chosen.push(candidate);
  }
  const actions = chosen.map((candidate, index) => candidate.make(index + 1));
  for (const candidate of candidates) {
    const legal = actionCurrentlyLegal(world, candidate.make(1));
    rationale.push({ label: candidate.label, goal: candidate.goal, weight: weights[candidate.goal], legal, selected: chosen.some((item) => item.label === candidate.label), reason: candidate.reason });
  }
  const next: ActorPlan = { ...plan, actions, rationale: { actorId, hardConstraint: hardConstraint?.reason ?? null, candidates: rationale } };
  const validation = validatePlan(world, next);
  if (!validation.legal) throw new Error(`NPC planner produced an illegal ${actorId} plan: ${validation.issues.join(" ")}`);
  return next;
}

function terminalCandidate(world: WorldStateV3, includeTurnLimit = false): Omit<TerminalStateV3, "sourceTraceRefs"> | null {
  if (!world.actors.MARA.active && world.actors.MARA.maraTrajectory === "FLEE") return { kind: "MARA_FLED", beat: world.beat, explanation: "Mara's visible exit trajectory culminated in a legal LEAVE action." };
  if (world.actors.DREW.drewTrajectory === "EJECT") return { kind: "PLAYER_EJECTED", beat: world.beat, explanation: "Drew's visible escalation culminated in an ordinary warning that ended the player's access." };
  if (world.envelope.state === "LOCKED_AWAY") return { kind: "ENVELOPE_SECURED", beat: world.beat, explanation: "Drew completed the guard, secure, and lock-away object trajectory." };
  if (includeTurnLimit && world.beat >= world.maxBeats) return { kind: "TURN_LIMIT", beat: world.beat, explanation: "The bounded eight-Beat prototype ended." };
  return null;
}

function applyTerminal(world: WorldStateV3, recorder: MutationRecorderV3, context: MutationContext, actionRefs: string[], includeTurnLimit = false): void {
  if (world.terminal) return;
  const candidate = terminalCandidate(world, includeTurnLimit);
  if (!candidate) return;
  const sourceTraceRefs = [...actionRefs];
  const terminal: TerminalStateV3 = { ...candidate, sourceTraceRefs };
  recorder.record("terminal", null, terminal, "RULE_TERMINAL_STATE_PROVENANCE", "Terminal state is created at mutation time from the exact resolving action and source traces.", { ...context, sourceTraceRefs }, () => { world.terminal = terminal; });
}

const cancelByTerminal = (world: WorldStateV3, recorder: MutationRecorderV3, action: PlannedAction, slot: number): ActionResolution => {
  const result = resolution(action, slot, "CANCELLED_BY_TERMINAL", `Committed action cancelled because ${world.terminal?.kind ?? "the scenario"} had already ended the encounter.`, world.terminal?.sourceTraceRefs ?? []);
  const context: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: world.terminal?.kind ?? "TERMINAL", status: "CANCELLED_BY_TERMINAL", sourceTraceRefs: world.terminal?.sourceTraceRefs ?? [] };
  const trace = recorder.record(`actionCancellations.${action.id}`, null, result.summary, "RULE_TERMINAL_CANCELS_LATER_COMMITMENT", "The action remains historically AP-committed but does not execute after terminal state.", context, () => {});
  result.sourceTraceRefs.push(trace);
  recorder.history(world.beat, action.actorId, action.id, result.summary, result.sourceTraceRefs);
  return result;
};

export interface ResolveBeatOptions { npcPlans?: Partial<Record<NpcId, ActorPlan>>; }

export function resolveBeatV3(input: WorldStateV3, playerPlan: ActorPlan, options: ResolveBeatOptions = {}): WorldStateV3 {
  if (input.terminal) return clone(input);
  const playerValidation = validatePlan(input, playerPlan);
  if (!playerValidation.legal) throw new Error(`Illegal player plan: ${playerValidation.issues.join(" ")}`);
  const world = clone(input);
  const recorder = new MutationRecorderV3(world);
  const beatStart = clone(input);
  const plans: Record<ActorId, ActorPlan> = { PLAYER: clone(playerPlan), MARA: clone(options.npcPlans?.MARA ?? planNpcFromBeatStart(beatStart, "MARA")), DREW: clone(options.npcPlans?.DREW ?? planNpcFromBeatStart(beatStart, "DREW")) };
  for (const actorId of actorIds) {
    const validation = validatePlan(beatStart, plans[actorId]);
    if (!validation.legal) throw new Error(`Illegal ${actorId} plan: ${validation.issues.join(" ")}`);
    world.actors[actorId].apCommitted = validation.apCommitted;
  }
  world.lastPlans = clone(plans);
  world.lastResolutions = [];
  const initiative = prototypeConfig.initiativeRotation[(world.beat - 1) % prototypeConfig.initiativeRotation.length];
  for (let slotIndex = 0; slotIndex < prototypeConfig.apPerActor; slotIndex += 1) {
    const slot = slotIndex + 1;
    for (const actorId of initiative) {
      const action = plans[actorId].actions[slotIndex];
      if (!action) continue;
      if (world.terminal) { world.lastResolutions.push(cancelByTerminal(world, recorder, action, slot)); continue; }
      const result = resolveAction(world, action, recorder, slot);
      world.lastResolutions.push(result);
      applyTerminal(world, recorder, { beat: world.beat, slot, actorId, actionId: action.id, sourceEventId: action.id, status: result.status, sourceTraceRefs: result.sourceTraceRefs }, result.sourceTraceRefs);
    }
  }
  applyTerminal(world, recorder, { beat: world.beat, slot: 4, actorId: null, actionId: `END_B${world.beat}`, sourceEventId: `END_B${world.beat}`, status: "NORMAL" }, [], true);
  if (!world.terminal) {
    const priorBeat = world.beat;
    const context: MutationContext = { beat: priorBeat, slot: 4, actorId: null, actionId: `ADVANCE_B${priorBeat}`, sourceEventId: `ADVANCE_B${priorBeat}`, status: "NORMAL" };
    recorder.record("beat", priorBeat, priorBeat + 1, "RULE_ADVANCE_SHARED_BEAT", "All committed slots resolved before the next tableau.", context, () => { world.beat = priorBeat + 1; });
    for (const actorId of actorIds) world.actors[actorId].apCommitted = 0;
    prepareRoomEvent(world, recorder);
  }
  const invariantIssues = objectInvariantIssues(world);
  if (invariantIssues.length) throw new Error(`Object invariant violation: ${invariantIssues.join(" ")}`);
  world.stateId = `WORLD_SEED_${world.seed}_B${String(world.beat).padStart(2, "0")}_T${world.traces.length}`;
  return world;
}

export function createInitialSessionV3(seed: number = prototypeConfig.defaultSeed): BehaviorLabSessionV3 { const world = createInitialWorldV3(seed); return { version: "0.3.0", world, playerPlan: createEmptyPlan(world, "PLAYER"), queueNotice: null, debugVisible: false }; }
export function commitPlayerBeat(session: BehaviorLabSessionV3, options: ResolveBeatOptions = {}): BehaviorLabSessionV3 {
  const validation = validatePlan(session.world, session.playerPlan);
  if (!validation.legal) return { ...session, queueNotice: validation.issues[0] ?? "The Beat plan is illegal." };
  const world = resolveBeatV3(session.world, session.playerPlan, options);
  return { ...session, world, playerPlan: createEmptyPlan(world, "PLAYER"), queueNotice: world.terminal ? world.terminal.explanation : `Beat ${session.world.beat} resolved. Read the new tableau before planning Beat ${world.beat}.` };
}

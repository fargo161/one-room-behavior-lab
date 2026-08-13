import { initialAttention, prototypeConfig, roomAnchorLabels } from "./config";
import { createStructuredMessage, partialMessageFragment } from "./messages";
import type {
  ActionResolution,
  ActorId,
  ActorPlan,
  ActorStateV3,
  Attribution,
  BehaviorLabSessionV3,
  CausalHistoryEvent,
  DeliveryMode,
  DistractionOutcome,
  DistractAction,
  InteractAction,
  MessageAction,
  MessageDraftV3,
  MoveAction,
  MutationTraceV3,
  NpcId,
  ObservationRecord,
  PlannedAction,
  PlanValidation,
  ReceptionKind,
  ReceptionRecord,
  ResolutionStatus,
  RoomAnchor,
  RoomEventState,
  ScanAction,
  StructuredMessageEvent,
  WorldStateV3,
} from "./types";

const clone = <T,>(value: T): T => structuredClone(value);
const actorName = (actorId: ActorId) => (actorId === "PLAYER" ? "You" : actorId === "MARA" ? "Mara" : "Drew");

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
    const trace: MutationTraceV3 = {
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
    };
    this.world.traces.push(trace);
    return id;
  }

  history(beat: number, actorId: ActorId | null, actionId: string, text: string, traceRefs: string[] = []): CausalHistoryEvent {
    const event: CausalHistoryEvent = {
      id: `HISTORY_B${String(beat).padStart(2, "0")}_${String(this.world.history.length + 1).padStart(4, "0")}`,
      beat,
      actorId,
      actionId,
      text,
      traceRefs,
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
  position: id === "PLAYER" ? "CENTER" : id === "MARA" ? "NEAR_MARA" : "NEAR_DREW",
  attention: clone(initialAttention[id]),
  gaze: id === "PLAYER" ? "Mara" : id === "MARA" ? "Player" : "the envelope",
  orientation: id === "MARA" ? "angled toward the door" : id === "DREW" ? "square to the table" : "open to the room",
  posture: id === "MARA" ? "contained, ready to move" : id === "DREW" ? "still and territorial" : "alert",
  hands: id === "DREW" ? "one hand near the table" : "visible and free",
  face: id === "MARA" ? "ATTENTIVE" : "COMPOSED",
  apCommitted: 0,
  observations: [],
  drewConcern: 0,
  maraExitPressure: 0,
  drewTrajectory: id === "DREW" ? "NORMAL" : null,
  maraTrajectory: id === "MARA" ? "ENGAGED" : null,
});

const roomEventTemplates: Array<Omit<RoomEventState, "id" | "beat">> = [
  {
    family: "INTERRUPTION",
    title: "Hallway footsteps",
    description: "Footsteps pass outside the door, pulling Mara's gaze toward the exit.",
    noise: "MODERATE",
    attentionActorId: "MARA",
    attentionTarget: { kind: "LOCATION", id: "NEAR_DOOR" },
    actionableEffect: "Mara is less attentive to low voices away from the door.",
  },
  {
    family: "POSITION_CHANGE",
    title: "Door shifts open",
    description: "The door eases wider, making the exit more visually present.",
    noise: "QUIET",
    attentionActorId: "MARA",
    attentionTarget: { kind: "LOCATION", id: "NEAR_DOOR" },
    actionableEffect: "The open exit strengthens Mara's movement opportunity.",
  },
  {
    family: "OCCUPATION",
    title: "Light flicker",
    description: "The overhead light flickers; everyone briefly checks the room.",
    noise: "QUIET",
    attentionActorId: "DREW",
    attentionTarget: { kind: "LOCATION", id: "CENTER" },
    actionableEffect: "Drew's attention leaves the envelope for the room center.",
  },
  {
    family: "REVEAL_ACCESS",
    title: "Envelope corner exposed",
    description: "A draft lifts one corner of the papers resting over the envelope.",
    noise: "QUIET",
    attentionActorId: "PLAYER",
    attentionTarget: { kind: "OBJECT", id: "ENVELOPE" },
    actionableEffect: "The envelope is conspicuous and easier to inspect.",
  },
  {
    family: "DISTRACTION",
    title: "Phone buzz",
    description: "Drew's phone buzzes against the table. His eyes drop to it.",
    noise: "MODERATE",
    attentionActorId: "DREW",
    attentionTarget: { kind: "ROOM_EVENT", id: "PHONE_BUZZ" },
    actionableEffect: "Drew is temporarily less attentive to quiet communication near Mara.",
  },
];

const eventFor = (seed: number, beat: number): RoomEventState => {
  const index = Math.abs(seed * 31 + beat * 17) % roomEventTemplates.length;
  return { ...clone(roomEventTemplates[index]), id: `ROOM_EVENT_B${String(beat).padStart(2, "0")}_${index}`, beat };
};

const placeholderEvent = (): RoomEventState => ({
  id: "ROOM_EVENT_PENDING",
  beat: 0,
  family: "OCCUPATION",
  title: "Room settles",
  description: "The room is quiet.",
  noise: "QUIET",
  attentionActorId: null,
  attentionTarget: null,
  actionableEffect: "No opening yet.",
});

function setActorField<K extends keyof ActorStateV3>(world: WorldStateV3, recorder: MutationRecorderV3, actorId: ActorId, field: K, value: ActorStateV3[K], ruleId: string, cause: string, context: MutationContext): string | null {
  const prior = world.actors[actorId][field];
  if (JSON.stringify(prior) === JSON.stringify(value)) return null;
  return recorder.record(`actors.${actorId}.${String(field)}`, prior, value, ruleId, cause, context, () => {
    world.actors[actorId][field] = clone(value) as ActorStateV3[K];
  });
}

function prepareRoomEvent(world: WorldStateV3, recorder: MutationRecorderV3): void {
  const event = eventFor(world.seed, world.beat);
  const context: MutationContext = { beat: world.beat, slot: 0, actorId: null, actionId: event.id, sourceEventId: event.id, status: "NORMAL" };
  const eventTrace = recorder.record("currentRoomEvent", world.currentRoomEvent, event, "RULE_SEEDED_ROOM_EVENT", "The seed and Beat select one deterministic tactical room event.", context, () => {
    world.currentRoomEvent = clone(event);
    world.roomEvents.push(clone(event));
  });
  const noiseTrace = recorder.record("roomNoise", world.roomNoise, event.noise, "RULE_ROOM_EVENT_NOISE", "The selected room event sets the current audibility context.", { ...context, sourceTraceRefs: [eventTrace] }, () => {
    world.roomNoise = event.noise;
  });
  const attentionRefs = [eventTrace, noiseTrace];
  if (event.attentionActorId && event.attentionTarget) {
    const attentionTrace = setActorField(world, recorder, event.attentionActorId, "attention", event.attentionTarget, "RULE_ROOM_EVENT_ATTENTION", event.actionableEffect, { ...context, sourceTraceRefs: attentionRefs });
    if (attentionTrace) attentionRefs.push(attentionTrace);
    setActorField(world, recorder, event.attentionActorId, "gaze", event.title.toLowerCase(), "RULE_TABLEAU_GAZE_FOLLOWS_ATTENTION", "Gaze makes the event-driven attention change observable.", { ...context, sourceTraceRefs: attentionRefs });
  }
  recorder.history(world.beat, null, event.id, `${event.title}: ${event.description} ${event.actionableEffect}`, attentionRefs);
}

export function createInitialWorldV3(seed: number = prototypeConfig.defaultSeed): WorldStateV3 {
  const world: WorldStateV3 = {
    version: "0.3.0",
    stateId: `WORLD_SEED_${seed}_B01`,
    seed,
    beat: 1,
    maxBeats: prototypeConfig.maxBeats,
    actors: { PLAYER: initialActor("PLAYER"), MARA: initialActor("MARA"), DREW: initialActor("DREW") },
    envelope: { id: "ENVELOPE", state: "AVAILABLE", position: "NEAR_ENVELOPE", holderId: null, guardedBy: null, visible: true },
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

export const makeMoveAction = (world: WorldStateV3, actorId: ActorId, target: RoomAnchor, ordinal: number): MoveAction => ({ id: actionId(world, actorId, ordinal, "MOVE"), actorId, kind: "MOVE", cost: 1, beat: world.beat, ordinal, target });

export const makeMessageAction = (world: WorldStateV3, actorId: ActorId, draft: MessageDraftV3, ordinal: number): MessageAction => {
  const message = createStructuredMessage(actorId, world.beat, draft);
  return {
    id: actionId(world, actorId, ordinal, "MESSAGE"),
    actorId,
    kind: "MESSAGE",
    cost: 1,
    beat: world.beat,
    ordinal,
    message,
    plannedSenderPosition: world.actors[actorId].position,
    plannedRecipientPositions: Object.fromEntries(message.intendedRecipients.map((id) => [id, world.actors[id].position])),
  };
};

export const makeScanAction = (world: WorldStateV3, actorId: ActorId, targetType: ScanAction["targetType"], targetId: ScanAction["targetId"], ordinal: number): ScanAction => ({ id: actionId(world, actorId, ordinal, "SCAN"), actorId, kind: "SCAN", cost: 1, beat: world.beat, ordinal, targetType, targetId });

export const makeInteractAction = (world: WorldStateV3, actorId: ActorId, targetId: InteractAction["targetId"], operation: InteractAction["operation"], ordinal: number): InteractAction => ({ id: actionId(world, actorId, ordinal, "INTERACT"), actorId, kind: "INTERACT", cost: 1, beat: world.beat, ordinal, targetId, operation });

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

export function removePlayerAction(session: BehaviorLabSessionV3, index: number): BehaviorLabSessionV3 {
  const actions = session.playerPlan.actions.filter((_, itemIndex) => itemIndex !== index);
  return { ...session, playerPlan: { ...session.playerPlan, actions }, queueNotice: "Action removed from the Beat plan." };
}

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
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const next of prototypeConfig.roomGraph[current.anchor]) {
      if (next === to) return current.distance + 1;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ anchor: next, distance: current.distance + 1 });
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}

const nextStepToward = (from: RoomAnchor, to: RoomAnchor): RoomAnchor | null => {
  if (from === to) return null;
  const options = prototypeConfig.roomGraph[from];
  return [...options].sort((left, right) => roomDistance(left, to) - roomDistance(right, to))[0] ?? null;
};

const attentionIncludes = (observer: ActorStateV3, senderId: ActorId, recipients: ActorId[]): boolean => observer.attention.kind === "ACTOR" && (observer.attention.id === senderId || recipients.includes(observer.attention.id as ActorId));

function resolveObserverReception(world: WorldStateV3, message: StructuredMessageEvent, observerId: ActorId, delivery: DeliveryMode): ReceptionKind {
  if (message.intendedRecipients.includes(observerId)) return "DIRECT";
  const observer = world.actors[observerId];
  if (!observer.active) return "NONE";
  const sender = world.actors[message.senderId];
  const distance = roomDistance(observer.position, sender.position);
  const attentive = attentionIncludes(observer, message.senderId, message.intendedRecipients);
  const noisePenalty = world.roomNoise === "LOUD" ? prototypeConfig.reception.loudRoomDistancePenalty : 0;
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
  const reception: ReceptionRecord = {
    id: `RECEPTION_${message.id}_${actorId}`,
    beat: world.beat,
    messageId: message.id,
    actorId,
    kind,
    content: kind === "DIRECT" || kind === "OVERHEARD_FULL" ? message.surfaceText : null,
    fragment: kind === "OVERHEARD_PARTIAL" ? partialMessageFragment(message) : null,
    deliveryResolvedAs: delivery,
    sourceTraceRefs: [...(context.sourceTraceRefs ?? [])],
  };
  const traceId = recorder.record(`receptions.${reception.id}`, null, reception, "RULE_ACTOR_SPECIFIC_RECEPTION", "Reception is resolved for this actor from current position, attention, room noise, and delivery mode.", { ...context, reception: kind }, () => world.receptions.push(reception));
  reception.sourceTraceRefs.push(traceId);
  return reception;
};

function incrementActorMetric(world: WorldStateV3, recorder: MutationRecorderV3, actorId: ActorId, field: "drewConcern" | "maraExitPressure", amount: number, ruleId: string, cause: string, context: MutationContext): string | null {
  const prior = world.actors[actorId][field];
  const next = Math.max(0, prior + amount);
  return setActorField(world, recorder, actorId, field, next, ruleId, cause, context);
}

function updateDrewTrajectory(world: WorldStateV3, recorder: MutationRecorderV3, trigger: string, context: MutationContext): string[] {
  const drew = world.actors.DREW;
  const thresholds = prototypeConfig.failThresholds;
  let next = drew.drewTrajectory ?? "NORMAL";
  if (drew.drewConcern >= thresholds.drewLockdown && ["SECRECY_LEAK", "PLAYER_TOUCH_ENVELOPE", "MARA_AT_EXIT"].includes(trigger)) next = "LOCKDOWN";
  else if (drew.drewConcern >= thresholds.drewSecuring) next = "SECURING";
  else if (drew.drewConcern >= thresholds.drewGuarding) next = "GUARDING";
  else if (drew.drewConcern >= thresholds.drewWatchful) next = "WATCHFUL";
  const traceRefs: string[] = [];
  const stageTrace = setActorField(world, recorder, "DREW", "drewTrajectory", next, "RULE_DREW_FAIL_TRAJECTORY", `Drew's accumulated concern and the immediate ${trigger} trigger determine his visible trajectory.`, context);
  if (stageTrace) traceRefs.push(stageTrace);
  const face = next === "NORMAL" ? "COMPOSED" : next === "WATCHFUL" ? "ATTENTIVE" : next === "EJECT" ? "CLOSED" : "TENSE";
  const faceTrace = setActorField(world, recorder, "DREW", "face", face, "RULE_DREW_TRAJECTORY_TABLEAU", "Drew's face changes with his visible fail trajectory without acting as a universal codebook.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...traceRefs] });
  if (faceTrace) traceRefs.push(faceTrace);
  const posture = next === "NORMAL" ? "still and territorial" : next === "WATCHFUL" ? "upright, tracking the room" : next === "EJECT" ? "between you and the exit" : "closed over the envelope";
  const postureTrace = setActorField(world, recorder, "DREW", "posture", posture, "RULE_DREW_TRAJECTORY_TABLEAU", "Posture telegraphs the current trajectory through world presentation.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...traceRefs] });
  if (postureTrace) traceRefs.push(postureTrace);
  return traceRefs;
}

function updateMaraTrajectory(world: WorldStateV3, recorder: MutationRecorderV3, trigger: string, context: MutationContext): string[] {
  const mara = world.actors.MARA;
  const thresholds = prototypeConfig.failThresholds;
  let next = mara.maraTrajectory ?? "ENGAGED";
  if (mara.maraExitPressure >= thresholds.maraFlee && mara.position === "NEAR_DOOR" && ["BLUNT_WARNING", "DREW_BLOCKING", "PLAYER_PRESSURE"].includes(trigger)) next = "READY_TO_LEAVE";
  else if (mara.maraExitPressure >= thresholds.maraReadyToLeave) next = "READY_TO_LEAVE";
  else if (mara.maraExitPressure >= thresholds.maraNearExit || mara.position === "NEAR_DOOR") next = "NEAR_EXIT";
  else if (mara.maraExitPressure >= thresholds.maraUneasy) next = "UNEASY";
  const traceRefs: string[] = [];
  const stageTrace = setActorField(world, recorder, "MARA", "maraTrajectory", next, "RULE_MARA_FAIL_TRAJECTORY", `Mara's accumulated pressure and the immediate ${trigger} trigger determine her visible trajectory.`, context);
  if (stageTrace) traceRefs.push(stageTrace);
  const face = next === "ENGAGED" ? "ATTENTIVE" : next === "UNEASY" ? "UNEASY" : next === "FLEE" ? "RESOLVED" : "TENSE";
  const faceTrace = setActorField(world, recorder, "MARA", "face", face, "RULE_MARA_TRAJECTORY_TABLEAU", "Mara's expression changes from her own trajectory and remains contextual evidence.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...traceRefs] });
  if (faceTrace) traceRefs.push(faceTrace);
  const orientation = next === "ENGAGED" ? "angled toward the door" : next === "UNEASY" ? "half-turned toward the door" : "set toward the exit";
  const orientationTrace = setActorField(world, recorder, "MARA", "orientation", orientation, "RULE_MARA_TRAJECTORY_TABLEAU", "Orientation makes Mara's exit trajectory visible.", { ...context, sourceTraceRefs: [...(context.sourceTraceRefs ?? []), ...traceRefs] });
  if (orientationTrace) traceRefs.push(orientationTrace);
  return traceRefs;
}

function resolveMove(world: WorldStateV3, action: MoveAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const actor = world.actors[action.actorId];
  const baseContext: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  if (!actor.active) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} cannot move because they are no longer in the room.`);
  if (actor.position === action.target) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} is already ${roomAnchorLabels[action.target]}.`);
  if (action.actorId === "PLAYER" && action.target === "NEAR_DOOR" && world.actors.DREW.drewTrajectory === "LOCKDOWN") {
    const refs = recorder.latestTraceFor("actors.DREW.drewTrajectory");
    recorder.history(world.beat, action.actorId, action.id, "Drew's lockdown blocks your route to the door. The queued Move spends its AP but does not resolve.", refs);
    return resolution(action, slot, "INVALIDATED", "Drew's lockdown blocks the route.", refs);
  }
  const next = nextStepToward(actor.position, action.target);
  if (!next) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} has no legal route.`);
  const status: ResolutionStatus = next === action.target ? "NORMAL" : "DEGRADED";
  const context = { ...baseContext, status };
  const positionTrace = setActorField(world, recorder, action.actorId, "position", next, "RULE_DISCRETE_MOVE_STEP", `MOVE advances one edge through the prototype-local room graph toward ${action.target}.`, context);
  const refs = positionTrace ? [positionTrace] : [];
  const orientationTrace = setActorField(world, recorder, action.actorId, "orientation", `oriented toward ${roomAnchorLabels[action.target]}`, "RULE_MOVEMENT_IS_OBSERVABLE", "Movement updates the static tableau and can be noticed by other actors.", { ...context, sourceTraceRefs: refs });
  if (orientationTrace) refs.push(orientationTrace);
  if (action.actorId === "PLAYER" && next === world.actors.MARA.position) {
    const relief = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", prototypeConfig.impacts.playerNearMaraRelief, "RULE_PLAYER_PROXIMITY_MARA", "The player's non-threatening proximity gives Mara a small scenario-local reason to remain engaged.", { ...context, sourceTraceRefs: refs });
    if (relief) refs.push(relief);
  }
  if (action.actorId === "PLAYER" && roomDistance(next, world.actors.MARA.position) <= 1 && attentionIncludes(world.actors.DREW, "PLAYER", ["MARA"])) {
    const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", prototypeConfig.impacts.maraNearExitDrewConcern, "RULE_DREW_NOTICES_PLAYER_APPROACH", "Drew is attending to the approach near Mara.", { ...context, sourceTraceRefs: refs });
    if (concern) refs.push(concern);
    refs.push(...updateDrewTrajectory(world, recorder, "PLAYER_APPROACH", { ...context, sourceTraceRefs: refs }));
  }
  if (action.actorId === "MARA" && next === "NEAR_DOOR") {
    const pressure = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", 1, "RULE_MARA_MOVES_TOWARD_EXIT", "Mara's own movement makes the exit trajectory more immediate.", { ...context, sourceTraceRefs: refs });
    if (pressure) refs.push(pressure);
    refs.push(...updateMaraTrajectory(world, recorder, "MARA_AT_EXIT", { ...context, sourceTraceRefs: refs }));
    if (attentionIncludes(world.actors.DREW, "MARA", [])) {
      const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", prototypeConfig.impacts.maraNearExitDrewConcern, "RULE_DREW_NOTICES_MARA_EXIT", "Drew is attending when Mara moves toward the exit.", { ...context, sourceTraceRefs: refs });
      if (concern) refs.push(concern);
      refs.push(...updateDrewTrajectory(world, recorder, "MARA_AT_EXIT", { ...context, sourceTraceRefs: refs }));
    }
  }
  const text = status === "NORMAL" ? `${actorName(action.actorId)} moved ${roomAnchorLabels[next]}.` : `${actorName(action.actorId)} moved one step ${roomAnchorLabels[next]}; ${roomAnchorLabels[action.target]} remains another Move away.`;
  recorder.history(world.beat, action.actorId, action.id, text, refs);
  return resolution(action, slot, status, text, refs);
}

function resolveMessage(world: WorldStateV3, action: MessageAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const sender = world.actors[action.actorId];
  const recipientId = action.message.intendedRecipients[0];
  const recipient = world.actors[recipientId];
  const baseContext: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.message.id, status: "NORMAL" };
  if (!sender.active || !recipient?.active) {
    const refs = recorder.latestTraceFor(`actors.${recipientId}.active`);
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)}'s queued Message cannot reach ${actorName(recipientId)}. The AP remains spent.`, refs);
    return resolution(action, slot, "INVALIDATED", "The intended recipient is unavailable.", refs);
  }
  let delivery = action.message.deliveryMode;
  let status: ResolutionStatus = "NORMAL";
  const distance = roomDistance(sender.position, recipient.position);
  const revalidationRefs: string[] = [];
  if (delivery === "WHISPER" && distance > prototypeConfig.reception.whisperDirectMaxDistance) {
    delivery = distance > 2 ? "NORMAL" : "LOW_VOICE";
    status = "DEGRADED";
    revalidationRefs.push(...recorder.latestTraceFor(`actors.${recipientId}.position`), ...recorder.latestTraceFor(`actors.${action.actorId}.position`));
  }
  const context = { ...baseContext, status, sourceTraceRefs: revalidationRefs };
  const messageTrace = recorder.record(`messages.${action.message.id}`, null, action.message, "RULE_STRUCTURED_MESSAGE_EVENT", "The complete structured message identity is preserved before actor-specific reception resolves.", context, () => world.messages.push(action.message));
  const receptions: ReceptionRecord[] = [];
  for (const actorId of ["PLAYER", "MARA", "DREW"] as ActorId[]) {
    if (actorId === action.actorId) continue;
    const kind = resolveObserverReception(world, action.message, actorId, delivery);
    receptions.push(recordReception(world, recorder, action.message, actorId, kind, delivery, { ...context, sourceTraceRefs: [...revalidationRefs, messageTrace] }));
  }
  const direct = receptions.find((item) => item.actorId === recipientId);
  const refs = [messageTrace, ...receptions.flatMap((item) => item.sourceTraceRefs)];
  if (direct?.kind === "DIRECT") {
    const attentionTrace = setActorField(world, recorder, recipientId, "attention", { kind: "ACTOR", id: action.actorId }, "RULE_DIRECT_MESSAGE_ATTENTION", "Direct reception turns the recipient toward the speaker.", { ...context, reception: "DIRECT", sourceTraceRefs: refs });
    if (attentionTrace) refs.push(attentionTrace);
    const gazeTrace = setActorField(world, recorder, recipientId, "gaze", actorName(action.actorId), "RULE_DIRECT_MESSAGE_TABLEAU", "Gaze exposes the direct recipient's current attention.", { ...context, reception: "DIRECT", sourceTraceRefs: refs });
    if (gazeTrace) refs.push(gazeTrace);
  }
  if (action.actorId === "DREW" && recipientId === "PLAYER" && action.message.coreContentId === "REPORT_DANGER" && world.actors.DREW.drewTrajectory === "LOCKDOWN" && world.actors.DREW.drewConcern >= prototypeConfig.failThresholds.drewEject) {
    const ejectionTrace = setActorField(world, recorder, "DREW", "drewTrajectory", "EJECT", "RULE_DREW_EJECTS_THROUGH_MESSAGE", "Drew's accumulated concern and existing lockdown combine with his resolved warning action to eject the player.", { ...context, reception: direct?.kind ?? null, sourceTraceRefs: refs });
    if (ejectionTrace) refs.push(ejectionTrace);
    const playerTrace = setActorField(world, recorder, "PLAYER", "active", false, "RULE_DREW_EJECTS_THROUGH_MESSAGE", "Drew's ordinary MESSAGE action ends the player's access to the room.", { ...context, reception: direct?.kind ?? null, sourceTraceRefs: refs });
    if (playerTrace) refs.push(playerTrace);
  }
  const drewReception = receptions.find((item) => item.actorId === "DREW");
  if (action.actorId !== "DREW" && drewReception && drewReception.kind !== "NONE") {
    const envelopeRelevant = ["ASK_FOR_ENVELOPE", "SHARE_AUTHORIZATION", "REQUEST_PRIVACY"].includes(action.message.coreContentId);
    const secrecyOnly = drewReception.kind === "NOTICED_ONLY";
    if (envelopeRelevant || secrecyOnly) {
      const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", secrecyOnly ? prototypeConfig.impacts.noticedSecrecyDrewConcern : prototypeConfig.impacts.envelopeMentionDrewConcern, secrecyOnly ? "RULE_NOTICED_SECRECY_DREW" : "RULE_ENVELOPE_MESSAGE_DREW", secrecyOnly ? "Drew noticed secret communication without receiving its content." : "Drew received communication concerning the envelope or private access.", { ...context, reception: drewReception.kind, sourceTraceRefs: refs });
      if (concern) refs.push(concern);
      refs.push(...updateDrewTrajectory(world, recorder, drewReception.kind === "OVERHEARD_PARTIAL" || secrecyOnly ? "SECRECY_LEAK" : "MESSAGE_RECEIVED", { ...context, reception: drewReception.kind, sourceTraceRefs: refs }));
    }
  }
  const maraReception = receptions.find((item) => item.actorId === "MARA");
  if (action.actorId !== "MARA" && maraReception && ["DIRECT", "OVERHEARD_FULL", "OVERHEARD_PARTIAL"].includes(maraReception.kind)) {
    const threatening = action.message.components.warningId !== "NONE" || action.message.components.directness === "BLUNT";
    if (threatening) {
      const pressure = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", prototypeConfig.impacts.bluntWarningMaraPressure, "RULE_CONTEXTUAL_PACKAGING_MARA", "Mara reacts to the warning and blunt packaging in this scenario; packaging is not treated as an emotion label.", { ...context, reception: maraReception.kind, sourceTraceRefs: refs });
      if (pressure) refs.push(pressure);
      refs.push(...updateMaraTrajectory(world, recorder, "BLUNT_WARNING", { ...context, reception: maraReception.kind, sourceTraceRefs: refs }));
    }
  }
  const deliveryPhrase = delivery === "WHISPER" ? "whispered" : delivery === "LOW_VOICE" ? "spoke quietly" : "said";
  const degradation = status === "DEGRADED" ? ` The changed distance degraded the planned ${action.message.deliveryMode.toLowerCase().replace("_", " ")} to ${delivery.toLowerCase().replace("_", " ")}.` : "";
  recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} ${deliveryPhrase} to ${actorName(recipientId)}: “${action.message.surfaceText}”${degradation}`, refs);
  for (const heard of receptions.filter((item) => item.actorId !== recipientId && item.kind !== "NONE")) {
    const evidence = heard.kind === "OVERHEARD_PARTIAL" ? heard.fragment : heard.kind === "NOTICED_ONLY" ? "the communication, but not its content" : heard.content;
    recorder.history(world.beat, heard.actorId, action.id, `${actorName(heard.actorId)} ${heard.kind === "NOTICED_ONLY" ? "noticed" : "overheard"} ${evidence ?? "the exchange"}.`, heard.sourceTraceRefs);
  }
  return resolution(action, slot, status, status === "DEGRADED" ? `Message delivery degraded to ${delivery}.` : "Message resolved through actor-specific reception.", refs, receptions.map((item) => item.id));
}

const observationEvidence = (world: WorldStateV3, action: ScanAction): string[] => {
  if (action.targetType === "ROOM") {
    return [
      `Mara is ${roomAnchorLabels[world.actors.MARA.position]}; Drew is ${roomAnchorLabels[world.actors.DREW.position]}.`,
      `${world.currentRoomEvent.title} currently shapes attention and audibility.`,
    ];
  }
  if (action.targetType === "OBJECT") {
    return [
      `The envelope is ${world.envelope.state.toLowerCase().replaceAll("_", " ")} ${roomAnchorLabels[world.envelope.position]}.`,
      world.envelope.holderId ? `${actorName(world.envelope.holderId)} has it in hand.` : world.envelope.guardedBy ? `${actorName(world.envelope.guardedBy)} keeps a hand close to it.` : "No one is holding it.",
    ];
  }
  const target = world.actors[action.targetId as ActorId];
  return [
    `${target.name} is ${roomAnchorLabels[target.position]}, looking toward ${target.gaze}.`,
    `${target.posture}; ${target.hands}.`,
  ];
};

function resolveScan(world: WorldStateV3, action: ScanAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const actor = world.actors[action.actorId];
  const context: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  if (!actor.active) return resolution(action, slot, "INVALIDATED", `${actorName(action.actorId)} cannot Scan after leaving the room.`);
  const evidence = observationEvidence(world, action);
  const observation: ObservationRecord = { id: `OBS_B${world.beat}_${action.actorId}_${action.ordinal}`, beat: world.beat, actorId: action.actorId, target: String(action.targetId), evidence, sourceActionId: action.id };
  const observationTrace = recorder.record(`actors.${action.actorId}.observations.${observation.id}`, null, observation, "RULE_SCAN_OBSERVABLE_EVIDENCE", "SCAN records extra observable evidence without exposing hidden numeric state.", context, () => actor.observations.push(observation));
  const refs = [observationTrace];
  const attentionTarget = action.targetType === "ACTOR" ? { kind: "ACTOR" as const, id: action.targetId } : action.targetType === "OBJECT" ? { kind: "OBJECT" as const, id: action.targetId } : { kind: "LOCATION" as const, id: "CENTER" };
  const attentionTrace = setActorField(world, recorder, action.actorId, "attention", attentionTarget, "RULE_SCAN_DIRECTS_ATTENTION", "Scanning directs attention toward the observed target.", { ...context, sourceTraceRefs: refs });
  if (attentionTrace) refs.push(attentionTrace);
  const gazeTrace = setActorField(world, recorder, action.actorId, "gaze", action.targetType === "ACTOR" ? actorName(action.targetId as ActorId) : String(action.targetId).toLowerCase(), "RULE_SCAN_TABLEAU", "Gaze makes the Scan target visible in the next tableau.", { ...context, sourceTraceRefs: refs });
  if (gazeTrace) refs.push(gazeTrace);
  if (action.actorId === "DREW" && action.targetId === "MARA" && world.actors.MARA.position === "NEAR_DOOR") {
    const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", prototypeConfig.impacts.maraNearExitDrewConcern, "RULE_DREW_SCANS_MARA_AT_EXIT", "Drew's Scan observes Mara positioned at the exit.", { ...context, sourceTraceRefs: refs });
    if (concern) refs.push(concern);
    refs.push(...updateDrewTrajectory(world, recorder, "MARA_AT_EXIT", { ...context, sourceTraceRefs: refs }));
  }
  recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} scanned ${action.targetType === "ROOM" ? "the room" : actorNameOrObject(action.targetId)}. ${evidence.join(" ")}`, refs);
  return resolution(action, slot, "NORMAL", evidence.join(" "), refs);
}

const actorNameOrObject = (targetId: ScanAction["targetId"]) => targetId === "ENVELOPE" ? "the envelope" : targetId === "ROOM" ? "the room" : actorName(targetId);

function resolveInteract(world: WorldStateV3, action: InteractAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const actor = world.actors[action.actorId];
  const context: MutationContext = { beat: world.beat, slot, actorId: action.actorId, actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  const unavailable = (summary: string, paths: string[] = []) => {
    const refs = paths.flatMap((path) => recorder.latestTraceFor(path));
    recorder.history(world.beat, action.actorId, action.id, `${summary} The committed AP is not refunded.`, refs);
    return resolution(action, slot, "INVALIDATED", summary, refs);
  };
  if (!actor.active) return unavailable(`${actorName(action.actorId)} is no longer available to Interact.`, [`actors.${action.actorId}.active`]);
  if (action.operation === "LEAVE") {
    if (actor.position !== "NEAR_DOOR") return unavailable(`${actorName(action.actorId)} cannot leave without reaching the door.`, [`actors.${action.actorId}.position`]);
    const activeTrace = setActorField(world, recorder, action.actorId, "active", false, "RULE_EXIT_INTERACTION", `${actorName(action.actorId)} uses the door from the required anchor.`, context);
    const refs = activeTrace ? [activeTrace] : [];
    if (action.actorId === "MARA") {
      const trajectoryTrace = setActorField(world, recorder, "MARA", "maraTrajectory", "FLEE", "RULE_MARA_LEAVES_ROOM", "Mara's ordinary LEAVE interaction manifests the end of her fail trajectory.", { ...context, sourceTraceRefs: refs });
      if (trajectoryTrace) refs.push(trajectoryTrace);
    }
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} left through the door.`, refs);
    return resolution(action, slot, "NORMAL", `${actorName(action.actorId)} left the room.`, refs);
  }
  if (action.targetId !== "ENVELOPE") return unavailable("That interaction has no current affordance.");
  const withinReach = roomDistance(actor.position, world.envelope.position) === 0;
  if (action.operation === "INSPECT") {
    if (!world.envelope.visible || roomDistance(actor.position, world.envelope.position) > 1) return unavailable(`${actorName(action.actorId)} cannot inspect the envelope from here.`, ["envelope.position", "envelope.visible"]);
    const evidence = `The envelope is ${world.envelope.state.toLowerCase().replaceAll("_", " ")}; its seal is intact.`;
    const observation: ObservationRecord = { id: `OBS_B${world.beat}_${action.actorId}_ENVELOPE_${action.ordinal}`, beat: world.beat, actorId: action.actorId, target: "ENVELOPE", evidence: [evidence], sourceActionId: action.id };
    const trace = recorder.record(`actors.${action.actorId}.observations.${observation.id}`, null, observation, "RULE_INTERACT_INSPECT_EVIDENCE", "Inspecting a reachable visible object records observable evidence.", context, () => actor.observations.push(observation));
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} inspected the envelope. ${evidence}`, [trace]);
    return resolution(action, slot, "NORMAL", evidence, [trace]);
  }
  if (action.operation === "TAKE") {
    if (!withinReach || world.envelope.state === "SECURED" || world.envelope.state === "LOCKED_AWAY" || world.envelope.holderId) return unavailable(`${actorName(action.actorId)} cannot take the envelope because the affordance no longer exists.`, ["envelope.position", "envelope.state", "envelope.holderId"]);
    const refs: string[] = [];
    refs.push(recorder.record("envelope.state", world.envelope.state, "HELD", "RULE_OBJECT_TAKE", "A reachable, available envelope can be taken through INTERACT.", context, () => { world.envelope.state = "HELD"; }));
    refs.push(recorder.record("envelope.holderId", world.envelope.holderId, action.actorId, "RULE_OBJECT_TAKE", "Taking establishes exclusive possession.", { ...context, sourceTraceRefs: refs }, () => { world.envelope.holderId = action.actorId; }));
    refs.push(recorder.record("envelope.position", world.envelope.position, actor.position, "RULE_OBJECT_FOLLOWS_HOLDER", "A held object moves with its holder.", { ...context, sourceTraceRefs: refs }, () => { world.envelope.position = actor.position; }));
    const handsTrace = setActorField(world, recorder, action.actorId, "hands", "holding the envelope", "RULE_OBJECT_TABLEAU", "Hand state makes possession visible.", { ...context, sourceTraceRefs: refs });
    if (handsTrace) refs.push(handsTrace);
    if (action.actorId === "PLAYER") {
      const concern = incrementActorMetric(world, recorder, "DREW", "drewConcern", 2, "RULE_PLAYER_TOUCHES_ENVELOPE", "The player takes the protected object within Drew's room.", { ...context, sourceTraceRefs: refs });
      if (concern) refs.push(concern);
      refs.push(...updateDrewTrajectory(world, recorder, "PLAYER_TOUCH_ENVELOPE", { ...context, sourceTraceRefs: refs }));
    }
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} took the envelope.`, refs);
    return resolution(action, slot, "NORMAL", `${actorName(action.actorId)} now holds the envelope.`, refs);
  }
  if (action.operation === "PLACE_ON_TABLE") {
    if (world.envelope.holderId !== action.actorId) return unavailable(`${actorName(action.actorId)} cannot place an envelope they do not hold.`, ["envelope.holderId"]);
    const refs: string[] = [];
    refs.push(recorder.record("envelope.state", world.envelope.state, "MOVED", "RULE_OBJECT_PLACE", "The holder places the envelope on the table.", context, () => { world.envelope.state = "MOVED"; }));
    refs.push(recorder.record("envelope.holderId", world.envelope.holderId, null, "RULE_OBJECT_PLACE", "Placing releases exclusive possession.", { ...context, sourceTraceRefs: refs }, () => { world.envelope.holderId = null; }));
    refs.push(recorder.record("envelope.position", world.envelope.position, "NEAR_TABLE", "RULE_OBJECT_PLACE", "The placed envelope occupies the table anchor.", { ...context, sourceTraceRefs: refs }, () => { world.envelope.position = "NEAR_TABLE"; }));
    const handsTrace = setActorField(world, recorder, action.actorId, "hands", "visible and free", "RULE_OBJECT_TABLEAU", "Hand state shows that possession ended.", { ...context, sourceTraceRefs: refs });
    if (handsTrace) refs.push(handsTrace);
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} placed the envelope on the table.`, refs);
    return resolution(action, slot, "NORMAL", "The envelope is on the table.", refs);
  }
  if (action.operation === "GUARD") {
    if (!withinReach || world.envelope.state === "LOCKED_AWAY") return unavailable(`${actorName(action.actorId)} cannot guard the envelope from here.`, ["envelope.position", "envelope.state"]);
    const refs: string[] = [];
    refs.push(recorder.record("envelope.state", world.envelope.state, "GUARDED", "RULE_OBJECT_GUARD", "A nearby actor can visibly guard the envelope.", context, () => { world.envelope.state = "GUARDED"; }));
    refs.push(recorder.record("envelope.guardedBy", world.envelope.guardedBy, action.actorId, "RULE_OBJECT_GUARD", "Guard state records the responsible actor.", { ...context, sourceTraceRefs: refs }, () => { world.envelope.guardedBy = action.actorId; }));
    const handsTrace = setActorField(world, recorder, action.actorId, "hands", "one hand braced beside the envelope", "RULE_OBJECT_TABLEAU", "Guarding becomes visible through hand and object state.", { ...context, sourceTraceRefs: refs });
    if (handsTrace) refs.push(handsTrace);
    if (action.actorId === "DREW") {
      refs.push(...updateDrewTrajectory(world, recorder, "GUARD_ACTION", { ...context, sourceTraceRefs: refs }));
      const pressure = incrementActorMetric(world, recorder, "MARA", "maraExitPressure", prototypeConfig.impacts.drewGuardingMaraPressure, "RULE_MARA_SEES_DREW_GUARD", "Drew's visible guarding makes Mara less willing to remain.", { ...context, sourceTraceRefs: refs });
      if (pressure) refs.push(pressure);
      refs.push(...updateMaraTrajectory(world, recorder, "DREW_BLOCKING", { ...context, sourceTraceRefs: refs }));
    }
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} moved into a guarding position over the envelope.`, refs);
    return resolution(action, slot, "NORMAL", "The envelope is guarded.", refs);
  }
  if (action.operation === "SECURE") {
    const controlsEnvelope = world.envelope.guardedBy === action.actorId || world.envelope.holderId === action.actorId;
    if (!withinReach || !controlsEnvelope) return unavailable(`${actorName(action.actorId)} cannot secure the envelope without controlling it.`, ["envelope.position", "envelope.guardedBy", "envelope.holderId"]);
    const trace = recorder.record("envelope.state", world.envelope.state, "SECURED", "RULE_OBJECT_SECURE", "A controlling actor secures the envelope through an ordinary INTERACT action.", context, () => { world.envelope.state = "SECURED"; });
    recorder.history(world.beat, action.actorId, action.id, `${actorName(action.actorId)} secured the envelope against their body.`, [trace]);
    return resolution(action, slot, "NORMAL", "The envelope is secured.", [trace]);
  }
  if (action.operation === "LOCK_AWAY") {
    if (action.actorId !== "DREW" || world.envelope.state !== "SECURED" || roomDistance(actor.position, "NEAR_TABLE") > 1) return unavailable("The envelope cannot be locked away from the current state.", ["envelope.state", "actors.DREW.position"]);
    const refs: string[] = [];
    refs.push(recorder.record("envelope.state", world.envelope.state, "LOCKED_AWAY", "RULE_OBJECT_LOCK_AWAY", "Drew converts secured possession into a visible lockdown through INTERACT.", context, () => { world.envelope.state = "LOCKED_AWAY"; }));
    refs.push(recorder.record("envelope.visible", world.envelope.visible, false, "RULE_OBJECT_LOCK_AWAY", "The locked-away envelope is no longer visible or accessible.", { ...context, sourceTraceRefs: refs }, () => { world.envelope.visible = false; }));
    recorder.history(world.beat, action.actorId, action.id, "Drew locked the envelope away. The object is no longer accessible.", refs);
    return resolution(action, slot, "NORMAL", "Drew locked the envelope away.", refs);
  }
  return unavailable("That interaction is unavailable.");
}

function resolveDistract(world: WorldStateV3, action: DistractAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  const target = world.actors[action.targetActorId];
  const context: MutationContext = { beat: world.beat, slot, actorId: "PLAYER", actionId: action.id, sourceEventId: action.id, status: "NORMAL" };
  if (!target.active) return resolution(action, slot, "INVALIDATED", `${target.name} is unavailable to distract.`);
  let outcome: DistractionOutcome;
  if (action.mode === "VISIBLE_CALL") {
    outcome = { success: true, eventVisible: true, playerActionVisible: true, causalVisibility: true, attribution: "DIRECT" };
  } else {
    const positioned = world.actors.PLAYER.position === prototypeConfig.distraction.covertRequiredAnchor;
    const targetWatching = target.attention.kind === "ACTOR" && target.attention.id === "PLAYER" || target.attention.kind === "LOCATION" && target.attention.id === prototypeConfig.distraction.covertRequiredAnchor;
    outcome = {
      success: positioned,
      eventVisible: positioned,
      playerActionVisible: targetWatching,
      causalVisibility: positioned && targetWatching,
      attribution: targetWatching ? "LIKELY" : "NONE",
    };
  }
  const status: ResolutionStatus = outcome.success ? "NORMAL" : "INVALIDATED";
  const outcomeContext = { ...context, status, visibility: `event:${outcome.eventVisible};action:${outcome.playerActionVisible};cause:${outcome.causalVisibility}`, attribution: outcome.attribution };
  const refs: string[] = [];
  if (outcome.success) {
    const attentionTrace = setActorField(world, recorder, action.targetActorId, "attention", action.mode === "VISIBLE_CALL" ? { kind: "ACTOR", id: "PLAYER" } : { kind: "LOCATION", id: "NEAR_WINDOW" }, "RULE_DISTRACTION_ATTENTION_EFFECT", "Distraction success changes attention independently from attribution.", outcomeContext);
    if (attentionTrace) refs.push(attentionTrace);
    const gazeTrace = setActorField(world, recorder, action.targetActorId, "gaze", action.mode === "VISIBLE_CALL" ? "Player" : "the window", "RULE_DISTRACTION_TABLEAU", "Gaze exposes the successful attention effect.", { ...outcomeContext, sourceTraceRefs: refs });
    if (gazeTrace) refs.push(gazeTrace);
  }
  const text = outcome.success
    ? action.mode === "VISIBLE_CALL" ? `You called ${target.name}'s attention directly. The distraction worked and ${target.name} knows you caused it.` : `A rattle at the window pulled ${target.name}'s attention away.${outcome.attribution === "NONE" ? " Your involvement remained hidden." : ` ${target.name} likely attributes it to you.`}`
    : `The covert window distraction failed from your current position.${outcome.attribution === "LIKELY" ? ` ${target.name} likely noticed your attempt.` : " Your attempt remained hidden."}`;
  recorder.history(world.beat, "PLAYER", action.id, text, refs);
  return resolution(action, slot, status, text, refs, [], outcome);
}

function resolution(action: PlannedAction, slot: number, status: ResolutionStatus, summary: string, sourceTraceRefs: string[] = [], receptionIds: string[] = [], distraction: DistractionOutcome | null = null): ActionResolution {
  return {
    id: `RESOLUTION_${action.id}`,
    beat: action.beat,
    slot,
    actorId: action.actorId,
    actionId: action.id,
    actionKind: action.kind,
    status,
    summary,
    apSpent: 1,
    sourceTraceRefs,
    receptionIds,
    distraction,
  };
}

function resolveAction(world: WorldStateV3, action: PlannedAction, recorder: MutationRecorderV3, slot: number): ActionResolution {
  switch (action.kind) {
    case "MOVE": return resolveMove(world, action, recorder, slot);
    case "MESSAGE": return resolveMessage(world, action, recorder, slot);
    case "SCAN": return resolveScan(world, action, recorder, slot);
    case "INTERACT": return resolveInteract(world, action, recorder, slot);
    case "DISTRACT": return resolveDistract(world, action, recorder, slot);
  }
}

const npcDraft = (recipientId: ActorId, coreContentId: MessageDraftV3["coreContentId"], deliveryMode: DeliveryMode = "NORMAL", overrides: Partial<MessageDraftV3> = {}): MessageDraftV3 => ({
  recipientId,
  coreContentId,
  reasonId: "NONE",
  evidenceId: "NONE",
  acknowledgmentId: "NONE",
  promiseId: "NONE",
  offerId: "NONE",
  qualificationId: "NONE",
  conditionId: "NONE",
  warningId: "NONE",
  directness: "PLAIN",
  refusalSpace: true,
  deliveryMode,
  ...overrides,
});

export function planNpcFromBeatStart(world: WorldStateV3, actorId: NpcId): ActorPlan {
  const plan = createEmptyPlan(world, actorId);
  if (!world.actors[actorId].active) return plan;
  const actions: PlannedAction[] = [];
  const add = (action: PlannedAction) => actions.push(action);
  if (actorId === "MARA") {
    const mara = world.actors.MARA;
    if (["NEAR_EXIT", "READY_TO_LEAVE", "FLEE"].includes(mara.maraTrajectory ?? "ENGAGED")) {
      add(mara.position === "NEAR_DOOR" && ["READY_TO_LEAVE", "FLEE"].includes(mara.maraTrajectory ?? "") ? makeInteractAction(world, "MARA", "DOOR", "LEAVE", 1) : makeMoveAction(world, "MARA", "NEAR_DOOR", 1));
      add(makeMessageAction(world, "MARA", npcDraft("PLAYER", "REQUEST_PRIVACY", "LOW_VOICE", { acknowledgmentId: "YOUR_CHOICE" }), 2));
      add(makeScanAction(world, "MARA", "ACTOR", "DREW", 3));
    } else {
      add(makeScanAction(world, "MARA", "ACTOR", "DREW", 1));
      add(makeMessageAction(world, "MARA", npcDraft("PLAYER", "ASK_INTENTIONS", "LOW_VOICE"), 2));
      add(makeMoveAction(world, "MARA", "NEAR_DOOR", 3));
    }
  } else {
    const drew = world.actors.DREW;
    const trajectory = drew.drewTrajectory ?? "NORMAL";
    if (["SECURING", "LOCKDOWN", "EJECT"].includes(trajectory)) {
      if (world.envelope.state === "SECURED") add(makeInteractAction(world, "DREW", "ENVELOPE", "LOCK_AWAY", 1));
      else if (roomDistance(drew.position, world.envelope.position) > 0) add(makeMoveAction(world, "DREW", world.envelope.position, 1));
      else add(makeInteractAction(world, "DREW", "ENVELOPE", world.envelope.state === "GUARDED" ? "SECURE" : "GUARD", 1));
      add(makeMessageAction(world, "DREW", npcDraft("PLAYER", "REPORT_DANGER", "NORMAL", { directness: "BLUNT", warningId: "ENVELOPE_MAY_BE_LOST", refusalSpace: false }), 2));
      add(makeScanAction(world, "DREW", "ACTOR", "MARA", 3));
    } else if (["WATCHFUL", "GUARDING"].includes(trajectory)) {
      add(makeScanAction(world, "DREW", "ACTOR", "MARA", 1));
      add(roomDistance(drew.position, world.envelope.position) > 0 ? makeMoveAction(world, "DREW", world.envelope.position, 2) : makeInteractAction(world, "DREW", "ENVELOPE", "GUARD", 2));
      add(makeMessageAction(world, "DREW", npcDraft("MARA", "ASK_INTENTIONS", "LOW_VOICE"), 3));
    } else {
      add(makeScanAction(world, "DREW", "ROOM", "ROOM", 1));
      add(makeMessageAction(world, "DREW", npcDraft("MARA", "ASK_INTENTIONS", "LOW_VOICE"), 2));
      add(makeMoveAction(world, "DREW", "NEAR_ENVELOPE", 3));
    }
  }
  const next = { ...plan, actions };
  const validation = validatePlan(world, next);
  if (!validation.legal) throw new Error(`NPC planner produced an illegal ${actorId} plan: ${validation.issues.join(" ")}`);
  return next;
}

function terminalFor(world: WorldStateV3): WorldStateV3["terminal"] {
  if (!world.actors.MARA.active && world.actors.MARA.maraTrajectory === "FLEE") return { kind: "MARA_FLED", beat: world.beat, explanation: "Mara's accumulated exit pressure combined with an immediate trigger and a legal exit action." };
  if (world.actors.DREW.drewTrajectory === "EJECT") return { kind: "PLAYER_EJECTED", beat: world.beat, explanation: "Drew's accumulated concern combined with an immediate player trigger." };
  if (world.envelope.state === "LOCKED_AWAY") return { kind: "ENVELOPE_SECURED", beat: world.beat, explanation: "Drew completed the ordinary guard, secure, and lock-away object trajectory." };
  if (world.beat >= world.maxBeats) return { kind: "TURN_LIMIT", beat: world.beat, explanation: "The bounded eight-Beat prototype ended." };
  return null;
}

export interface ResolveBeatOptions {
  npcPlans?: Partial<Record<NpcId, ActorPlan>>;
}

export function resolveBeatV3(input: WorldStateV3, playerPlan: ActorPlan, options: ResolveBeatOptions = {}): WorldStateV3 {
  if (input.terminal) return clone(input);
  const playerValidation = validatePlan(input, playerPlan);
  if (!playerValidation.legal) throw new Error(`Illegal player plan: ${playerValidation.issues.join(" ")}`);
  const world = clone(input);
  const recorder = new MutationRecorderV3(world);
  const beatStart = clone(input);
  const plans: Record<ActorId, ActorPlan> = {
    PLAYER: clone(playerPlan),
    MARA: clone(options.npcPlans?.MARA ?? planNpcFromBeatStart(beatStart, "MARA")),
    DREW: clone(options.npcPlans?.DREW ?? planNpcFromBeatStart(beatStart, "DREW")),
  };
  for (const actorId of ["PLAYER", "MARA", "DREW"] as ActorId[]) {
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
      if (!action || world.terminal) continue;
      const result = resolveAction(world, action, recorder, slot);
      world.lastResolutions.push(result);
      world.terminal = terminalFor(world);
    }
  }
  world.terminal = terminalFor(world);
  if (!world.terminal) {
    const priorBeat = world.beat;
    const advanceContext: MutationContext = { beat: priorBeat, slot: 4, actorId: null, actionId: `ADVANCE_B${priorBeat}`, sourceEventId: `ADVANCE_B${priorBeat}`, status: "NORMAL" };
    recorder.record("beat", priorBeat, priorBeat + 1, "RULE_ADVANCE_SHARED_BEAT", "All committed action slots resolved before the next static tableau.", advanceContext, () => { world.beat = priorBeat + 1; });
    for (const actorId of ["PLAYER", "MARA", "DREW"] as ActorId[]) world.actors[actorId].apCommitted = 0;
    prepareRoomEvent(world, recorder);
  }
  world.stateId = `WORLD_SEED_${world.seed}_B${String(world.beat).padStart(2, "0")}_T${world.traces.length}`;
  return world;
}

export function createInitialSessionV3(seed: number = prototypeConfig.defaultSeed): BehaviorLabSessionV3 {
  const world = createInitialWorldV3(seed);
  return { version: "0.3.0", world, playerPlan: createEmptyPlan(world, "PLAYER"), queueNotice: null, debugVisible: false };
}

export function commitPlayerBeat(session: BehaviorLabSessionV3, options: ResolveBeatOptions = {}): BehaviorLabSessionV3 {
  const validation = validatePlan(session.world, session.playerPlan);
  if (!validation.legal) return { ...session, queueNotice: validation.issues[0] ?? "The Beat plan is illegal." };
  const world = resolveBeatV3(session.world, session.playerPlan, options);
  return {
    ...session,
    world,
    playerPlan: createEmptyPlan(world, "PLAYER"),
    queueNotice: world.terminal ? world.terminal.explanation : `Beat ${session.world.beat} resolved. Read the new tableau before planning Beat ${world.beat}.`,
  };
}

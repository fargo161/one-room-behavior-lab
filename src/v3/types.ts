export const actorIds = ["PLAYER", "MARA", "DREW"] as const;
export type ActorId = (typeof actorIds)[number];
export type NpcId = Exclude<ActorId, "PLAYER">;

/** PROVISIONAL / PROTOTYPE-LOCAL: physical topology only. */
export const roomAnchors = ["CENTER", "TABLE", "DOOR", "WINDOW", "CABINET"] as const;
export type RoomAnchor = (typeof roomAnchors)[number];

export type ActionKind = "MOVE" | "MESSAGE" | "SCAN" | "INTERACT" | "DISTRACT";
export type ResolutionStatus = "NORMAL" | "DEGRADED" | "NATURAL_RETARGET" | "INVALIDATED" | "CANCELLED_BY_TERMINAL";
export type ReceptionKind = "DIRECT" | "OVERHEARD_FULL" | "OVERHEARD_PARTIAL" | "NOTICED_ONLY" | "NONE";
export type DeliveryMode = "NORMAL" | "LOW_VOICE" | "WHISPER";
export type Attribution = "NONE" | "POSSIBLE" | "LIKELY" | "DIRECT";
export type ObjectState = "AVAILABLE" | "HELD" | "GUARDED" | "MOVED" | "SECURED" | "LOCKED_AWAY";
export type DrewTrajectory = "NORMAL" | "WATCHFUL" | "GUARDING" | "SECURING" | "LOCKDOWN" | "EJECT";
export type MaraTrajectory = "ENGAGED" | "UNEASY" | "NEAR_EXIT" | "READY_TO_LEAVE" | "FLEE";
export type FaceState = "COMPOSED" | "ATTENTIVE" | "UNEASY" | "TENSE" | "RESOLVED" | "CLOSED";

export interface AttentionTarget {
  kind: "ACTOR" | "OBJECT" | "LOCATION" | "ROOM_EVENT" | "TASK";
  id: string;
}

export type CoreContentId =
  | "ASK_FOR_ENVELOPE"
  | "ASK_INTENTIONS"
  | "OFFER_HELP"
  | "SHARE_AUTHORIZATION"
  | "REQUEST_PRIVACY"
  | "WARN_ABOUT_EXIT"
  | "REPORT_DANGER";
export type ReasonId = "NONE" | "SAFETY" | "AUTHORIZATION" | "TRUST" | "TIME_PRESSURE";
export type EvidenceId = "NONE" | "SIGNED_NOTE" | "OPEN_DOOR" | "MARA_STATEMENT" | "DREW_GLANCES";
export type AcknowledgmentId = "NONE" | "YOUR_CONCERN" | "YOUR_CHOICE" | "THE_RISK";
export type PromiseId = "NONE" | "RETURN_ENVELOPE" | "KEEP_CONFIDENCE" | "LEAVE_AFTER";
export type OfferId = "NONE" | "SHOW_AUTHORIZATION" | "HELP_MARA" | "STEP_BACK";
export type QualificationId = "NONE" | "IF_I_AM_RIGHT" | "ONLY_FOR_A_MOMENT" | "AS_FAR_AS_I_KNOW";
export type ConditionId = "NONE" | "IF_MARA_AGREES" | "IF_DREW_STEPS_AWAY" | "IF_DOOR_STAYS_OPEN";
export type WarningId = "NONE" | "MARA_MAY_LEAVE" | "ENVELOPE_MAY_BE_LOST" | "OTHERS_MAY_NOTICE";
export type Directness = "GENTLE" | "PLAIN" | "BLUNT";

export interface MessageDraftV3 {
  recipientId: ActorId;
  coreContentId: CoreContentId;
  reasonId: ReasonId;
  evidenceId: EvidenceId;
  acknowledgmentId: AcknowledgmentId;
  promiseId: PromiseId;
  offerId: OfferId;
  qualificationId: QualificationId;
  conditionId: ConditionId;
  warningId: WarningId;
  directness: Directness;
  refusalSpace: boolean;
  deliveryMode: DeliveryMode;
}

export type MessageComponentCategory =
  | "reasonId"
  | "evidenceId"
  | "acknowledgmentId"
  | "promiseId"
  | "offerId"
  | "qualificationId"
  | "conditionId"
  | "warningId"
  | "refusalSpace";

export interface MessageCompatibilityResult {
  valid: boolean;
  invalidReasons: string[];
  requiredMissing: MessageComponentCategory[];
  unavailableComponents: MessageComponentCategory[];
  riskyComponents: MessageComponentCategory[];
  componentStatuses: Partial<Record<MessageComponentCategory, MessageSemanticStatus>>;
}

export type MessageSemanticStatus = "RELEVANT" | "SUPPORTED" | "RISKY_UNSUPPORTED" | "UNAVAILABLE" | "INCOMPATIBLE" | "REQUIRED";

export interface PackagingEvidence {
  directness: Directness;
  delivery: DeliveryMode;
  explicitness: "LOW" | "MEDIUM" | "HIGH";
  qualification: boolean;
  hedging: boolean;
  closure: "OPEN" | "CONDITIONAL" | "CLOSED";
  emphasis: "LOW" | "MEDIUM" | "HIGH";
  acknowledgment: boolean;
  refusalSpace: boolean;
  explanationDensity: number;
  turnBehavior: "YIELDS" | "HOLDS";
}

export interface StructuredMessageEvent {
  id: string;
  version: "0.3.0";
  beat: number;
  senderId: ActorId;
  intendedRecipients: ActorId[];
  coreContentId: CoreContentId;
  components: Omit<MessageDraftV3, "recipientId" | "coreContentId" | "deliveryMode">;
  deliveryMode: DeliveryMode;
  packagingEvidence: PackagingEvidence;
  surfaceText: string;
}

export interface ReceptionRecord {
  id: string;
  beat: number;
  messageId: string;
  actorId: ActorId;
  kind: ReceptionKind;
  content: string | null;
  fragment: string | null;
  deliveryResolvedAs: DeliveryMode;
  sourceTraceRefs: string[];
}

export interface ObservationRecord {
  id: string;
  beat: number;
  actorId: ActorId;
  target: string;
  evidence: string[];
  sourceActionId: string;
}

export interface DistractionBelief {
  actionId: string;
  beat: number;
  targetActorId: NpcId;
  success: boolean;
  attribution: Attribution;
  exploited: boolean;
}

export interface ActorStateV3 {
  id: ActorId;
  name: string;
  active: boolean;
  position: RoomAnchor;
  attention: AttentionTarget;
  gaze: string;
  orientation: string;
  posture: string;
  hands: string;
  face: FaceState;
  apCommitted: number;
  observations: ObservationRecord[];
  distractionBeliefs: DistractionBelief[];
  vigilance: number;
  guardCompromisedUntilBeat: number | null;
  drewConcern: number;
  maraExitPressure: number;
  drewTrajectory: DrewTrajectory | null;
  maraTrajectory: MaraTrajectory | null;
}

export interface EnvelopeState {
  id: "ENVELOPE";
  state: ObjectState;
  position: RoomAnchor;
  holderId: ActorId | null;
  guardedBy: ActorId | null;
  visible: boolean;
}

export type RoomEventFamily = "DISTRACTION" | "OCCUPATION" | "INTERRUPTION" | "REVEAL_ACCESS" | "POSITION_CHANGE";
export type RoomEventEffectId = "HALLWAY_INTERRUPTION" | "OPEN_DOOR" | "LIGHT_OCCUPATION" | "REVEAL_ENVELOPE" | "NATURAL_PHONE_DISTRACTION";

export interface RoomEventState {
  id: string;
  beat: number;
  family: RoomEventFamily;
  effectId: RoomEventEffectId;
  title: string;
  description: string;
  noise: "QUIET" | "MODERATE" | "LOUD";
  attentionActorId: ActorId | null;
  attentionTarget: AttentionTarget | null;
  actionableEffect: string;
  durationBeats: number | null;
}

export interface TemporaryAffordance {
  id: "ENVELOPE_REVEALED" | "DREW_NATURALLY_DISTRACTED" | "LIGHT_FLICKER_OPENING";
  sourceEventId: string;
  expiresAfterBeat: number;
}

export interface TransientExpression {
  actorId: ActorId;
  channel: "hands";
  value: string;
  sourceEventId: string;
  expiresAfterBeat: number;
}

export interface RoomStateV3 {
  doorOpen: boolean;
  envelopeAccessRevealed: boolean;
  temporaryAffordances: TemporaryAffordance[];
  transientExpressions: TransientExpression[];
}

interface BaseAction {
  id: string;
  actorId: ActorId;
  kind: ActionKind;
  cost: 1;
  beat: number;
  ordinal: number;
}

export type MoveTarget = { kind: "LOCATION"; id: RoomAnchor } | { kind: "ACTOR"; id: ActorId };

export interface MoveAction extends BaseAction {
  kind: "MOVE";
  target: MoveTarget;
  plannedTargetPosition: RoomAnchor;
}

export interface MessageAction extends BaseAction {
  kind: "MESSAGE";
  message: StructuredMessageEvent;
  plannedSenderPosition: RoomAnchor;
  plannedRecipientPositions: Partial<Record<ActorId, RoomAnchor>>;
  plannedCompatibility: MessageCompatibilityResult;
}

export interface ScanAction extends BaseAction {
  kind: "SCAN";
  targetType: "ACTOR" | "ROOM" | "OBJECT";
  targetId: ActorId | "ROOM" | "ENVELOPE";
}

export type InteractionOperation = "TAKE" | "PLACE_ON_TABLE" | "INSPECT" | "GUARD" | "SECURE" | "LOCK_AWAY" | "LEAVE";
export interface InteractAction extends BaseAction {
  kind: "INTERACT";
  targetId: "ENVELOPE" | "DOOR";
  operation: InteractionOperation;
  plannedTargetPosition: RoomAnchor;
}

export type DistractionMode = "VISIBLE_CALL" | "COVERT_WINDOW_RATTLE";
export interface DistractAction extends BaseAction {
  kind: "DISTRACT";
  targetActorId: NpcId;
  mode: DistractionMode;
}

export type PlannedAction = MoveAction | MessageAction | ScanAction | InteractAction | DistractAction;

export interface PlannerCandidateRationale {
  label: string;
  goal: keyof NpcPriorityWeights;
  weight: number;
  legal: boolean;
  selected: boolean;
  reason: string;
}

export interface PlannerRationale {
  actorId: NpcId;
  hardConstraint: string | null;
  candidates: PlannerCandidateRationale[];
}

export interface ActorPlan {
  actorId: ActorId;
  beat: number;
  actions: PlannedAction[];
  plannedFromStateId: string;
  rationale?: PlannerRationale;
}

export interface NpcPriorityWeights {
  protectEnvelope: number;
  preserveExit: number;
  seekInformation: number;
  communicateConcern: number;
  approachOrAvoid: number;
}

export interface DistractionOutcome {
  success: boolean;
  visibilityByObserver: Record<NpcId, ObserverVisibility>;
  attributionByObserver: Record<NpcId, Attribution>;
}

export interface ObserverVisibility {
  eventVisible: boolean;
  playerActionVisible: boolean;
  causalVisibility: boolean;
}

export interface MessageIdentityLineage {
  plannedMessageId: string;
  effectiveMessageId: string;
  degradedFromMessageId: string | null;
}

export interface ActionResolution {
  id: string;
  beat: number;
  slot: number;
  actorId: ActorId;
  actionId: string;
  actionKind: ActionKind;
  status: ResolutionStatus;
  summary: string;
  apSpent: 1;
  sourceTraceRefs: string[];
  receptionIds: string[];
  distraction: DistractionOutcome | null;
  messageCompatibility: MessageCompatibilityResult | null;
  messageIdentity: MessageIdentityLineage | null;
}

export interface MutationTraceV3 {
  id: string;
  beat: number;
  slot: number;
  sequence: number;
  actorId: ActorId | null;
  actionId: string;
  sourceEventId: string;
  path: string;
  priorState: unknown;
  newState: unknown;
  ruleId: string;
  cause: string;
  resolutionStatus: ResolutionStatus;
  receptionResult: ReceptionKind | null;
  visibility: string | null;
  attribution: Attribution | null;
  sourceTraceRefs: string[];
}

export interface CausalHistoryEvent {
  id: string;
  beat: number;
  actorId: ActorId | null;
  actionId: string;
  text: string;
  traceRefs: string[];
  playerVisible: boolean;
}

export interface TerminalStateV3 {
  kind: "PLAYER_EJECTED" | "MARA_FLED" | "ENVELOPE_SECURED" | "TURN_LIMIT";
  beat: number;
  explanation: string;
  sourceTraceRefs: string[];
}

export interface WorldStateV3 {
  version: "0.3.0";
  stateId: string;
  seed: number;
  beat: number;
  maxBeats: number;
  actors: Record<ActorId, ActorStateV3>;
  envelope: EnvelopeState;
  room: RoomStateV3;
  roomNoise: "QUIET" | "MODERATE" | "LOUD";
  currentRoomEvent: RoomEventState;
  roomEvents: RoomEventState[];
  messages: StructuredMessageEvent[];
  receptions: ReceptionRecord[];
  traces: MutationTraceV3[];
  history: CausalHistoryEvent[];
  lastPlans: Partial<Record<ActorId, ActorPlan>>;
  lastResolutions: ActionResolution[];
  terminal: TerminalStateV3 | null;
}

export interface PlanValidation {
  legal: boolean;
  issues: string[];
  apCommitted: number;
  apRemaining: number;
}

export interface BehaviorLabSessionV3 {
  version: "0.3.0";
  world: WorldStateV3;
  playerPlan: ActorPlan;
  queueNotice: string | null;
  debugVisible: boolean;
}

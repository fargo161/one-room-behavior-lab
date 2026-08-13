export const actorIds = ["PLAYER", "MARA", "DREW"] as const;
export type ActorId = (typeof actorIds)[number];
export type NpcId = Exclude<ActorId, "PLAYER">;

export const roomAnchors = [
  "CENTER",
  "NEAR_MARA",
  "NEAR_DREW",
  "NEAR_TABLE",
  "NEAR_ENVELOPE",
  "NEAR_DOOR",
  "NEAR_WINDOW",
] as const;
export type RoomAnchor = (typeof roomAnchors)[number];

export type ActionKind = "MOVE" | "MESSAGE" | "SCAN" | "INTERACT" | "DISTRACT";
export type ResolutionStatus = "NORMAL" | "DEGRADED" | "NATURAL_RETARGET" | "INVALIDATED";
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

export interface PackagingEvidence {
  directness: Directness;
  explicitness: "LOW" | "MEDIUM" | "HIGH";
  qualification: boolean;
  hedging: boolean;
  closure: "OPEN" | "CONDITIONAL" | "CLOSED";
  fragmentation: "LOW";
  emphasis: "LOW" | "MEDIUM" | "HIGH";
  acknowledgment: boolean;
  refusalSpace: boolean;
  repetition: false;
  explanationDensity: number;
  punctuationFeatures: string[];
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

export interface RoomEventState {
  id: string;
  beat: number;
  family: "DISTRACTION" | "OCCUPATION" | "INTERRUPTION" | "REVEAL_ACCESS" | "POSITION_CHANGE";
  title: string;
  description: string;
  noise: "QUIET" | "MODERATE" | "LOUD";
  attentionActorId: ActorId | null;
  attentionTarget: AttentionTarget | null;
  actionableEffect: string;
}

interface BaseAction {
  id: string;
  actorId: ActorId;
  kind: ActionKind;
  cost: 1;
  beat: number;
  ordinal: number;
}

export interface MoveAction extends BaseAction {
  kind: "MOVE";
  target: RoomAnchor;
}

export interface MessageAction extends BaseAction {
  kind: "MESSAGE";
  message: StructuredMessageEvent;
  plannedSenderPosition: RoomAnchor;
  plannedRecipientPositions: Partial<Record<ActorId, RoomAnchor>>;
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
}

export type DistractionMode = "VISIBLE_CALL" | "COVERT_WINDOW_RATTLE";
export interface DistractAction extends BaseAction {
  kind: "DISTRACT";
  targetActorId: NpcId;
  mode: DistractionMode;
}

export type PlannedAction = MoveAction | MessageAction | ScanAction | InteractAction | DistractAction;

export interface ActorPlan {
  actorId: ActorId;
  beat: number;
  actions: PlannedAction[];
  plannedFromStateId: string;
}

export interface DistractionOutcome {
  success: boolean;
  eventVisible: boolean;
  playerActionVisible: boolean;
  causalVisibility: boolean;
  attribution: Attribution;
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
}

export interface TerminalStateV3 {
  kind: "PLAYER_EJECTED" | "MARA_FLED" | "ENVELOPE_SECURED" | "TURN_LIMIT";
  beat: number;
  explanation: string;
}

export interface WorldStateV3 {
  version: "0.3.0";
  stateId: string;
  seed: number;
  beat: number;
  maxBeats: number;
  actors: Record<ActorId, ActorStateV3>;
  envelope: EnvelopeState;
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

export type CharacterId = "MARA" | "DREW";
export type LocationId = "CHAIR" | "TABLE" | "EXIT";
export type AttentionTarget = CharacterId | "ENVELOPE" | "PLAYER_CHANNEL" | "EXIT" | null;
export type Dpa = "ASK" | "DEAL" | "PRESSURE";
export type Visibility = "PRIVATE" | "PUBLIC";
export type CueCode = "B" | "A" | "S" | "E" | "D";
export type VibeCode = `${CueCode}${CueCode}`;
export type BeatPhase = "PLAYER_COMPOSING" | "MESSAGE_QUEUED" | "RESOLVING" | "OBSERVING" | "TERMINAL";
export type EpistemicStatus = "ASSUMED" | "REPORTED" | "INFERRED" | "OBSERVED" | "DOUBTED" | "REFUTED";
export type SubjectId = "MARA" | "DREW" | "ENVELOPE" | "PLAYER" | "AUTHORIZATION" | "TRANSFER" | "ATTENTION" | "EXIT";

export type FunctionalElementId =
  | "ACQUIRE_TARGET"
  | "PROTECT_TARGET"
  | "CREATE_OPPORTUNITY"
  | "REDUCE_RISK"
  | "VERIFY_INFORMATION"
  | "REDUCE_UNCERTAINTY"
  | "MAINTAIN_CONTROL"
  | "PRESERVE_RELATIONSHIP"
  | "DISCHARGE_OBLIGATION"
  | "CONCEAL_STATE"
  | "EXPOSE_DECEPTION"
  | "EXIT_SITUATION";

export type PlayerFunctionId =
  | "CREATE_OPPORTUNITY"
  | "VERIFY_INFORMATION"
  | "REDUCE_UNCERTAINTY"
  | "PRESERVE_RELATIONSHIP"
  | "DISCHARGE_OBLIGATION"
  | "MAINTAIN_CONTROL"
  | "REDUCE_RISK"
  | "EXIT_SITUATION";

export type BehaviorId =
  | "WAIT"
  | "MONITOR_DREW"
  | "QUESTION_DREW"
  | "APPROACH_ENVELOPE"
  | "ACCEPT_TRANSFER"
  | "TAKE_ENVELOPE"
  | "CONCEAL_ENVELOPE"
  | "LEAVE"
  | "ABANDON_OBJECTIVE"
  | "GUARD_ENVELOPE"
  | "WATCH_MARA"
  | "QUESTION_MARA"
  | "QUESTION_PLAYER"
  | "VERIFY_CLAIM"
  | "MOVE_ENVELOPE"
  | "OFFER_TRANSFER"
  | "COMPLETE_TRANSFER"
  | "REFUSE"
  | "CONFRONT_MARA"
  | "LOCK_DOWN_ROOM"
  | "FEIGN_COMPLIANCE";

export type TerminalKind = "SUCCESS" | "FULL_ALERT" | "PLAYER_EXPOSED" | "MARA_LEFT_EMPTY_HANDED" | "TURN_LIMIT";
export type PropositionKind = "CLAIM" | "REQUESTED_ACTION" | "DESIRED_STATE" | "WARNING";
export type ExchangeStatus = "PROPOSED" | "CONSIDERED" | "ACCEPTED" | "REJECTED" | "FULFILLED" | "BREACHED";

export interface AskPayload { reasonId?: string | null }
export interface DealPayload { offeredValueId: string | null; conditionId?: string | null }
export interface PressurePayload { consequenceId: string | null; leverageId?: string | null }

export interface MessageDraft {
  recipientId: CharacterId | null;
  subjectId: SubjectId | null;
  dpa: Dpa | null;
  functionId: PlayerFunctionId | null;
  visibility: Visibility | null;
  deliveryVibe: VibeCode | null;
  propositionId: string | null;
  askPayload?: AskPayload;
  dealPayload?: DealPayload;
  pressurePayload?: PressurePayload;
}

export interface StructuredMessage {
  id: string;
  version: "0.2";
  beat: number;
  senderId: "PLAYER";
  recipientId: CharacterId;
  subjectId: SubjectId;
  dpa: Dpa;
  functionId: PlayerFunctionId;
  visibility: Visibility;
  deliveryVibe: VibeCode;
  propositionId: string;
  askPayload?: AskPayload;
  dealPayload?: DealPayload;
  pressurePayload?: PressurePayload;
  surfaceText: string;
  validationRefs: string[];
}

export interface ValidationIssue {
  field: keyof MessageDraft | "message";
  code: string;
  explanation: string;
}

export interface MessageValidation {
  valid: boolean;
  issues: ValidationIssue[];
  validationRefs: string[];
}

export interface PropositionDefinition {
  id: string;
  version: "0.2-provisional";
  label: string;
  kind: PropositionKind;
  subjectIds: SubjectId[];
  allowedRecipients: CharacterId[];
  allowedDpa: Dpa[];
  compatibleFunctions: PlayerFunctionId[];
  referencedEntities: string[];
  requestedBehavior?: BehaviorId;
  beliefPredicate?: string;
  reportedValue?: string | boolean;
  worldEvaluationRule?: string;
  renderFragments: Record<Dpa, string | null>;
  boundaryNotes: string[];
}

export interface DpaDefinition {
  id: Dpa;
  version: "0.2-provisional";
  label: string;
  conciseDefinition: string;
  boundary: string;
  baseline: {
    value: number;
    threat: number;
    burden: number;
    voluntariness: number;
    urgency: number;
    credibility: number;
    resistance: number;
  };
}

export interface BasedPrototypeModifiers {
  credibility: number;
  value: number;
  threat: number;
  voluntariness: number;
  urgency: number;
  resistance: number;
  tension: number;
  leakage: number;
}

export interface BasedVibeDefinition {
  code: VibeCode;
  version: "0.2-provisional";
  dominantCue: CueCode;
  secondaryCue: CueCode;
  prototypeDefaultCueShare: { dominant: number; secondary: number };
  status: "PROTOTYPE_PROVISIONAL" | "RESERVED_UNMAPPED";
  canonicalName?: string;
  scenarioAlias?: string;
  prototypeModifiers?: BasedPrototypeModifiers;
  performanceTags?: string[];
  notes: string;
}

export interface BasedReceptionProfile {
  characterId: CharacterId;
  version: "0.2-provisional";
  cueSensitivities: Partial<Record<CueCode, number>>;
  vibeOverrides: Partial<Record<VibeCode, Partial<BasedPrototypeModifiers>>>;
  stateConditionRules: string[];
  boundaryNotes: string[];
}

export interface FunctionalDefinition {
  id: FunctionalElementId;
  version: "0.2-provisional";
  label: string;
  conciseDefinition: string;
  boundary: string;
  activationRuleIds: string[];
  satisfactionRuleIds: string[];
  compatibleFunctions: FunctionalElementId[];
  conflictingFunctions: FunctionalElementId[];
  commonlyServedBy: BehaviorId[];
  messageApplications: Array<{ recipientId: CharacterId | "ANY"; result: string; ruleId: string }>;
  operationalStatus: "OPERATIONAL" | "PARTIAL" | "PROVISIONAL_INACTIVE";
  operationalNote: string;
  provenance: "PROTOTYPE_PROVISIONAL";
}

export interface GoalState {
  id: string;
  version: "0.2";
  ownerId: CharacterId;
  description: string;
  priority: number;
  activation: number;
  status: "ACTIVE" | "BLOCKED" | "SATISFIED" | "ABANDONED";
  satisfactionRuleId: string;
  failureRuleId: string;
  sourceRefs: string[];
}

export interface Belief {
  id: string;
  version: "0.2";
  subjectId: string;
  predicate: string;
  value: string | number | boolean | null;
  confidence: number;
  source: "INITIAL" | "MESSAGE" | "OBSERVATION" | "INFERENCE";
  acquiredBeat: number;
  lastConfirmedBeat?: number;
  status: EpistemicStatus;
  sourceRefs: string[];
}

export interface InferenceRecord {
  id: string;
  version: "0.2";
  beat: number;
  characterId: CharacterId;
  kind: "POSSIBLE_COORDINATION" | "POSSIBLE_MANIPULATION" | "POSSIBLE_WARNING";
  confidence: number;
  evidenceRefs: string[];
  unavailableFacts: string[];
  status: "ACTIVE" | "REFUTED";
  explanation: string;
}

export interface CharacterMetrics {
  trustInPlayer: number;
  suspicionOfOther: number;
  alert: number;
  nerve: number;
  perceivedRisk: number;
  perceivedOpportunity: number;
  commitmentToDuty: number;
}

export interface AttentionState {
  primaryTarget: AttentionTarget;
  secondaryTarget?: AttentionTarget;
  strength: number;
  reasonRefs: string[];
  lastChangedBeat: number;
}

export interface IntentState {
  behaviorId: BehaviorId | null;
  commitment: number;
  announced: boolean;
  concealed: boolean;
  sourcePressureRefs: string[];
  planId?: string;
}

export interface PlanRecord {
  id: string;
  version: "0.2";
  ownerId: CharacterId;
  kind: "MONITOR_FOR_OPENING" | "TEST_PLAYER" | "CONCEAL_RESISTANCE";
  status: "ACTIVE" | "SATISFIED" | "ABANDONED";
  createdBeat: number;
  sourceRefs: string[];
}

export interface CharacterState {
  id: CharacterId;
  name: string;
  role: string;
  location: LocationId;
  hasEnvelope: boolean;
  metrics: CharacterMetrics;
  beliefs: Belief[];
  inferences: InferenceRecord[];
  goals: GoalState[];
  plans: PlanRecord[];
  attention: AttentionState;
  intent: IntentState;
  lastBehavior: BehaviorId | null;
  visibleAction: string;
  visibleLine: string;
}

export interface CommunicationEvent {
  id: string;
  version: "0.2";
  beat: number;
  senderId: "PLAYER";
  recipientId: CharacterId;
  visibility: Visibility;
  messageId: string;
  salience: number;
  sourceRefs: string[];
}

export interface NoticeComponent {
  id: string;
  label: string;
  value: number;
  ruleId: string;
  explanation: string;
}

export interface CommunicationPerception {
  id: string;
  version: "0.2";
  beat: number;
  observerId: CharacterId;
  observerRole: "RECIPIENT" | "OBSERVER";
  eventId: string;
  noticedEvent: boolean;
  contentAccess: "FULL" | "NONE";
  confidence: number;
  noticeScore: number;
  noticeThreshold: number;
  noticeComponents: NoticeComponent[];
  perceivedFacts: string[];
  unavailableFacts: string[];
  attentionRefs: string[];
  explanation: string;
}

export interface ScoreComponent {
  id: string;
  label: string;
  value: number;
  sourceRefs: string[];
  ruleId: string;
  explanation: string;
}

export interface FunctionalApplication {
  id: string;
  version: "0.2-provisional";
  beat: number;
  recipientId: CharacterId;
  intendedFunctionId: PlayerFunctionId;
  interpretedFunctionId: FunctionalElementId;
  accepted: boolean;
  effectKind: "PRESSURE" | "PLAN" | "RESISTANCE" | "SATISFACTION";
  amount: number;
  ruleId: string;
  sourceRefs: string[];
  explanation: string;
}

export interface InterpretationRecord {
  id: string;
  version: "0.2";
  beat: number;
  characterId: CharacterId;
  observerRole: "RECIPIENT" | "OBSERVER";
  messageId?: string;
  eventId: string;
  contentAccess: "FULL" | "NONE";
  relevance: number;
  beliefConsistency: number;
  sourceTrust: number;
  perceivedCredibility: number;
  perceivedValue: number;
  perceivedThreat: number;
  perceivedBurden: number;
  perceivedVoluntariness: number;
  perceivedUrgency: number;
  resistance: number;
  suspectedMotive: string[];
  claimAccepted: boolean;
  requestAccepted: boolean;
  dealAccepted: boolean;
  threatBelieved: boolean;
  presentedCompliance: boolean;
  acceptedClaims: string[];
  doubtedClaims: string[];
  functionalApplications: FunctionalApplication[];
  dpaBreakdown: ScoreComponent[];
  basedBreakdown: ScoreComponent[];
  beliefRefs: string[];
  perceptionRef: string;
  explanation: string;
}

export interface ExchangeRecord {
  id: string;
  version: "0.2";
  beat: number;
  proposerId: "PLAYER";
  recipientId: CharacterId;
  requestedPropositionId: string;
  requestedAction: BehaviorId | null;
  offeredValueId: string;
  status: ExchangeStatus;
  acceptedBeat?: number;
  sourceRefs: string[];
}

export interface CommitmentRecord {
  id: string;
  version: "0.2";
  debtorId: CharacterId | "PLAYER";
  creditorId: CharacterId | "PLAYER";
  kind: string;
  propositionId: string;
  requestedAction: BehaviorId;
  status: "ACTIVE" | "FULFILLED" | "BREACHED";
  createdBeat: number;
  sourceRefs: string[];
}

export interface TransferOffer {
  id: string;
  version: "0.2";
  fromId: "DREW";
  toId: "MARA";
  objectId: "ENVELOPE";
  status: "OPEN" | "ACCEPTED" | "WITHDRAWN" | "COMPLETED";
  createdBeat: number;
  sourceRefs: string[];
}

export interface PendingQuestion {
  id: string;
  version: "0.2";
  askerId: CharacterId;
  addresseeId: CharacterId | "PLAYER";
  subjectId: SubjectId;
  status: "OPEN" | "ANSWERED" | "ABANDONED";
  createdBeat: number;
  sourceRefs: string[];
}

export interface RefusalRecord {
  id: string;
  version: "0.2";
  actorId: CharacterId;
  messageId?: string;
  status: "ACTIVE" | "OVERRIDDEN";
  createdBeat: number;
  sourceRefs: string[];
}

export interface SocialState {
  exchanges: ExchangeRecord[];
  commitments: CommitmentRecord[];
  transferOffers: TransferOffer[];
  pendingQuestions: PendingQuestion[];
  refusals: RefusalRecord[];
}

export interface FunctionalPressure {
  id: string;
  version: "0.2-provisional";
  characterId: CharacterId;
  functionId: FunctionalElementId;
  weight: number;
  activation: number;
  urgency: number;
  confidence: number;
  sourceRefs: string[];
  boundaryNotes: string[];
  satisfaction: "UNSATISFIED" | "SATISFIED" | "SUPPRESSED";
  usedByBehaviorIds: BehaviorId[];
}

export interface BehaviorDefinition {
  id: BehaviorId;
  version: "0.2";
  actorId: CharacterId;
  label: string;
  description: string;
  baseScore: number;
  servesFunctions: FunctionalElementId[];
  allowedExecutionVibes: VibeCode[];
  defaultExecutionVibe: VibeCode;
  effectRuleIds: string[];
  visibleAction: string;
  line: string;
  status: "ACTIVE";
}

export interface BehaviorScore {
  behaviorId: BehaviorId;
  eligible: boolean;
  ineligibilityReasons: string[];
  components: ScoreComponent[];
  total: number;
  tieBreakKey: string;
  tieBreakReason: string;
  selected: boolean;
}

export interface JointActionRecord {
  id: string;
  version: "0.2";
  beat: number;
  kind: "JOINT_TRANSFER";
  participantIds: CharacterId[];
  compatibleIntentIds: BehaviorId[];
  matched: boolean;
  effectRuleId: string;
  sourceRefs: string[];
  explanation: string;
}

export interface FacePose {
  browInnerHeight: number;
  browOuterHeight: number;
  browAngle: number;
  eyeOpennessLeft: number;
  eyeOpennessRight: number;
  gazeX: number;
  gazeY: number;
  mouthCornerLeft: number;
  mouthCornerRight: number;
  mouthOpenness: number;
  mouthWidth: number;
  jawTension: number;
  headTurn: number;
  headTilt: number;
  asymmetry: number;
  overallTension: number;
}

export interface TextParalanguagePlan {
  lineTemplateId: string;
  initialDelayMs: number;
  tempo: "SLOW" | "MEASURED" | "NORMAL" | "QUICK" | "ABRUPT";
  volume: "LOW" | "NORMAL" | "RAISED";
  pausePositions: number[];
  emphasisRanges: Array<{ start: number; end: number }>;
  hesitation: number;
  completion: "FULL" | "CLIPPED" | "TRAILED" | "INTERRUPTED";
  punctuationPattern: string;
  repetition: number;
  correction: boolean;
  revealIntervalMs: number;
}

export interface PerformancePlan {
  id: string;
  version: "0.2-provisional";
  actorId: CharacterId;
  behaviorId: BehaviorId;
  executionVibe: VibeCode;
  internalStanceTags: string[];
  presentedStanceTags: string[];
  concealmentIntent: number;
  leakage: number;
  gazeTarget: AttentionTarget;
  facePose: FacePose;
  textPlan: TextParalanguagePlan;
  actionPresentationId: string;
  line: string;
  sourceRefs: string[];
}

export interface StateDiff {
  path: string;
  before: unknown;
  after: unknown;
  traceRef: string;
  ruleId: string;
  explanation: string;
  sourceRefs: string[];
}

export interface BuilderFieldIntegrity {
  field: "RECIPIENT" | "SUBJECT" | "DPA" | "FUNCTION" | "VISIBILITY" | "DELIVERY_VIBE" | "PROPOSITION" | "DPA_TERMS";
  role: "MECHANICAL" | "SEMANTIC_METADATA" | "PRESENTATIONAL" | "CONDITIONAL";
  contributesTo: string[];
  canAffectBehavior: boolean;
  provisional: boolean;
  explanation: string;
}

export interface TraceEvent {
  id: string;
  version: "0.2";
  beat: number;
  phase: string;
  type: string;
  actorId?: CharacterId | "PLAYER";
  observerId?: CharacterId;
  recipientId?: CharacterId;
  elementRefs: string[];
  sourceRefs: string[];
  ruleId: string;
  path?: string;
  before?: unknown;
  after?: unknown;
  explanation: string;
}

export interface TerminalState {
  kind: TerminalKind;
  title: string;
  explanation: string;
  route?: "OPPORTUNITY" | "NEGOTIATED";
  ruleId: string;
}

export interface ResolvedBeat {
  version: "0.2";
  beat: number;
  queuedMessage: StructuredMessage | null;
  communicationEvent: CommunicationEvent | null;
  perceptions: CommunicationPerception[];
  interpretations: InterpretationRecord[];
  beliefChanges: Array<{ characterId: CharacterId; beliefId: string; status: EpistemicStatus; sourceRef: string }>;
  functionalApplications: FunctionalApplication[];
  builderFieldIntegrity: BuilderFieldIntegrity[];
  functionalPressures: Record<CharacterId, FunctionalPressure[]>;
  candidates: Record<CharacterId, BehaviorScore[]>;
  selectedIntents: Record<CharacterId, BehaviorId>;
  jointActions: JointActionRecord[];
  performances: Record<CharacterId, PerformancePlan>;
  diffs: StateDiff[];
  trace: TraceEvent[];
  summary: string[];
}

export interface WorldState {
  scenarioId: "one-room-v0.2";
  version: "0.2";
  beat: number;
  maxBeats: number;
  phase: BeatPhase;
  terminalState: TerminalState | null;
  characters: Record<CharacterId, CharacterState>;
  envelope: { id: "ENVELOPE"; location: LocationId | null; holder: CharacterId | null; visible: boolean };
  exitAccessible: boolean;
  player: { exposure: number; reliabilityBeliefSeed: number };
  social: SocialState;
  history: ResolvedBeat[];
  eventLog: string[];
}

export interface GameSession {
  version: "0.2";
  world: WorldState;
  phase: BeatPhase;
  draft: MessageDraft;
  queuedMessage: StructuredMessage | null;
  queueNotice: string | null;
}

export interface ScenarioDefinition {
  id: "one-room-v0.2";
  version: "0.2";
  maxBeats: number;
  thresholds: {
    fullAlert: number;
    fullExposure: number;
    noticeCommunication: number;
    takeOpportunity: number;
    takeNerve: number;
    abandonRisk: number;
  };
  initialWorld: Omit<WorldState, "history">;
}

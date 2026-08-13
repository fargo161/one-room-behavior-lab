import type {
  BehaviorDefinition, BehaviorId, BehaviorScore, CharacterId, CommunicationEvent, CommunicationPerception,
  FunctionalApplication, FunctionalElementId, FunctionalPressure, GameSession, InterpretationRecord, JointActionRecord,
  MessageDraft, NoticeComponent, PerformancePlan, ResolvedBeat, ScoreComponent, StateDiff, StructuredMessage,
  TerminalState, TraceEvent, WorldState,
} from "../core/types";
import { drewBehaviors, getBehavior, maraBehaviors } from "../data/behaviors";
import { getVibe, receptionProfiles } from "../data/based";
import { consequenceWeights, exchangeValueWeights } from "../data/commitments";
import { getDpa } from "../data/dpa";
import { functionalDefinitions, getFunction } from "../data/functions";
import { buildStructuredMessage, builderFieldIntegrity, emptyDraft, validateDraft } from "../data/messageGrammar";
import { buildPerformance } from "../data/performance";
import { perceptionRules } from "../data/perceptionRules";
import { getProposition } from "../data/propositions";
import { createInitialWorld, scenario } from "../data/scenario";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Math.round(value * 1000) / 1000;
const copy = <T,>(value: T): T => structuredClone(value);

const scoreComponent = (id: string, label: string, value: number, ruleId: string, explanation: string, sourceRefs: string[] = []): ScoreComponent => ({ id, label, value: round(value), ruleId, explanation, sourceRefs });

export function createCommunication(world: WorldState, message: StructuredMessage): { event: CommunicationEvent; perceptions: CommunicationPerception[] } {
  const event: CommunicationEvent = {
    id: `EVENT_B${message.beat}_${message.visibility}_${message.recipientId}`, version: "0.2", beat: message.beat,
    senderId: "PLAYER", recipientId: message.recipientId, visibility: message.visibility, messageId: message.id,
    salience: message.visibility === "PRIVATE" ? perceptionRules.privateSalience : perceptionRules.publicSalience,
    sourceRefs: [message.id, "RULE_COMMUNICATION_EVENT"],
  };
  const perceptions = (["MARA", "DREW"] as CharacterId[]).map((observerId): CommunicationPerception => {
    if (observerId === message.recipientId) return {
      id: `PERCEPTION_B${message.beat}_${observerId}`, version: "0.2", beat: message.beat, observerId, observerRole: "RECIPIENT",
      eventId: event.id, noticedEvent: true, contentAccess: "FULL", confidence: 1, noticeScore: 1,
      noticeThreshold: perceptionRules.noticeThreshold, noticeComponents: [], perceivedFacts: ["sender", "recipient", "visibility", "subject", "proposition", "DPA", "function", "delivery Vibe", "wording"],
      unavailableFacts: [], attentionRefs: ["RULE_RECIPIENT_CONTENT_ACCESS"], explanation: "The addressed recipient receives the full structured message.",
    };
    const observer = world.characters[observerId];
    const components: NoticeComponent[] = [];
    const add = (id: string, label: string, value: number, ruleId: string, explanation: string) => components.push({ id, label, value: round(value), ruleId, explanation });
    add("SALIENCE", "communication salience", event.salience, perceptionRules.ruleIds.eventSalience, `${message.visibility.toLowerCase()} delivery sets event salience.`);
    if (observer.attention.primaryTarget === message.recipientId) add("PRIMARY_RECIPIENT", "primary attention matches recipient", perceptionRules.primaryRecipientMatch, perceptionRules.ruleIds.primaryMatch, "The observer was directly watching the addressed character.");
    if (observer.attention.primaryTarget === "PLAYER_CHANNEL") add("PRIMARY_CHANNEL", "primary attention on player channel", perceptionRules.primaryPlayerChannelMatch, perceptionRules.ruleIds.primaryMatch, "The observer was already attending to the player channel.");
    if (observer.attention.secondaryTarget === message.recipientId) add("SECONDARY_RECIPIENT", "secondary attention matches recipient", perceptionRules.secondaryRecipientMatch, perceptionRules.ruleIds.secondaryMatch, "The observer tracked the recipient peripherally.");
    add("ALERT", "alert sensitivity", observer.metrics.alert * perceptionRules.alertContribution, perceptionRules.ruleIds.alert, "Alert increases notice of a communication event.");
    add("SUSPICION", "suspicion sensitivity", observer.metrics.suspicionOfOther * perceptionRules.suspicionContribution, perceptionRules.ruleIds.suspicion, "Suspicion increases notice of contact with the other actor.");
    if (observer.attention.strength < 0.45) add("LOW_ATTENTION", "weak attention", perceptionRules.lowAttentionPenalty, perceptionRules.ruleIds.lowAttention, "Weak attention reduces notice.");
    const noticeScore = round(clamp(components.reduce((sum, component) => sum + component.value, 0)));
    const noticedEvent = noticeScore >= perceptionRules.noticeThreshold;
    const contentAccess = noticedEvent && message.visibility === "PUBLIC" ? "FULL" as const : "NONE" as const;
    return {
      id: `PERCEPTION_B${message.beat}_${observerId}`, version: "0.2", beat: message.beat, observerId, observerRole: "OBSERVER",
      eventId: event.id, noticedEvent, contentAccess, confidence: noticeScore, noticeScore, noticeThreshold: perceptionRules.noticeThreshold,
      noticeComponents: components, perceivedFacts: !noticedEvent ? [] : contentAccess === "FULL" ? ["sender", "recipient", "visibility", "subject", "proposition", "DPA", "function", "delivery Vibe", "wording"] : ["sender", "recipient", "private contact occurred"],
      unavailableFacts: contentAccess === "NONE" ? ["subject", "proposition", "DPA", "function", "delivery Vibe", "wording"] : [],
      attentionRefs: observer.attention.reasonRefs, explanation: !noticedEvent ? "The communication event did not cross this observer's notice threshold." : contentAccess === "FULL" ? "Public delivery makes the direct message content observable." : "Private contact was noticed, but its content remains unavailable.",
    };
  });
  return { event, perceptions };
}

export function perceiveMessage(world: WorldState, message: StructuredMessage) {
  return createCommunication(world, message);
}

function beliefConsistency(world: WorldState, characterId: CharacterId, message: StructuredMessage): { value: number; refs: string[] } {
  const proposition = getProposition(message.propositionId);
  if (!proposition.beliefPredicate) return { value: 0, refs: [] };
  const beliefs = world.characters[characterId].beliefs.filter((belief) => belief.subjectId === proposition.referencedEntities[0] && belief.predicate === proposition.beliefPredicate && belief.status !== "REFUTED");
  if (!beliefs.length) return { value: 0, refs: [] };
  const strongest = [...beliefs].sort((a, b) => b.confidence - a.confidence)[0];
  return { value: strongest.value === proposition.reportedValue ? round(strongest.confidence * 0.2) : round(-strongest.confidence * 0.3), refs: [strongest.id] };
}

export function interpretMessage(world: WorldState, message: StructuredMessage, perception: CommunicationPerception): InterpretationRecord {
  const character = world.characters[perception.observerId];
  const proposition = getProposition(message.propositionId);
  const dpa = getDpa(message.dpa).baseline;
  if (perception.contentAccess === "NONE") return {
    id: `INTERP_B${message.beat}_${character.id}_EVENT_ONLY`, version: "0.2", beat: message.beat, characterId: character.id, observerRole: perception.observerRole,
    eventId: perception.eventId, contentAccess: "NONE", relevance: perception.noticedEvent ? 0.46 : 0, beliefConsistency: 0, sourceTrust: 0,
    perceivedCredibility: 0, perceivedValue: 0, perceivedThreat: 0, perceivedBurden: 0, perceivedVoluntariness: 0, perceivedUrgency: 0,
    resistance: 0, suspectedMotive: perception.noticedEvent ? ["possible coordination"] : [], claimAccepted: false, requestAccepted: false, dealAccepted: false,
    threatBelieved: false, presentedCompliance: false, acceptedClaims: [], doubtedClaims: [], functionalApplications: [], dpaBreakdown: [], basedBreakdown: [], beliefRefs: [],
    perceptionRef: perception.id, explanation: perception.noticedEvent ? "The observer can infer possible coordination from contact, but cannot interpret unavailable content." : "No event was noticed.",
  };
  const consistency = beliefConsistency(world, character.id, message);
  const trustBelief = character.beliefs.filter((belief) => belief.subjectId === "PLAYER" && belief.predicate === "reliable" && belief.status !== "REFUTED").sort((a, b) => b.confidence - a.confidence)[0];
  const sourceTrust = trustBelief ? (trustBelief.value === true ? trustBelief.confidence : 1 - trustBelief.confidence) : character.metrics.trustInPlayer;
  const vibe = getVibe(message.deliveryVibe);
  const prototype = vibe.prototypeModifiers!;
  const profile = receptionProfiles[character.id];
  const cueReception = (profile.cueSensitivities[vibe.dominantCue] ?? 0) * vibe.prototypeDefaultCueShare.dominant + (profile.cueSensitivities[vibe.secondaryCue] ?? 0) * vibe.prototypeDefaultCueShare.secondary;
  const override = profile.vibeOverrides[message.deliveryVibe] ?? {};
  const modifier = (key: keyof typeof prototype) => prototype[key] + (override[key] ?? 0) + (key === "credibility" || key === "resistance" ? cueReception : 0);
  const offerValue = message.dpa === "DEAL" && message.dealPayload?.offeredValueId ? exchangeValueWeights[message.dealPayload.offeredValueId] ?? 0 : 0;
  const consequence = message.dpa === "PRESSURE" && message.pressurePayload?.consequenceId ? consequenceWeights[message.pressurePayload.consequenceId] : undefined;
  const credibility = clamp(0.28 + sourceTrust * 0.5 + dpa.credibility + modifier("credibility") + consistency.value - character.metrics.alert * 0.08);
  const value = clamp(dpa.value + modifier("value") + offerValue * 0.36);
  const threat = clamp(dpa.threat + modifier("threat") + (consequence ? consequence.severity * consequence.enforceability * credibility * 0.38 : 0));
  const burden = clamp(dpa.burden + (proposition.requestedBehavior ? character.metrics.commitmentToDuty * 0.08 : 0));
  const voluntariness = clamp(dpa.voluntariness + modifier("voluntariness"));
  const urgency = clamp(dpa.urgency + modifier("urgency"));
  const resistance = clamp(dpa.resistance + modifier("resistance") + character.metrics.alert * 0.12);
  const decision = value + voluntariness * 0.25 + credibility * 0.22 - burden * 0.5 - threat * 0.2 - resistance * 0.32;
  const recipientCanAct = perception.observerRole === "RECIPIENT";
  const claimAccepted = proposition.kind === "CLAIM" && credibility >= 0.56;
  const requestAccepted = Boolean(recipientCanAct && proposition.requestedBehavior && credibility >= 0.5 && decision >= 0.18 && message.dpa !== "DEAL");
  const dealAccepted = Boolean(recipientCanAct && message.dpa === "DEAL" && credibility >= 0.52 && decision >= 0.2 && offerValue > 0);
  const threatBelieved = Boolean(message.dpa === "PRESSURE" && credibility >= 0.48 && threat >= 0.48);
  const presentedCompliance = Boolean(recipientCanAct && message.dpa === "PRESSURE" && threatBelieved && !requestAccepted && resistance >= 0.4);
  const accepted = requestAccepted || dealAccepted || claimAccepted;
  const application: FunctionalApplication | null = recipientCanAct ? {
    id: `APP_B${message.beat}_${character.id}_${message.functionId}`, version: "0.2-provisional", beat: message.beat, recipientId: character.id,
    intendedFunctionId: message.functionId, interpretedFunctionId: message.functionId, accepted,
    effectKind: message.functionId === "CREATE_OPPORTUNITY" && accepted ? "PLAN" : accepted ? "PRESSURE" : "RESISTANCE",
    amount: round(accepted ? clamp(0.42 + credibility * 0.42) : clamp(0.2 + resistance * 0.5)),
    ruleId: getFunction(message.functionId).messageApplications.find((entry) => entry.recipientId === character.id || entry.recipientId === "ANY")?.ruleId ?? `RULE_APP_${message.functionId}`,
    sourceRefs: [message.id, perception.id], explanation: accepted ? `${message.functionId.replaceAll("_", " ").toLowerCase()} is accepted as behaviorally relevant.` : "The intended function meets resistance and creates no direct requested action.",
  } : null;
  return {
    id: `INTERP_B${message.beat}_${character.id}_${message.propositionId}`, version: "0.2", beat: message.beat, characterId: character.id, observerRole: perception.observerRole,
    messageId: message.id, eventId: perception.eventId, contentAccess: "FULL", relevance: proposition.referencedEntities.includes(character.id) || proposition.requestedBehavior ? 0.86 : 0.62,
    beliefConsistency: consistency.value, sourceTrust: round(sourceTrust), perceivedCredibility: round(credibility), perceivedValue: round(value), perceivedThreat: round(threat),
    perceivedBurden: round(burden), perceivedVoluntariness: round(voluntariness), perceivedUrgency: round(urgency), resistance: round(resistance),
    suspectedMotive: message.dpa === "DEAL" ? ["exchange", "risk allocation"] : message.dpa === "PRESSURE" ? ["constraint", "possible manipulation"] : ["requested cooperation"],
    claimAccepted, requestAccepted, dealAccepted, threatBelieved, presentedCompliance,
    acceptedClaims: claimAccepted ? [proposition.id] : [], doubtedClaims: proposition.kind === "CLAIM" && !claimAccepted ? [proposition.id] : [],
    functionalApplications: application ? [application] : [],
    dpaBreakdown: [
      scoreComponent(`DPA_${message.dpa}_VALUE`, `${message.dpa} value`, dpa.value, `RULE_DPA_${message.dpa}_VALUE`, "The social structure contributes value independently of proposition truth.", [message.id]),
      scoreComponent(`DPA_${message.dpa}_THREAT`, `${message.dpa} threat`, dpa.threat, `RULE_DPA_${message.dpa}_THREAT`, "The social structure contributes threat independently of delivery.", [message.id]),
      scoreComponent(`DPA_${message.dpa}_VOLUNTARY`, `${message.dpa} voluntariness`, dpa.voluntariness, `RULE_DPA_${message.dpa}_VOLUNTARY`, "The structure sets a refusal boundary.", [message.id]),
    ],
    basedBreakdown: [
      scoreComponent(`BASED_${message.deliveryVibe}_CRED`, `${message.deliveryVibe} credibility reception`, modifier("credibility"), "RULE_BASED_RECIPIENT_RECEPTION", "Prototype mapping plus recipient-specific reception.", [message.deliveryVibe, character.id]),
      scoreComponent(`BASED_${message.deliveryVibe}_RESIST`, `${message.deliveryVibe} resistance reception`, modifier("resistance"), "RULE_BASED_RECIPIENT_RECEPTION", "The same Vibe is received through this character's scenario-local profile.", [message.deliveryVibe, character.id]),
    ],
    beliefRefs: [...consistency.refs, ...(trustBelief ? [trustBelief.id] : [])], perceptionRef: perception.id,
    explanation: `${character.name} reads the ${message.dpa.toLowerCase()} with credibility ${round(credibility)}, value ${round(value)}, and resistance ${round(resistance)}. Delivery reception and social structure remain separate.`,
  };
}

function pressure(id: string, characterId: CharacterId, functionId: FunctionalElementId, weight: number, activation: number, urgency: number, sourceRefs: string[], satisfaction: FunctionalPressure["satisfaction"] = "UNSATISFIED"): FunctionalPressure {
  return { id, version: "0.2-provisional", characterId, functionId, weight: round(clamp(weight)), activation: round(clamp(activation)), urgency: round(clamp(urgency)), confidence: 0.82, sourceRefs, boundaryNotes: [getFunction(functionId).boundary], satisfaction, usedByBehaviorIds: getFunction(functionId).commonlyServedBy };
}

export function derivePressures(world: WorldState, actorId: CharacterId, applications: FunctionalApplication[] = []): FunctionalPressure[] {
  const actor = world.characters[actorId];
  const relevant = applications.filter((application) => application.recipientId === actorId);
  const app = (id: FunctionalElementId) => relevant.find((entry) => entry.interpretedFunctionId === id && entry.accepted);
  if (actorId === "MARA") {
    const monitor = actor.plans.find((plan) => plan.kind === "MONITOR_FOR_OPENING" && plan.status !== "ABANDONED");
    const openOffer = world.social.transferOffers.find((offer) => offer.toId === "MARA" && (offer.status === "OPEN" || offer.status === "ACCEPTED"));
    return [
      pressure("PRESSURE_MARA_ACQUIRE", actorId, "ACQUIRE_TARGET", 0.94, actor.hasEnvelope ? 0 : 0.9, 0.78, ["GOAL_MARA_ACQUIRE"], actor.hasEnvelope ? "SATISFIED" : "UNSATISFIED"),
      pressure("PRESSURE_MARA_OPENING", actorId, "CREATE_OPPORTUNITY", 0.78, monitor?.status === "SATISFIED" ? 0 : app("CREATE_OPPORTUNITY")?.amount ?? 1 - actor.metrics.perceivedOpportunity, 0.62, monitor ? [monitor.id] : ["METRIC_OPPORTUNITY"], monitor?.status === "SATISFIED" ? "SATISFIED" : "UNSATISFIED"),
      pressure("PRESSURE_MARA_RISK", actorId, "REDUCE_RISK", 0.72, actor.metrics.perceivedRisk, actor.metrics.perceivedRisk, ["METRIC_RISK"]),
      pressure("PRESSURE_MARA_EXIT", actorId, "EXIT_SITUATION", actor.hasEnvelope ? 0.98 : 0.3, actor.hasEnvelope ? 0.96 : app("EXIT_SITUATION")?.amount ?? 0.14, actor.hasEnvelope ? 0.96 : 0.24, ["GOAL_MARA_EXIT"]),
      pressure("PRESSURE_MARA_VERIFY", actorId, "VERIFY_INFORMATION", 0.58, app("VERIFY_INFORMATION")?.amount ?? 0.18, 0.38, [app("VERIFY_INFORMATION")?.id ?? "INITIAL_UNCERTAINTY"]),
      pressure("PRESSURE_MARA_DISCHARGE", actorId, "DISCHARGE_OBLIGATION", 0.9, openOffer ? 0.92 : 0, openOffer ? 0.9 : 0, openOffer ? [openOffer.id] : []),
    ];
  }
  const activeCommitment = activeTransferCommitment(world);
  const acceptedExchange = activeCommitment ? world.social.exchanges.find((exchange) => activeCommitment.sourceRefs.includes(exchange.id) && exchange.status === "ACCEPTED") : undefined;
  const pendingPlayerQuestion = world.social.pendingQuestions.find((question) => question.askerId === "DREW" && question.addresseeId === "PLAYER" && question.status === "OPEN");
  return [
    pressure("PRESSURE_DREW_PROTECT", actorId, "PROTECT_TARGET", actor.metrics.commitmentToDuty, world.envelope.holder === "MARA" ? 1 : 0.88, world.envelope.holder === "MARA" ? 1 : 0.72, ["GOAL_DREW_CONTROL"]),
    pressure("PRESSURE_DREW_CONTROL", actorId, "MAINTAIN_CONTROL", 0.78, clamp(actor.metrics.alert + actor.metrics.suspicionOfOther * 0.5 + (app("MAINTAIN_CONTROL")?.amount ?? 0)), actor.metrics.alert, ["METRIC_ALERT", "METRIC_SUSPICION"]),
    pressure("PRESSURE_DREW_VERIFY", actorId, "VERIFY_INFORMATION", 0.74, pendingPlayerQuestion ? 0.95 : app("VERIFY_INFORMATION")?.amount ?? 0.26, pendingPlayerQuestion ? 0.9 : 0.32, pendingPlayerQuestion ? [pendingPlayerQuestion.id] : [app("VERIFY_INFORMATION")?.id ?? "INITIAL_UNCERTAINTY"]),
    pressure("PRESSURE_DREW_UNCERTAINTY", actorId, "REDUCE_UNCERTAINTY", 0.66, pendingPlayerQuestion ? 0.9 : app("REDUCE_UNCERTAINTY")?.amount ?? 0.2, 0.52, pendingPlayerQuestion ? [pendingPlayerQuestion.id] : []),
    pressure("PRESSURE_DREW_DISCHARGE", actorId, "DISCHARGE_OBLIGATION", 0.96, acceptedExchange || activeCommitment ? 0.96 : 0, acceptedExchange || activeCommitment ? 0.94 : 0, [acceptedExchange?.id, activeCommitment?.id].filter(Boolean) as string[]),
    pressure("PRESSURE_DREW_RELATION", actorId, "PRESERVE_RELATIONSHIP", 0.5, app("PRESERVE_RELATIONSHIP")?.amount ?? actor.metrics.trustInPlayer * 0.54, 0.3, [app("PRESERVE_RELATIONSHIP")?.id ?? "METRIC_TRUST"]),
    pressure("PRESSURE_DREW_EXPOSE", actorId, "EXPOSE_DECEPTION", 0.72, clamp(actor.metrics.alert * 0.5 + actor.metrics.suspicionOfOther * 0.5), actor.metrics.alert, ["METRIC_ALERT", "METRIC_SUSPICION"]),
  ];
}

function observedDrewDiversion(world: WorldState): boolean {
  return world.characters.MARA.beliefs.some((belief) => belief.subjectId === "DREW" && belief.predicate === "attention" && belief.value === "PLAYER_CHANNEL" && belief.status === "OBSERVED" && belief.confidence >= 0.7);
}

function activeTransferCommitment(world: WorldState) {
  return world.social.commitments.find((commitment) => commitment.debtorId === "DREW" && commitment.requestedAction === "OFFER_TRANSFER" && commitment.status === "ACTIVE");
}

function eligibility(world: WorldState, behavior: BehaviorDefinition): string[] {
  const actor = world.characters[behavior.actorId];
  const openOffer = world.social.transferOffers.find((offer) => offer.toId === "MARA" && (offer.status === "OPEN" || offer.status === "ACCEPTED"));
  const transferCommitment = activeTransferCommitment(world);
  switch (behavior.id) {
    case "MONITOR_DREW": return actor.plans.some((plan) => plan.kind === "MONITOR_FOR_OPENING" && plan.status === "ACTIVE") || actor.metrics.perceivedOpportunity < 0.6 ? [] : ["No active monitoring plan and an opening is already understood."];
    case "APPROACH_ENVELOPE": return world.envelope.location === "TABLE" && !actor.hasEnvelope && actor.location !== "TABLE" ? [] : ["The visible envelope is not approachable from the current state."];
    case "ACCEPT_TRANSFER": return openOffer ? [] : ["No open transfer offer exists."];
    case "TAKE_ENVELOPE": return world.envelope.location !== "TABLE" ? ["Envelope is not available on the table."] : !observedDrewDiversion(world) ? ["Mara lacks an observed epistemic path to Drew's diverted attention."] : actor.metrics.perceivedOpportunity < scenario.thresholds.takeOpportunity ? ["Perceived opportunity is below threshold."] : actor.metrics.nerve < scenario.thresholds.takeNerve ? ["Nerve is below threshold."] : [];
    case "CONCEAL_ENVELOPE": return actor.hasEnvelope && world.envelope.visible ? [] : ["Mara needs visible possession to conceal it."];
    case "LEAVE": return actor.hasEnvelope && world.exitAccessible ? [] : ["Mara needs the envelope and an accessible exit."];
    case "ABANDON_OBJECTIVE": return !actor.hasEnvelope && actor.metrics.perceivedRisk >= scenario.thresholds.abandonRisk && world.exitAccessible ? [] : ["Risk or exit conditions do not support abandonment."];
    case "MOVE_ENVELOPE": return world.envelope.location === "TABLE" ? [] : ["The envelope is no longer exposed on the table."];
    case "OFFER_TRANSFER": return transferCommitment && (world.envelope.location === "TABLE" || world.envelope.holder === "DREW") && !openOffer ? [] : ["No active transfer-specific commitment is ready for an offer."];
    case "COMPLETE_TRANSFER": return openOffer ? [] : ["No transfer offer can be completed."];
    case "REFUSE": return world.social.refusals.some((refusal) => refusal.actorId === "DREW" && refusal.status === "ACTIVE") ? ["The boundary is already recorded."] : [];
    case "LOCK_DOWN_ROOM": return actor.metrics.alert >= 0.72 ? [] : ["Alert is below the lockdown threshold."];
    case "FEIGN_COMPLIANCE": return actor.intent.concealed || actor.plans.some((plan) => plan.kind === "CONCEAL_RESISTANCE" && plan.status === "ACTIVE") ? [] : ["No concealed resistance is active."];
    default: return [];
  }
}

export function scoreBehaviors(world: WorldState, actorId: CharacterId, pressures: FunctionalPressure[], interpretation?: InterpretationRecord): BehaviorScore[] {
  const actor = world.characters[actorId];
  const definitions = actorId === "MARA" ? maraBehaviors : drewBehaviors;
  const active = pressures.filter((entry) => entry.satisfaction === "UNSATISFIED" && entry.activation > 0.18);
  const scores = definitions.map((definition): BehaviorScore => {
    const reasons = eligibility(world, definition);
    const components: ScoreComponent[] = [scoreComponent("BASE", "authored base", definition.baseScore, "RULE_BEHAVIOR_BASE", "Scenario-local baseline.", [definition.id])];
    const fit = definition.servesFunctions.reduce((sum, id) => { const item = active.find((entry) => entry.functionId === id); return sum + (item ? item.weight * item.activation * 0.34 : 0); }, 0);
    components.push(scoreComponent("FUNCTION_FIT", "active function fit", fit, "RULE_BEHAVIOR_FUNCTION_FIT", "Only unsatisfied functional pressures support this behavior.", definition.servesFunctions));
    let compatibility = 0;
    for (const served of definition.servesFunctions) {
      const fn = getFunction(served);
      compatibility += active.filter((item) => fn.compatibleFunctions.includes(item.functionId)).length * 0.025;
      compatibility -= active.filter((item) => fn.conflictingFunctions.includes(item.functionId)).length * 0.045;
    }
    components.push(scoreComponent("FUNCTION_RELATIONS", "compatibility and conflict", compatibility, "RULE_FUNCTION_RELATIONS", "Declared compatibility supports convergence; declared conflict imposes friction.", active.map((entry) => entry.id)));
    const bonus = (id: string, label: string, value: number, ruleId: string, explanation: string, refs: string[] = []) => components.push(scoreComponent(id, label, value, ruleId, explanation, refs));
    const offer = world.social.transferOffers.find((entry) => entry.status === "OPEN" || entry.status === "ACCEPTED");
    const transferCommitment = activeTransferCommitment(world);
    if (definition.id === "WAIT") bonus("WAIT_RISK", "risk restraint", actor.metrics.perceivedRisk * 0.12, "RULE_SCORE_WAIT_RISK", "Waiting contains immediate exposure.");
    if (definition.id === "MONITOR_DREW" && actor.plans.some((plan) => plan.kind === "MONITOR_FOR_OPENING" && plan.status === "ACTIVE")) bonus("MONITOR_PLAN", "accepted monitor plan", 0.82, "RULE_SCORE_MONITOR_PLAN", "An accepted opportunity function creates a plan to monitor, not opportunity itself.");
    if (definition.id === "TAKE_ENVELOPE") bonus("OBSERVED_OPENING", "observed opening", actor.metrics.perceivedOpportunity * 1.08 + actor.metrics.nerve * 0.25, "RULE_SCORE_OBSERVED_OPENING", "An observed attention diversion and sufficient nerve make taking competitive.");
    if (definition.id === "LEAVE" && actor.hasEnvelope) bonus("OBJECTIVE_HELD", "objective held", 1.28, "RULE_SCORE_EXIT_WITH_TARGET", "Possession activates the exit goal.");
    if (definition.id === "ABANDON_OBJECTIVE") bonus("OVERWHELMING_RISK", "overwhelming risk", actor.metrics.perceivedRisk, "RULE_SCORE_ABANDON_RISK", "Risk can outrank acquisition.");
    if (definition.id === "ACCEPT_TRANSFER" && offer) bonus("OPEN_OFFER", "open transfer offer", 1.22, "RULE_SCORE_ACCEPT_OFFER", "Mara can visibly accept a real offer.", [offer.id]);
    if (definition.id === "GUARD_ENVELOPE") bonus("DUTY", "custodial duty", actor.metrics.commitmentToDuty * 0.35, "RULE_SCORE_GUARD_DUTY", "Present responsibility supports guarding.");
    if (definition.id === "QUESTION_PLAYER" && (interpretation?.functionalApplications.some((item) => item.interpretedFunctionId === "VERIFY_INFORMATION" && item.accepted) || actor.attention.primaryTarget === "PLAYER_CHANNEL")) bonus("VERIFY_CHANNEL", "verification focus", actor.attention.primaryTarget === "PLAYER_CHANNEL" ? 0.84 : 0.92, "RULE_SCORE_QUESTION_PLAYER_VERIFY", "Verification specifically supports attention to the player channel.");
    if (definition.id === "VERIFY_CLAIM" && interpretation && interpretation.claimAccepted === false) bonus("CLAIM_DOUBT", "unresolved claim", 0.58, "RULE_SCORE_VERIFY_CLAIM", "A doubtful reported claim supports verification.");
    if (definition.id === "OFFER_TRANSFER" && transferCommitment) bonus("TRANSFER_COMMITMENT", "transfer-specific commitment", 1.12, "RULE_SCORE_OFFER_TRANSFER_COMMITMENT", "Only accepted terms whose requested action is OFFER_TRANSFER make the offer behaviorally useful.", [transferCommitment.id]);
    if (definition.id === "COMPLETE_TRANSFER" && offer) bonus("MATCHABLE_OFFER", "matchable offer", 1.16, "RULE_SCORE_COMPLETE_MATCH", "Completion becomes competitive while the offer awaits Mara's compatible acceptance.", [offer.id]);
    if (definition.id === "REFUSE" && interpretation && !interpretation.requestAccepted && !interpretation.dealAccepted && !interpretation.presentedCompliance) bonus("REJECTED_REQUEST", "rejected request", 0.72, "RULE_SCORE_REFUSAL", "A rejected request supports a visible boundary.");
    if (definition.id === "CONFRONT_MARA" && actor.inferences.some((item) => item.kind === "POSSIBLE_COORDINATION" && item.status === "ACTIVE")) bonus("COORDINATION_INFERENCE", "possible coordination", 0.66, "RULE_SCORE_CONFRONT_INFERENCE", "An inference may support confrontation but is not proof.");
    if (definition.id === "LOCK_DOWN_ROOM") bonus("ALERT", "alert-driven control", actor.metrics.alert * 1.06, "RULE_SCORE_LOCKDOWN_ALERT", "High alert can close the room.");
    if (definition.id === "FEIGN_COMPLIANCE" && interpretation?.presentedCompliance) bonus("SURFACE_COMPLIANCE", "surface compliance", 1.08, "RULE_SCORE_FEIGN_RESISTANCE", "Drew can acknowledge pressure while retaining resistance.");
    const total = reasons.length ? -999 : round(components.reduce((sum, component) => sum + component.value, 0));
    return { behaviorId: definition.id, eligible: reasons.length === 0, ineligibilityReasons: reasons, components, total, tieBreakKey: `${String(definitions.indexOf(definition)).padStart(2, "0")}_${definition.id}`, tieBreakReason: "Authored behavior order resolves exact ties deterministically.", selected: false };
  });
  const winner = [...scores].filter((entry) => entry.eligible).sort((a, b) => b.total - a.total || a.tieBreakKey.localeCompare(b.tieBreakKey))[0];
  return scores.map((entry) => ({ ...entry, selected: entry.behaviorId === winner?.behaviorId }));
}

interface MutationCause { ruleId: string; explanation: string; sourceRefs: string[] }
class MutationRecorder {
  readonly causes = new Map<string, MutationCause>();
  capture(world: WorldState, cause: MutationCause, mutate: () => void) {
    const before = copy(world);
    mutate();
    for (const diff of deepDiff({ ...before, history: [] }, { ...world, history: [] })) this.causes.set(diff.path, cause);
  }
}

function addReportedBelief(world: WorldState, characterId: CharacterId, message: StructuredMessage, propositionId: string) {
  const proposition = getProposition(propositionId);
  if (!proposition.beliefPredicate) return;
  world.characters[characterId].beliefs.push({
    id: `BELIEF_B${world.beat}_${characterId}_${propositionId}`, version: "0.2", subjectId: proposition.referencedEntities[0], predicate: proposition.beliefPredicate,
    value: proposition.reportedValue ?? null, confidence: 0.62, source: "MESSAGE", acquiredBeat: world.beat, status: "REPORTED", sourceRefs: [message.id],
  });
}

function applyMessageState(world: WorldState, message: StructuredMessage, perceptions: CommunicationPerception[], interpretations: InterpretationRecord[], recorder: MutationRecorder) {
  const recipientInterpretation = interpretations.find((entry) => entry.characterId === message.recipientId)!;
  for (const interpretation of interpretations) if (interpretation.claimAccepted && interpretation.contentAccess === "FULL") recorder.capture(world, { ruleId: "RULE_ACCEPTED_CLAIM_REPORTED", explanation: "Accessible accepted content creates a reported belief; it does not become observed truth.", sourceRefs: [message.id, interpretation.id, interpretation.perceptionRef] }, () => addReportedBelief(world, interpretation.characterId, message, message.propositionId));
  const privateObserver = perceptions.find((perception) => perception.observerRole === "OBSERVER" && perception.noticedEvent && perception.contentAccess === "NONE");
  if (privateObserver) {
    recorder.capture(world, { ruleId: "RULE_PRIVATE_CONTACT_INFERENCE", explanation: "Noticed private contact supports bounded coordination inference while content stays unavailable.", sourceRefs: [privateObserver.eventId, privateObserver.id] }, () => {
      world.characters[privateObserver.observerId].inferences.push({ id: `INFERENCE_B${world.beat}_${privateObserver.observerId}_COORDINATION`, version: "0.2", beat: world.beat, characterId: privateObserver.observerId, kind: "POSSIBLE_COORDINATION", confidence: privateObserver.noticeScore, evidenceRefs: [privateObserver.id], unavailableFacts: privateObserver.unavailableFacts, status: "ACTIVE", explanation: "Private contact can support a possible-coordination inference, but content remains unknown." });
      world.characters[privateObserver.observerId].metrics.suspicionOfOther = clamp(world.characters[privateObserver.observerId].metrics.suspicionOfOther + 0.06);
    });
  }
  const application = recipientInterpretation.functionalApplications[0];
  if (application?.accepted && application.interpretedFunctionId === "CREATE_OPPORTUNITY" && message.recipientId === "MARA") {
    recorder.capture(world, { ruleId: "RULE_APP_CREATE_OPPORTUNITY_MONITOR", explanation: "The accepted Function application creates a monitoring plan, not opportunity points.", sourceRefs: [message.id, application.id] }, () => world.characters.MARA.plans.push({ id: `PLAN_B${world.beat}_MARA_MONITOR`, version: "0.2", ownerId: "MARA", kind: "MONITOR_FOR_OPENING", status: "ACTIVE", createdBeat: world.beat, sourceRefs: [application.id] }));
  }
  if (message.dpa === "DEAL") {
    const accepted = recipientInterpretation.dealAccepted;
    const requestedAction = getProposition(message.propositionId).requestedBehavior ?? null;
    const exchangeId = `EXCHANGE_B${world.beat}_${message.recipientId}`;
    recorder.capture(world, { ruleId: "RULE_EXCHANGE_PROPOSE_AND_ACCEPT", explanation: "The Deal creates an exchange record carrying its exact proposition and requested action.", sourceRefs: [message.id, recipientInterpretation.id] }, () => world.social.exchanges.push({ id: exchangeId, version: "0.2", beat: world.beat, proposerId: "PLAYER", recipientId: message.recipientId, requestedPropositionId: message.propositionId, requestedAction, offeredValueId: message.dealPayload!.offeredValueId!, status: accepted ? "ACCEPTED" : "REJECTED", acceptedBeat: accepted ? world.beat : undefined, sourceRefs: [message.id, recipientInterpretation.id] }));
    if (accepted && requestedAction) recorder.capture(world, { ruleId: "RULE_COMMITMENT_ACCEPTED_REQUESTED_ACTION", explanation: "Only accepted Deal terms with an explicit requested action create an action commitment.", sourceRefs: [exchangeId, message.id, recipientInterpretation.id] }, () => world.social.commitments.push({ id: `COMMITMENT_B${world.beat}_${message.recipientId}_${requestedAction}`, version: "0.2", debtorId: message.recipientId, creditorId: "PLAYER", kind: `PERFORM_${requestedAction}`, propositionId: message.propositionId, requestedAction, status: "ACTIVE", createdBeat: world.beat, sourceRefs: [exchangeId, message.id] }));
  }
  if (message.dpa === "PRESSURE") {
    const recipient = world.characters[message.recipientId];
    recorder.capture(world, { ruleId: "RULE_PRESSURE_ALERT_RESPONSE", explanation: "Believed Pressure threat raises recipient alert without commanding compliance.", sourceRefs: [message.id, recipientInterpretation.id] }, () => { recipient.metrics.alert = clamp(recipient.metrics.alert + recipientInterpretation.perceivedThreat * 0.12); });
    if (recipientInterpretation.presentedCompliance) {
      recorder.capture(world, { ruleId: "RULE_PRESSURE_PRESENTED_COMPLIANCE", explanation: "Believed threat plus resistance creates a conceal-resistance plan, not actual request acceptance.", sourceRefs: [message.id, recipientInterpretation.id] }, () => {
        recipient.intent.concealed = true;
        recipient.plans.push({ id: `PLAN_B${world.beat}_${recipient.id}_CONCEAL_RESISTANCE`, version: "0.2", ownerId: recipient.id, kind: "CONCEAL_RESISTANCE", status: "ACTIVE", createdBeat: world.beat, sourceRefs: [recipientInterpretation.id] });
      });
    }
  }
}

function preBeatObservation(world: WorldState, recorder: MutationRecorder): string[] {
  const notes: string[] = [];
  const plan = world.characters.MARA.plans.find((entry) => entry.kind === "MONITOR_FOR_OPENING" && entry.status === "ACTIVE");
  if (plan && world.characters.DREW.attention.primaryTarget === "PLAYER_CHANNEL") {
    recorder.capture(world, { ruleId: "RULE_SCENARIO_MONITOR_OBSERVES_DIVERSION", explanation: "Scenario-local monitoring converts Drew's already-enacted player-channel attention into an observed opening.", sourceRefs: [plan.id, ...world.characters.DREW.attention.reasonRefs] }, () => {
      for (const prior of world.characters.MARA.beliefs.filter((belief) => belief.subjectId === "DREW" && belief.predicate === "attention" && belief.value !== "PLAYER_CHANNEL" && belief.status === "OBSERVED")) prior.status = "REFUTED";
      world.characters.MARA.beliefs.push({ id: `BELIEF_B${world.beat}_MARA_DREW_DIVERTED`, version: "0.2", subjectId: "DREW", predicate: "attention", value: "PLAYER_CHANNEL", confidence: 0.9, source: "OBSERVATION", acquiredBeat: world.beat, lastConfirmedBeat: world.beat, status: "OBSERVED", sourceRefs: [plan.id, "RULE_OBSERVE_DREW_ATTENTION"] });
      world.characters.MARA.metrics.perceivedOpportunity = 0.78;
      world.characters.MARA.metrics.nerve = clamp(world.characters.MARA.metrics.nerve + 0.08);
      plan.status = "SATISFIED";
    });
    notes.push("Mara's active monitoring plan converts Drew's visible attention shift into an observed opening.");
  }
  const offer = world.social.transferOffers.find((entry) => entry.toId === "MARA" && entry.status === "OPEN");
  if (offer && !world.characters.MARA.beliefs.some((belief) => belief.sourceRefs.includes(offer.id))) recorder.capture(world, { ruleId: "RULE_OBSERVE_TRANSFER_OFFER", explanation: "Mara directly observes Drew's previously enacted open transfer offer.", sourceRefs: [offer.id] }, () => world.characters.MARA.beliefs.push({ id: `BELIEF_B${world.beat}_MARA_TRANSFER_OFFER`, version: "0.2", subjectId: "TRANSFER", predicate: "offeredTo", value: "MARA", confidence: 0.98, source: "OBSERVATION", acquiredBeat: world.beat, lastConfirmedBeat: world.beat, status: "OBSERVED", sourceRefs: [offer.id, "RULE_OBSERVE_TRANSFER_OFFER"] }));
  return notes;
}

function applyBehavior(world: WorldState, actorId: CharacterId, behaviorId: BehaviorId, recorder?: MutationRecorder) {
  const mutate = () => {
  const actor = world.characters[actorId], behavior = getBehavior(behaviorId);
  actor.lastBehavior = behaviorId; actor.visibleAction = behavior.visibleAction; actor.visibleLine = behavior.line;
  actor.intent = { behaviorId, commitment: 0.86, announced: Boolean(behavior.line), concealed: behaviorId === "FEIGN_COMPLIANCE", sourcePressureRefs: [] };
  switch (behaviorId) {
    case "WAIT": actor.metrics.perceivedRisk = clamp(actor.metrics.perceivedRisk - 0.03); break;
    case "MONITOR_DREW": actor.attention = { primaryTarget: "DREW", secondaryTarget: "ENVELOPE", strength: 0.92, reasonRefs: ["RULE_EFFECT_MONITOR_DREW"], lastChangedBeat: world.beat }; break;
    case "QUESTION_DREW": world.social.pendingQuestions.push({ id: `QUESTION_B${world.beat}_MARA_DREW`, version: "0.2", askerId: "MARA", addresseeId: "DREW", subjectId: "DREW", status: "OPEN", createdBeat: world.beat, sourceRefs: ["RULE_EFFECT_QUESTION_DREW"] }); break;
    case "APPROACH_ENVELOPE": actor.location = "TABLE"; actor.metrics.perceivedRisk = clamp(actor.metrics.perceivedRisk + 0.08); world.characters.DREW.metrics.suspicionOfOther = clamp(world.characters.DREW.metrics.suspicionOfOther + 0.05); break;
    case "ACCEPT_TRANSFER": { const offer = world.social.transferOffers.find((entry) => entry.status === "OPEN"); if (offer) offer.status = "ACCEPTED"; break; }
    case "TAKE_ENVELOPE": world.envelope.holder = "MARA"; world.envelope.location = null; world.envelope.visible = true; actor.hasEnvelope = true; actor.metrics.perceivedRisk = clamp(actor.metrics.perceivedRisk + 0.12); world.characters.DREW.metrics.alert = clamp(world.characters.DREW.metrics.alert + (world.characters.DREW.attention.primaryTarget === "PLAYER_CHANNEL" ? 0.08 : 0.22)); break;
    case "CONCEAL_ENVELOPE": world.envelope.visible = false; actor.metrics.perceivedRisk = clamp(actor.metrics.perceivedRisk - 0.12); break;
    case "LEAVE": actor.location = "EXIT"; break;
    case "ABANDON_OBJECTIVE": actor.location = "EXIT"; break;
    case "GUARD_ENVELOPE": actor.attention = { primaryTarget: "ENVELOPE", secondaryTarget: "MARA", strength: 0.9, reasonRefs: ["RULE_EFFECT_GUARD"], lastChangedBeat: world.beat }; break;
    case "WATCH_MARA": actor.attention = { primaryTarget: "MARA", secondaryTarget: "ENVELOPE", strength: 0.9, reasonRefs: ["RULE_EFFECT_WATCH_MARA"], lastChangedBeat: world.beat }; break;
    case "QUESTION_MARA": actor.attention = { primaryTarget: "MARA", secondaryTarget: "ENVELOPE", strength: 0.88, reasonRefs: ["RULE_EFFECT_QUESTION_MARA"], lastChangedBeat: world.beat }; world.social.pendingQuestions.push({ id: `QUESTION_B${world.beat}_DREW_MARA`, version: "0.2", askerId: "DREW", addresseeId: "MARA", subjectId: "AUTHORIZATION", status: "OPEN", createdBeat: world.beat, sourceRefs: ["RULE_EFFECT_QUESTION_MARA"] }); break;
    case "QUESTION_PLAYER": actor.attention = { primaryTarget: "PLAYER_CHANNEL", secondaryTarget: "ENVELOPE", strength: 0.9, reasonRefs: ["RULE_EFFECT_QUESTION_PLAYER"], lastChangedBeat: world.beat }; if (!world.social.pendingQuestions.some((entry) => entry.askerId === "DREW" && entry.addresseeId === "PLAYER" && entry.status === "OPEN")) world.social.pendingQuestions.push({ id: `QUESTION_B${world.beat}_DREW_PLAYER`, version: "0.2", askerId: "DREW", addresseeId: "PLAYER", subjectId: "AUTHORIZATION", status: "OPEN", createdBeat: world.beat, sourceRefs: ["RULE_EFFECT_QUESTION_PLAYER"] }); break;
    case "VERIFY_CLAIM": actor.attention = { primaryTarget: "PLAYER_CHANNEL", secondaryTarget: "ENVELOPE", strength: 0.84, reasonRefs: ["RULE_EFFECT_VERIFY_CLAIM"], lastChangedBeat: world.beat }; break;
    case "MOVE_ENVELOPE": world.envelope.holder = "DREW"; world.envelope.location = null; actor.hasEnvelope = true; break;
    case "OFFER_TRANSFER": world.social.transferOffers.push({ id: `OFFER_B${world.beat}_DREW_MARA`, version: "0.2", fromId: "DREW", toId: "MARA", objectId: "ENVELOPE", status: "OPEN", createdBeat: world.beat, sourceRefs: ["RULE_EFFECT_OFFER_TRANSFER"] }); break;
    case "REFUSE": world.social.refusals.push({ id: `REFUSAL_B${world.beat}_DREW`, version: "0.2", actorId: "DREW", status: "ACTIVE", createdBeat: world.beat, sourceRefs: ["RULE_EFFECT_REFUSE"] }); break;
    case "CONFRONT_MARA": actor.attention = { primaryTarget: "MARA", secondaryTarget: "PLAYER_CHANNEL", strength: 0.96, reasonRefs: ["RULE_EFFECT_CONFRONT"], lastChangedBeat: world.beat }; actor.metrics.alert = clamp(actor.metrics.alert + 0.14); world.player.exposure = clamp(world.player.exposure + 0.14); break;
    case "LOCK_DOWN_ROOM": world.exitAccessible = false; actor.metrics.alert = clamp(actor.metrics.alert + 0.08); break;
    case "FEIGN_COMPLIANCE": actor.attention = { primaryTarget: "ENVELOPE", secondaryTarget: "PLAYER_CHANNEL", strength: 0.92, reasonRefs: ["RULE_EFFECT_FEIGN_COMPLIANCE"], lastChangedBeat: world.beat }; break;
    case "COMPLETE_TRANSFER": break;
  }
  };
  const behavior = getBehavior(behaviorId);
  if (recorder) recorder.capture(world, { ruleId: behavior.effectRuleIds[0], explanation: `${actorId === "MARA" ? "Mara" : "Drew"}'s selected ${behaviorId} behavior applies its authored state effects.`, sourceRefs: [behaviorId] }, mutate);
  else mutate();
}

export function resolveJoint(world: WorldState, mara: BehaviorId, drew: BehaviorId, recorder?: MutationRecorder): JointActionRecord[] {
  const offer = world.social.transferOffers.find((entry) => entry.status === "OPEN" || entry.status === "ACCEPTED");
  const matched = Boolean(offer && mara === "ACCEPT_TRANSFER" && drew === "COMPLETE_TRANSFER");
  const joint: JointActionRecord = { id: `JOINT_B${world.beat}_TRANSFER`, version: "0.2", beat: world.beat, kind: "JOINT_TRANSFER", participantIds: ["MARA", "DREW"], compatibleIntentIds: ["ACCEPT_TRANSFER", "COMPLETE_TRANSFER"], matched, effectRuleId: "RULE_JOINT_TRANSFER_MATCH", sourceRefs: offer ? [offer.id] : [], explanation: matched ? "Mara's acceptance and Drew's completion match in the same resolution frame; possession transfers once." : "The compatible transfer intentions did not both occur, so possession does not change." };
  if (matched && offer) {
    const mutate = () => {
      offer.status = "COMPLETED"; world.envelope.holder = "MARA"; world.envelope.location = null; world.envelope.visible = true;
      world.characters.MARA.hasEnvelope = true; world.characters.DREW.hasEnvelope = false;
      const commitment = activeTransferCommitment(world);
      if (commitment) {
        commitment.status = "FULFILLED";
        for (const exchange of world.social.exchanges.filter((entry) => commitment.sourceRefs.includes(entry.id) && entry.status === "ACCEPTED")) exchange.status = "FULFILLED";
      }
    };
    if (recorder) recorder.capture(world, { ruleId: "RULE_JOINT_TRANSFER_MATCH", explanation: "Compatible acceptance and completion transfer one envelope exactly once and fulfill only their transfer-specific commitment.", sourceRefs: [joint.id, offer.id] }, mutate); else mutate();
  }
  return [joint];
}

function terminalFor(world: WorldState): TerminalState | null {
  if (world.characters.MARA.location === "EXIT" && world.characters.MARA.hasEnvelope) {
    const negotiated = world.history.some((beat) => beat.jointActions.some((joint) => joint.matched)) || world.social.transferOffers.some((offer) => offer.status === "COMPLETED");
    return { kind: "SUCCESS", title: negotiated ? "Negotiated handoff" : "Observed opening", explanation: negotiated ? "Accepted terms produced an offer, matched acceptance, synchronized transfer, and exit." : "Monitoring produced an observation path; Mara used the later opening and exited.", route: negotiated ? "NEGOTIATED" : "OPPORTUNITY", ruleId: negotiated ? "RULE_TERMINAL_NEGOTIATED" : "RULE_TERMINAL_OPPORTUNITY" };
  }
  if (world.characters.MARA.location === "EXIT" && !world.characters.MARA.hasEnvelope) return { kind: "MARA_LEFT_EMPTY_HANDED", title: "Objective abandoned", explanation: "Mara left after risk overwhelmed acquisition.", ruleId: "RULE_TERMINAL_ABANDON" };
  if (world.characters.DREW.metrics.alert >= scenario.thresholds.fullAlert || !world.exitAccessible) return { kind: "FULL_ALERT", title: "Room locked down", explanation: "Drew's alert crossed the scenario boundary and the route closed.", ruleId: "RULE_TERMINAL_FULL_ALERT" };
  if (world.player.exposure >= scenario.thresholds.fullExposure) return { kind: "PLAYER_EXPOSED", title: "Player exposed", explanation: "The player's manipulation became the room's primary problem.", ruleId: "RULE_TERMINAL_EXPOSURE" };
  if (world.beat > world.maxBeats) return { kind: "TURN_LIMIT", title: "Beat limit", explanation: "No route resolved before the authored limit.", ruleId: "RULE_TERMINAL_BEAT_LIMIT" };
  return null;
}

function deepDiff(before: unknown, after: unknown, path = "world"): Array<{ path: string; before: unknown; after: unknown }> {
  if (Object.is(before, after)) return [];
  if (before === null || after === null || typeof before !== "object" || typeof after !== "object") return [{ path, before, after }];
  const beforeRecord = before as Record<string, unknown>, afterRecord = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  return [...keys].flatMap((key) => deepDiff(beforeRecord[key], afterRecord[key], `${path}.${key}`));
}

export function resolveBeat(input: WorldState, queuedMessage: StructuredMessage | null): WorldState {
  if (input.terminalState) return input;
  const before = copy(input), world = copy(input), recorder = new MutationRecorder();
  recorder.capture(world, { ruleId: "RULE_END_BEAT_BEGIN_RESOLUTION", explanation: "End Beat enters the deterministic resolution phase.", sourceRefs: queuedMessage ? [queuedMessage.id] : ["PLAYER_WAIT"] }, () => { world.phase = "RESOLVING"; });
  const observationNotes = preBeatObservation(world, recorder);
  let event: CommunicationEvent | null = null, perceptions: CommunicationPerception[] = [], interpretations: InterpretationRecord[] = [];
  if (queuedMessage) {
    const communication = perceiveMessage(world, queuedMessage); event = communication.event; perceptions = communication.perceptions;
    interpretations = perceptions.filter((perception) => perception.noticedEvent).map((perception) => interpretMessage(world, queuedMessage, perception));
    applyMessageState(world, queuedMessage, perceptions, interpretations, recorder);
  }
  const applications = interpretations.flatMap((interpretation) => interpretation.functionalApplications);
  const functionalPressures = { MARA: derivePressures(world, "MARA", applications), DREW: derivePressures(world, "DREW", applications) };
  const candidates = {
    MARA: scoreBehaviors(world, "MARA", functionalPressures.MARA, interpretations.find((entry) => entry.characterId === "MARA")),
    DREW: scoreBehaviors(world, "DREW", functionalPressures.DREW, interpretations.find((entry) => entry.characterId === "DREW")),
  };
  const selectedIntents = {
    MARA: candidates.MARA.find((entry) => entry.selected)!.behaviorId,
    DREW: candidates.DREW.find((entry) => entry.selected)!.behaviorId,
  } as Record<CharacterId, BehaviorId>;
  const performanceSource = copy(world);
  applyBehavior(world, "MARA", selectedIntents.MARA, recorder); applyBehavior(world, "DREW", selectedIntents.DREW, recorder);
  const jointActions = resolveJoint(world, selectedIntents.MARA, selectedIntents.DREW, recorder);
  if (jointActions[0].matched) recorder.capture(world, { ruleId: "RULE_JOINT_TRANSFER_PRESENTATION", explanation: "Completion wording becomes visible only after the joint matcher confirms bilateral transfer.", sourceRefs: [jointActions[0].id] }, () => {
    world.characters.DREW.visibleAction = "releases the envelope into Mara's accepting hand"; world.characters.DREW.visibleLine = "Then we are agreed.";
    world.characters.MARA.visibleAction = "accepts the envelope as Drew releases it";
  });
  const performances: Record<CharacterId, PerformancePlan> = {
    MARA: buildPerformance(performanceSource.characters.MARA, getBehavior(selectedIntents.MARA), interpretations.find((entry) => entry.characterId === "MARA"), world.beat, jointActions[0].matched),
    DREW: buildPerformance(performanceSource.characters.DREW, getBehavior(selectedIntents.DREW), interpretations.find((entry) => entry.characterId === "DREW"), world.beat, jointActions[0].matched),
  };
  const summary = [...observationNotes, queuedMessage ? `Player sends a ${queuedMessage.visibility.toLowerCase()} ${queuedMessage.dpa.toLowerCase()} to ${queuedMessage.recipientId === "MARA" ? "Mara" : "Drew"}.` : "The player sends no message.", `Mara ${world.characters.MARA.visibleAction}.`, `Drew ${world.characters.DREW.visibleAction}.`, ...(jointActions[0].matched ? ["Their compatible intentions complete one synchronized transfer."] : [])];
  recorder.capture(world, { ruleId: "RULE_OBSERVABLE_SUMMARY", explanation: "The observable log records only the enacted message, actions, and confirmed joint outcome.", sourceRefs: [jointActions[0].id] }, () => world.eventLog.push(summary.join(" ")));
  recorder.capture(world, { ruleId: "RULE_END_BEAT_ADVANCE", explanation: "Only End Beat advances the simulation clock, exactly once.", sourceRefs: queuedMessage ? [queuedMessage.id] : ["PLAYER_WAIT"] }, () => { world.beat += 1; });
  const terminalState = terminalFor(world);
  recorder.capture(world, { ruleId: terminalState?.ruleId ?? "RULE_TERMINAL_EVALUATION", explanation: terminalState?.explanation ?? "No terminal boundary was crossed.", sourceRefs: [jointActions[0].id] }, () => { world.terminalState = terminalState; });
  recorder.capture(world, { ruleId: "RULE_END_BEAT_RETURN_CONTROL", explanation: "Resolution returns control to the player unless a terminal boundary was reached.", sourceRefs: terminalState ? [terminalState.ruleId] : ["RULE_END_BEAT_ADVANCE"] }, () => { world.phase = world.terminalState ? "TERMINAL" : "PLAYER_COMPOSING"; });
  const rawDiffs = deepDiff({ ...before, history: [] }, { ...world, history: [] });
  const diffs: StateDiff[] = rawDiffs.map((diff, index) => {
    const cause = recorder.causes.get(diff.path);
    if (!cause) throw new Error(`Mutation at ${diff.path} has no mutation-time causal provenance.`);
    return { ...diff, traceRef: `TRACE_B${input.beat}_DIFF_${index + 1}`, ruleId: cause.ruleId, explanation: cause.explanation, sourceRefs: cause.sourceRefs };
  });
  const trace: TraceEvent[] = diffs.map((diff) => ({ id: diff.traceRef, version: "0.2", beat: input.beat, phase: "RESOLUTION", type: "STATE_DIFF", elementRefs: [diff.path], sourceRefs: diff.sourceRefs, ruleId: diff.ruleId, path: diff.path, before: diff.before, after: diff.after, explanation: diff.explanation }));
  const resolved: ResolvedBeat = {
    version: "0.2", beat: input.beat, queuedMessage, communicationEvent: event, perceptions, interpretations,
    beliefChanges: [
      ...world.characters.MARA.beliefs.filter((belief) => belief.acquiredBeat === input.beat).map((belief) => ({ characterId: "MARA" as CharacterId, beliefId: belief.id, status: belief.status, sourceRef: belief.sourceRefs[0] })),
      ...world.characters.DREW.beliefs.filter((belief) => belief.acquiredBeat === input.beat).map((belief) => ({ characterId: "DREW" as CharacterId, beliefId: belief.id, status: belief.status, sourceRef: belief.sourceRefs[0] })),
    ],
    functionalApplications: applications, builderFieldIntegrity: builderFieldIntegrity(queuedMessage), functionalPressures, candidates, selectedIntents, jointActions, performances, diffs, trace, summary,
  };
  world.history = [...input.history, resolved];
  return world;
}

export function createInitialSession(): GameSession { return { version: "0.2", world: createInitialWorld(), phase: "PLAYER_COMPOSING", draft: emptyDraft(), queuedMessage: null, queueNotice: null }; }
export function updateDraft(session: GameSession, patch: Partial<MessageDraft>): GameSession {
  if (session.world.terminalState) return session;
  const draft = { ...session.draft, ...patch };
  return { ...session, draft, queuedMessage: null, phase: "PLAYER_COMPOSING", world: { ...session.world, phase: "PLAYER_COMPOSING" }, queueNotice: session.queuedMessage ? "Queued message returned to the builder for editing." : null };
}
export function queueDraft(session: GameSession): GameSession {
  const validation = validateDraft(session.draft);
  if (!validation.valid) return { ...session, queueNotice: validation.issues.map((issue) => issue.explanation).join(" ") };
  const queuedMessage = buildStructuredMessage(session.draft, session.world.beat);
  return { ...session, queuedMessage, phase: "MESSAGE_QUEUED", world: { ...session.world, phase: "MESSAGE_QUEUED" }, queueNotice: "One message is queued. The Beat has not advanced." };
}
export function removeQueuedMessage(session: GameSession): GameSession { return { ...session, queuedMessage: null, phase: "PLAYER_COMPOSING", world: { ...session.world, phase: "PLAYER_COMPOSING" }, queueNotice: "Queue cleared. End Beat will now resolve a Wait." }; }
export function endBeat(session: GameSession): GameSession {
  const world = resolveBeat(session.world, session.queuedMessage);
  return { version: "0.2", world, phase: world.phase, draft: emptyDraft(), queuedMessage: null, queueNotice: world.terminalState ? world.terminalState.explanation : "Beat resolved. Build one message or wait." };
}

export const behaviorCount = { MARA: maraBehaviors.length, DREW: drewBehaviors.length };
export const functionalCount = functionalDefinitions.length;

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CharacterId, MessageDraft, PlayerFunctionId, WorldState } from "../core/types";
import { validateScenario } from "../core/validation";
import { allBehaviors, drewBehaviors, getBehavior, maraBehaviors } from "../data/behaviors";
import { allBasedVibes, enabledVibes, getVibe, prototypeDefaultCueShare } from "../data/based";
import { dpaDefinitions } from "../data/dpa";
import { functionalDefinitions } from "../data/functions";
import { buildStructuredMessage, compatiblePropositions, emptyDraft, recipients, validateDraft } from "../data/messageGrammar";
import { buildPerformance } from "../data/performance";
import { propositions } from "../data/propositions";
import { createInitialWorld, scenario } from "../data/scenario";
import { createInitialSession, derivePressures, endBeat, functionalCount, interpretMessage, perceiveMessage, queueDraft, removeQueuedMessage, resolveBeat, resolveJoint, scoreBehaviors, updateDraft } from "./engine";

const validDraft = (patch: Partial<MessageDraft> = {}): MessageDraft => ({
  recipientId: "MARA", subjectId: "DREW", dpa: "ASK", functionId: "CREATE_OPPORTUNITY", visibility: "PRIVATE", deliveryVibe: "ES", propositionId: "MARA_MONITOR_DREW", askPayload: {}, ...patch,
});
const resolveDraft = (world: WorldState, draft: MessageDraft) => resolveBeat(world, buildStructuredMessage(draft, world.beat));
const recipientInterpretation = (world: WorldState, draft: MessageDraft) => {
  const message = buildStructuredMessage(draft, world.beat), communication = perceiveMessage(world, message);
  return interpretMessage(world, message, communication.perceptions.find((entry) => entry.observerId === message.recipientId)!);
};
const opportunityRoute = () => {
  let session = createInitialSession();
  session = { ...session, draft: validDraft() }; session = endBeat(queueDraft(session));
  session = { ...session, draft: validDraft({ recipientId: "DREW", subjectId: "PLAYER", functionId: "VERIFY_INFORMATION", propositionId: "DREW_VERIFY_WITH_PLAYER" }) }; session = endBeat(queueDraft(session));
  session = endBeat(session); session = endBeat(session); return session;
};
const negotiatedRoute = () => {
  let session = createInitialSession();
  session = { ...session, draft: validDraft({ recipientId: "DREW", subjectId: "TRANSFER", dpa: "DEAL", functionId: "DISCHARGE_OBLIGATION", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", dealPayload: { offeredValueId: "PLAYER_PROTECTS_DREW" }, askPayload: undefined }) };
  session = endBeat(queueDraft(session)); session = endBeat(session); session = endBeat(session); return session;
};

describe("v0.2 bounded message grammar", () => {
  it("01 starts with an invalid empty draft", () => expect(validateDraft(emptyDraft()).valid).toBe(false));
  it.each(["recipientId", "subjectId", "dpa", "functionId", "visibility", "deliveryVibe", "propositionId"] as const)("requires %s", (field) => expect(validateDraft({ ...validDraft(), [field]: null }).issues.some((issue) => issue.field === field)).toBe(true));
  it("09 permits only Mara or Drew as recipients", () => expect(recipients.map((entry) => entry.id)).toEqual(["MARA", "DREW"]));
  it("10 requires an explicit Deal offer", () => expect(validateDraft(validDraft({ dpa: "DEAL", dealPayload: { offeredValueId: null } })).issues.some((issue) => issue.code === "DEAL_REQUIRES_OFFER")).toBe(true));
  it("11 requires an explicit Pressure consequence", () => expect(validateDraft(validDraft({ dpa: "PRESSURE", pressurePayload: { consequenceId: null } })).issues.some((issue) => issue.code === "PRESSURE_REQUIRES_CONSEQUENCE")).toBe(true));
  it("12 rejects a structurally valid but unmapped Vibe", () => expect(validateDraft(validDraft({ deliveryVibe: "BA" })).issues.some((issue) => issue.code === "VIBE_UNMAPPED")).toBe(true));
  it("13 exposes exactly eight enabled prototype Vibes", () => expect(enabledVibes()).toHaveLength(8));
  it("14 retains all twenty ordered non-self BASED structures", () => expect(allBasedVibes).toHaveLength(20));
  it("15 disables proposition choices that conflict with recipient", () => expect(compatiblePropositions(validDraft({ recipientId: "MARA" })).find((entry) => entry.proposition.id === "DREW_VERIFY_WITH_PLAYER")?.enabled).toBe(false));
  it("16 produces a semantic structured message with one function", () => expect(buildStructuredMessage(validDraft(), 1)).toMatchObject({ recipientId: "MARA", functionId: "CREATE_OPPORTUNITY", dpa: "ASK", version: "0.2" }));
  it("17 produces stable diagnostic message identity", () => expect(buildStructuredMessage(validDraft(), 1).id).toBe(buildStructuredMessage(validDraft(), 1).id));
});

describe("Beat queue, visibility, and perception", () => {
  it("18 queueing does not advance the Beat", () => { const session = queueDraft({ ...createInitialSession(), draft: validDraft() }); expect(session.world.beat).toBe(1); expect(session.phase).toBe("MESSAGE_QUEUED"); });
  it("19 editing a queued message does not advance the Beat", () => { const queued = queueDraft({ ...createInitialSession(), draft: validDraft() }); const edited = updateDraft(queued, { deliveryVibe: "SE" }); expect(edited.world.beat).toBe(1); expect(edited.queuedMessage).toBeNull(); });
  it("20 removing a queue does not advance the Beat", () => { const session = removeQueuedMessage(queueDraft({ ...createInitialSession(), draft: validDraft() })); expect(session.world.beat).toBe(1); expect(session.queuedMessage).toBeNull(); });
  it("21 End Beat with an empty queue resolves Wait and advances once", () => { const session = endBeat(createInitialSession()); expect(session.world.beat).toBe(2); expect(session.world.history[0].queuedMessage).toBeNull(); });
  it("22 one queue slot replaces the previous message", () => { let session = queueDraft({ ...createInitialSession(), draft: validDraft() }); session = queueDraft({ ...session, draft: validDraft({ deliveryVibe: "SE" }) }); expect(session.queuedMessage?.deliveryVibe).toBe("SE"); });
  it("23 private recipient gets full content", () => { const message = buildStructuredMessage(validDraft(), 1); const perception = perceiveMessage(createInitialWorld(), message).perceptions.find((entry) => entry.observerId === "MARA"); expect(perception?.contentAccess).toBe("FULL"); });
  it("24 attentive private nonrecipient notices contact", () => { const message = buildStructuredMessage(validDraft(), 1); const perception = perceiveMessage(createInitialWorld(), message).perceptions.find((entry) => entry.observerId === "DREW"); expect(perception?.noticedEvent).toBe(true); });
  it("25 private nonrecipient never receives content", () => { const message = buildStructuredMessage(validDraft(), 1); const perception = perceiveMessage(createInitialWorld(), message).perceptions.find((entry) => entry.observerId === "DREW"); expect(perception?.contentAccess).toBe("NONE"); expect(perception?.unavailableFacts).toContain("wording"); });
  it("26 private event-only interpretation cannot accept the request", () => { const message = buildStructuredMessage(validDraft(), 1), world = createInitialWorld(), perception = perceiveMessage(world, message).perceptions.find((entry) => entry.observerId === "DREW")!; expect(interpretMessage(world, message, perception).requestAccepted).toBe(false); });
  it("27 public observer receives full observable content", () => { const message = buildStructuredMessage(validDraft({ visibility: "PUBLIC" }), 1); expect(perceiveMessage(createInitialWorld(), message).perceptions.find((entry) => entry.observerId === "DREW")?.contentAccess).toBe("FULL"); });
  it("28 public delivery remains directly addressed to one recipient", () => { const message = buildStructuredMessage(validDraft({ visibility: "PUBLIC" }), 1); expect(message.recipientId).toBe("MARA"); });
  it("29 empty queue creates no communication event", () => expect(resolveBeat(createInitialWorld(), null).history[0].communicationEvent).toBeNull());
  it("30 exactly one communication event is stored for a queued message", () => expect(resolveDraft(createInitialWorld(), validDraft()).history[0].perceptions).toHaveLength(2));
});

describe("epistemic, DPA, and BASED boundaries", () => {
  it("31 accepted claims become REPORTED beliefs", () => { const world = resolveDraft(createInitialWorld(), validDraft({ subjectId: "MARA", functionId: "VERIFY_INFORMATION", propositionId: "MARA_IS_AUTHORIZED", visibility: "PUBLIC" })); expect(world.characters.MARA.beliefs.some((belief) => belief.predicate === "authorized" && belief.status === "REPORTED")).toBe(true); });
  it("32 conflicting prior belief lowers credibility", () => { const draft = validDraft({ recipientId: "DREW", subjectId: "MARA", functionId: "VERIFY_INFORMATION", propositionId: "MARA_IS_AUTHORIZED", visibility: "PUBLIC" }); const world = createInitialWorld(); const withConflict = recipientInterpretation(world, draft); world.characters.DREW.beliefs = world.characters.DREW.beliefs.filter((belief) => belief.predicate !== "authorized"); const withoutConflict = recipientInterpretation(world, draft); expect(withConflict.perceivedCredibility).toBeLessThan(withoutConflict.perceivedCredibility); });
  it("33 objective envelope state does not alter message credibility", () => { const draft = validDraft({ recipientId: "DREW", subjectId: "MARA", functionId: "VERIFY_INFORMATION", propositionId: "MARA_IS_AUTHORIZED", visibility: "PUBLIC" }); const first = createInitialWorld(), second = createInitialWorld(); second.envelope.holder = "MARA"; second.envelope.location = null; expect(recipientInterpretation(first, draft).perceivedCredibility).toBe(recipientInterpretation(second, draft).perceivedCredibility); });
  it("34 direct observation can refute an earlier attention belief", () => { let session = createInitialSession(); session = endBeat(queueDraft({ ...session, draft: validDraft() })); session = endBeat(queueDraft({ ...session, draft: validDraft({ recipientId: "DREW", subjectId: "PLAYER", functionId: "VERIFY_INFORMATION", propositionId: "DREW_VERIFY_WITH_PLAYER" }) })); session = endBeat(session); expect(session.world.characters.MARA.beliefs.some((belief) => belief.predicate === "attention" && belief.value === "MARA" && belief.status === "REFUTED")).toBe(true); });
  it("35 Ask preserves more voluntariness than Pressure", () => expect(dpaDefinitions.ASK.baseline.voluntariness).toBeGreaterThan(dpaDefinitions.PRESSURE.baseline.voluntariness));
  it("36 Deal contributes more exchange value than Ask", () => expect(dpaDefinitions.DEAL.baseline.value).toBeGreaterThan(dpaDefinitions.ASK.baseline.value));
  it("37 Pressure contributes more threat than Deal", () => expect(dpaDefinitions.PRESSURE.baseline.threat).toBeGreaterThan(dpaDefinitions.DEAL.baseline.threat));
  it("38 same Vibe produces recipient-sensitive reception", () => { const draft = validDraft({ visibility: "PUBLIC" }); const message = buildStructuredMessage(draft, 1), world = createInitialWorld(), p = perceiveMessage(world, message).perceptions; const mara = interpretMessage(world, message, p.find((entry) => entry.observerId === "MARA")!), drew = interpretMessage(world, message, p.find((entry) => entry.observerId === "DREW")!); expect(mara.basedBreakdown[0].value).not.toBe(drew.basedBreakdown[0].value); });
  it("39 ordered Vibes are directional", () => expect(enabledVibes().find((entry) => entry.code === "SD")?.prototypeModifiers).not.toEqual(enabledVibes().find((entry) => entry.code === "DS")?.prototypeModifiers));
  it("40 BASED mappings remain explicitly provisional", () => expect(enabledVibes().every((entry) => entry.version === "0.2-provisional" && entry.status === "PROTOTYPE_PROVISIONAL")).toBe(true));
  it("41 rejected Deal creates no commitment", () => { const world = createInitialWorld(); world.characters.DREW.beliefs.find((belief) => belief.predicate === "reliable")!.value = false; world.characters.DREW.beliefs.find((belief) => belief.predicate === "reliable")!.confidence = 1; world.characters.DREW.metrics.alert = 1; const result = resolveDraft(world, validDraft({ recipientId: "DREW", subjectId: "TRANSFER", dpa: "DEAL", functionId: "DISCHARGE_OBLIGATION", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", dealPayload: { offeredValueId: "FUTURE_RECIPROCITY" }, askPayload: undefined })); expect(result.social.exchanges[0].status).toBe("REJECTED"); expect(result.social.commitments).toHaveLength(0); });
  it("42 accepted Deal creates an accepted exchange and active commitment", () => { const result = resolveDraft(createInitialWorld(), validDraft({ recipientId: "DREW", subjectId: "TRANSFER", dpa: "DEAL", functionId: "DISCHARGE_OBLIGATION", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", dealPayload: { offeredValueId: "PLAYER_PROTECTS_DREW" }, askPayload: undefined })); expect(result.social.exchanges[0].status).toBe("ACCEPTED"); expect(result.social.commitments[0].status).toBe("ACTIVE"); });
  it("43 Pressure can yield presented compliance without request acceptance", () => { const interpretation = recipientInterpretation(createInitialWorld(), validDraft({ recipientId: "DREW", subjectId: "TRANSFER", dpa: "PRESSURE", functionId: "REDUCE_RISK", deliveryVibe: "BE", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", pressurePayload: { consequenceId: "REFUSAL_REPORTED" }, askPayload: undefined })); expect(interpretation.presentedCompliance).toBe(true); expect(interpretation.requestAccepted).toBe(false); });
});

describe("functions, behavior, routes, and joint action", () => {
  it("44 defines twelve distinct functional elements", () => expect(functionalCount).toBe(12));
  it("45 declares compatibility and conflict operational data", () => expect(functionalDefinitions.some((entry) => entry.compatibleFunctions.length && entry.conflictingFunctions.length)).toBe(true));
  it("46 CREATE_OPPORTUNITY creates a monitor plan and no direct opportunity award", () => { const result = resolveDraft(createInitialWorld(), validDraft()); expect(result.characters.MARA.plans.some((plan) => plan.kind === "MONITOR_FOR_OPENING")).toBe(true); expect(result.characters.MARA.metrics.perceivedOpportunity).toBe(0.16); });
  it("47 function identity changes the resulting application", () => { const first = resolveDraft(createInitialWorld(), validDraft()); const second = resolveDraft(createInitialWorld(), validDraft({ functionId: "REDUCE_RISK" })); expect(first.history[0].functionalApplications[0].effectKind).toBe("PLAN"); expect(second.history[0].functionalApplications[0].interpretedFunctionId).toBe("REDUCE_RISK"); });
  it("48 VERIFY_INFORMATION specifically selects player-channel questioning", () => { let session = createInitialSession(); session = endBeat(queueDraft({ ...session, draft: validDraft({ recipientId: "DREW", subjectId: "PLAYER", functionId: "VERIFY_INFORMATION", propositionId: "DREW_VERIFY_WITH_PLAYER" }) })); expect(session.world.history[0].selectedIntents.DREW).toBe("QUESTION_PLAYER"); });
  it("49 defines exactly nine active Mara behaviors", () => expect(maraBehaviors).toHaveLength(9));
  it("50 defines exactly twelve active Drew behaviors", () => expect(drewBehaviors).toHaveLength(12));
  it("51 every active behavior has a real effect rule", () => expect(allBehaviors.every((behavior) => behavior.status === "ACTIVE" && behavior.effectRuleIds.length > 0)).toBe(true));
  it("52 every behavior is eligible in at least one authored or constructed state", () => {
    const seen = new Set<string>();
    const capture = (world: WorldState, actor: CharacterId) => scoreBehaviors(world, actor, derivePressures(world, actor)).filter((entry) => entry.eligible).forEach((entry) => seen.add(entry.behaviorId));
    const initial = createInitialWorld(); capture(initial, "MARA"); capture(initial, "DREW");
    const take = createInitialWorld(); take.characters.MARA.beliefs.push({ id: "OBS", version: "0.2", subjectId: "DREW", predicate: "attention", value: "PLAYER_CHANNEL", confidence: 1, source: "OBSERVATION", acquiredBeat: 1, status: "OBSERVED", sourceRefs: [] }); take.characters.MARA.metrics.perceivedOpportunity = 1; take.characters.MARA.metrics.nerve = 1; capture(take, "MARA");
    const held = createInitialWorld(); held.envelope.holder = "MARA"; held.envelope.location = null; held.characters.MARA.hasEnvelope = true; capture(held, "MARA");
    const danger = createInitialWorld(); danger.characters.MARA.metrics.perceivedRisk = 1; capture(danger, "MARA");
    const social = createInitialWorld();
    social.social.exchanges.push({ id: "X", version: "0.2", beat: 1, proposerId: "PLAYER", recipientId: "DREW", requestedPropositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", requestedAction: "OFFER_TRANSFER", offeredValueId: "PLAYER_PROTECTS_DREW", status: "ACCEPTED", sourceRefs: [] });
    social.social.commitments.push({ id: "C", version: "0.2", debtorId: "DREW", creditorId: "PLAYER", kind: "PERFORM_OFFER_TRANSFER", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", requestedAction: "OFFER_TRANSFER", status: "ACTIVE", createdBeat: 1, sourceRefs: ["X"] });
    capture(social, "DREW"); social.social.transferOffers.push({ id: "O", version: "0.2", fromId: "DREW", toId: "MARA", objectId: "ENVELOPE", status: "OPEN", createdBeat: 1, sourceRefs: [] }); capture(social, "MARA"); capture(social, "DREW");
    const alert = createInitialWorld(); alert.characters.DREW.metrics.alert = 1; alert.characters.DREW.intent.concealed = true; capture(alert, "DREW");
    expect([...allBehaviors.map((item) => item.id).filter((id) => !seen.has(id))]).toEqual([]);
  });
  it("53 opportunity route resolves through monitor, later observation, take, and exit", () => { const session = opportunityRoute(); expect(session.world.terminalState).toMatchObject({ kind: "SUCCESS", route: "OPPORTUNITY" }); expect(session.world.history.map((beat) => beat.selectedIntents.MARA)).toEqual(["MONITOR_DREW", "MONITOR_DREW", "TAKE_ENVELOPE", "LEAVE"]); });
  it("54 negotiated route resolves through offer, matched transfer, and exit", () => { const session = negotiatedRoute(); expect(session.world.terminalState).toMatchObject({ kind: "SUCCESS", route: "NEGOTIATED" }); expect(session.world.history.some((beat) => beat.jointActions.some((joint) => joint.matched))).toBe(true); });
  it("55 one-sided completion cannot transfer possession", () => { const world = createInitialWorld(); world.social.transferOffers.push({ id: "O", version: "0.2", fromId: "DREW", toId: "MARA", objectId: "ENVELOPE", status: "OPEN", createdBeat: 1, sourceRefs: [] }); const joint = resolveJoint(world, "WAIT", "COMPLETE_TRANSFER"); expect(joint[0].matched).toBe(false); expect(world.envelope.holder).toBeNull(); });
  it("56 matched acceptance and completion transfer exactly once", () => { const world = createInitialWorld(); world.social.transferOffers.push({ id: "O", version: "0.2", fromId: "DREW", toId: "MARA", objectId: "ENVELOPE", status: "OPEN", createdBeat: 1, sourceRefs: [] }); const joint = resolveJoint(world, "ACCEPT_TRANSFER", "COMPLETE_TRANSFER"); expect(joint[0].matched).toBe(true); expect(world.envelope.holder).toBe("MARA"); expect(world.social.transferOffers[0].status).toBe("COMPLETED"); });
  it("57 same-snapshot resolution delays opportunity until the next Beat", () => { let session = createInitialSession(); session = endBeat(queueDraft({ ...session, draft: validDraft() })); session = endBeat(queueDraft({ ...session, draft: validDraft({ recipientId: "DREW", subjectId: "PLAYER", functionId: "VERIFY_INFORMATION", propositionId: "DREW_VERIFY_WITH_PLAYER" }) })); expect(session.world.history[1].selectedIntents.MARA).toBe("MONITOR_DREW"); session = endBeat(session); expect(session.world.history[2].selectedIntents.MARA).toBe("TAKE_ENVELOPE"); });
});

describe("trace, performance, validation, and removed shortcuts", () => {
  it("58 every diff has an exact trace reference and rule", () => { const beat = resolveDraft(createInitialWorld(), validDraft()).history[0]; expect(beat.diffs.every((diff) => beat.trace.some((trace) => trace.id === diff.traceRef && trace.ruleId === diff.ruleId && trace.path === diff.path))).toBe(true); });
  it("59 trace preserves before and after values", () => { const trace = resolveDraft(createInitialWorld(), validDraft()).history[0].trace; expect(trace.some((entry) => entry.before !== undefined && entry.after !== undefined)).toBe(true); });
  it("60 performance separates execution Vibe from message delivery Vibe", () => { const beat = resolveDraft(createInitialWorld(), validDraft({ deliveryVibe: "AD" })).history[0]; expect(beat.performances.MARA.executionVibe).not.toBe("AD"); });
  it("61 performance plans visibly specify delay and progressive reveal", () => { const plan = resolveDraft(createInitialWorld(), validDraft()).history[0].performances.MARA; expect(plan.textPlan.initialDelayMs).toBeGreaterThan(0); expect(plan.textPlan.revealIntervalMs).toBeGreaterThan(0); });
  it("62 performance plans specify pause, emphasis, volume, tempo, and completion", () => { const plan = negotiatedRoute().world.history[0].performances.DREW.textPlan; expect(plan).toEqual(expect.objectContaining({ pausePositions: expect.any(Array), emphasisRanges: expect.any(Array), volume: expect.any(String), tempo: expect.any(String), completion: expect.any(String) })); });
  it("63 feigned compliance keeps internal and presented stance separate", () => { const world = createInitialWorld(); world.characters.DREW.intent.concealed = true; const scored = scoreBehaviors(world, "DREW", derivePressures(world, "DREW")); expect(scored.find((entry) => entry.behaviorId === "FEIGN_COMPLIANCE")?.eligible).toBe(true); });
  it("64 startup data validation succeeds", () => expect(validateScenario(scenario)).toEqual([]));
  it("65 engine resolution is deterministic", () => { const message = buildStructuredMessage(validDraft(), 1); expect(resolveBeat(createInitialWorld(), message)).toEqual(resolveBeat(createInitialWorld(), message)); });
  it("66 Beat history retains exact prior resolved records", () => { let world = resolveBeat(createInitialWorld(), null); const first = structuredClone(world.history[0]); world = resolveBeat(world, null); expect(world.history[0]).toEqual(first); expect(world.history).toHaveLength(2); });
  it("67 legacy engine contains no v0.1 card, buzzer, or truth shortcuts", () => { const files = ["src/core/types.ts", "src/data/scenario.ts", "src/data/propositions.ts", "src/simulation/engine.ts"]; const source = files.map((file) => readFileSync(file, "utf8")).join("\n"); expect(source).not.toMatch(/scenario\.cards|triggerBuzzer|intendedFunctionTags|truthStatusInWorld|buzzer/i); });
  it("68 message-instance ID never controls logic", () => { const source = readFileSync("src/simulation/engine.ts", "utf8"); expect(source).not.toMatch(/message\.id\s*===|switch\s*\(message\.id\)/); });
  it("69 all propositions and functions use declared semantic relations", () => { const ids = new Set(functionalDefinitions.map((entry) => entry.id)); expect(propositions.every((proposition) => proposition.compatibleFunctions.every((id: PlayerFunctionId) => ids.has(id)))).toBe(true); });
});

describe("v0.2.1 behavioral stabilization", () => {
  it("70 accepts an unrelated Deal without creating a transfer commitment or offer route", () => {
    const draft = validDraft({ recipientId: "DREW", subjectId: "PLAYER", dpa: "DEAL", functionId: "REDUCE_RISK", propositionId: "PLAYER_WILL_PROTECT_DREW", dealPayload: { offeredValueId: "PLAYER_ACCEPTS_RESPONSIBILITY" }, askPayload: undefined });
    const world = resolveDraft(createInitialWorld(), draft), beat = world.history[0];
    expect(world.social.exchanges[0].status).toBe("ACCEPTED");
    expect(world.social.exchanges[0].requestedAction).toBeNull();
    expect(world.social.commitments).toHaveLength(0);
    expect(beat.candidates.DREW.find((entry) => entry.behaviorId === "OFFER_TRANSFER")?.eligible).toBe(false);
    expect(world.social.transferOffers).toHaveLength(0);
  });

  it("71 creates a transfer-specific commitment only for the relevant accepted Deal", () => {
    const world = resolveDraft(createInitialWorld(), validDraft({ recipientId: "DREW", subjectId: "TRANSFER", dpa: "DEAL", functionId: "DISCHARGE_OBLIGATION", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", dealPayload: { offeredValueId: "PLAYER_PROTECTS_DREW" }, askPayload: undefined }));
    expect(world.social.commitments).toContainEqual(expect.objectContaining({ propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", requestedAction: "OFFER_TRANSFER", status: "ACTIVE" }));
    expect(world.history[0].selectedIntents.DREW).toBe("OFFER_TRANSFER");
  });

  it("72 gives messages differing only in proposition distinct identities", () => {
    const first = buildStructuredMessage(validDraft({ subjectId: "ATTENTION", propositionId: "MARA_MONITOR_DREW" }), 1);
    const second = buildStructuredMessage(validDraft({ subjectId: "ATTENTION", propositionId: "MARA_WAIT" }), 1);
    expect(first.id).not.toBe(second.id);
  });

  it("73 fingerprints Deal offers, Pressure consequences, and Ask reasons", () => {
    const dealA = buildStructuredMessage(validDraft({ recipientId: "DREW", subjectId: "TRANSFER", dpa: "DEAL", functionId: "DISCHARGE_OBLIGATION", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", dealPayload: { offeredValueId: "PLAYER_PROTECTS_DREW" }, askPayload: undefined }), 1);
    const dealB = buildStructuredMessage(validDraft({ recipientId: "DREW", subjectId: "TRANSFER", dpa: "DEAL", functionId: "DISCHARGE_OBLIGATION", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", dealPayload: { offeredValueId: "FUTURE_RECIPROCITY" }, askPayload: undefined }), 1);
    const pressureA = buildStructuredMessage(validDraft({ dpa: "PRESSURE", pressurePayload: { consequenceId: "ACCESS_WITHDRAWN" }, askPayload: undefined }), 1);
    const pressureB = buildStructuredMessage(validDraft({ dpa: "PRESSURE", pressurePayload: { consequenceId: "RELATIONSHIP_DAMAGED" }, askPayload: undefined }), 1);
    const askA = buildStructuredMessage(validDraft({ askPayload: { reasonId: "REASON_SAFER" } }), 1), askB = buildStructuredMessage(validDraft({ askPayload: { reasonId: "REASON_TRUST" } }), 1);
    expect(dealA.id).not.toBe(dealB.id); expect(pressureA.id).not.toBe(pressureB.id); expect(askA.id).not.toBe(askB.id);
    expect(buildStructuredMessage(validDraft({ askPayload: { reasonId: "REASON_SAFER" } }), 1).id).toBe(askA.id);
  });

  it("74 keeps generated wording out of behavior logic", () => {
    const original = buildStructuredMessage(validDraft(), 1), changed = { ...original, surfaceText: "Mechanically irrelevant wording." };
    const first = resolveBeat(createInitialWorld(), original), second = resolveBeat(createInitialWorld(), changed);
    expect(first.history[0].selectedIntents).toEqual(second.history[0].selectedIntents);
    expect(first.characters).toEqual(second.characters); expect(first.social).toEqual(second.social);
  });

  it("75 diverted attention prevents private-contact notice and inference", () => {
    const world = createInitialWorld(); world.characters.DREW.attention = { primaryTarget: "EXIT", secondaryTarget: null, strength: 0.9, reasonRefs: ["TEST_DIVERTED"], lastChangedBeat: 0 }; world.characters.DREW.metrics.alert = 0; world.characters.DREW.metrics.suspicionOfOther = 0;
    const resolved = resolveDraft(world, validDraft()), perception = resolved.history[0].perceptions.find((entry) => entry.observerId === "DREW");
    expect(perception?.noticedEvent).toBe(false); expect(resolved.characters.DREW.inferences).toHaveLength(0);
  });

  it("76 anchors coordination inference provenance to perception, never hidden content", () => {
    const world = resolveDraft(createInitialWorld(), validDraft()), inference = world.characters.DREW.inferences[0], perception = world.history[0].perceptions.find((entry) => entry.observerId === "DREW")!;
    expect(inference.evidenceRefs).toEqual([perception.id]); expect(inference.unavailableFacts).toContain("proposition");
    expect(world.characters.DREW.beliefs.some((belief) => belief.sourceRefs.includes(world.history[0].queuedMessage!.id))).toBe(false);
  });

  it("77 changes acceptance when only a provisional delivery Vibe changes", () => {
    const base = { recipientId: "DREW" as const, subjectId: "TRANSFER" as const, dpa: "DEAL" as const, functionId: "DISCHARGE_OBLIGATION" as const, propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", dealPayload: { offeredValueId: "PLAYER_PROTECTS_DREW" }, askPayload: undefined };
    const warm = recipientInterpretation(createInitialWorld(), validDraft({ ...base, deliveryVibe: "ES" }));
    const hard = recipientInterpretation(createInitialWorld(), validDraft({ ...base, deliveryVibe: "AD" }));
    expect(warm.perceivedCredibility).toBeGreaterThan(hard.perceivedCredibility); expect(warm.resistance).toBeLessThan(hard.resistance); expect(warm.dealAccepted).not.toBe(hard.dealAccepted);
  });

  it("78 preserves non-completion and completion performance wording around the joint match", () => {
    const actor = createInitialWorld().characters.DREW, behavior = getBehavior("COMPLETE_TRANSFER");
    const unmatched = buildPerformance(actor, behavior, undefined, 2, false), matched = buildPerformance(actor, behavior, undefined, 2, true);
    expect(unmatched.line).not.toContain("agreed"); expect(unmatched.actionPresentationId).toContain("UNMATCHED");
    expect(matched.line).toBe("Then we are agreed."); expect(matched.actionPresentationId).toContain("MATCHED");
  });

  it("79 attributes opportunity and nerve mutations to the observation rule at mutation time", () => {
    const session = opportunityRoute(), takeBeat = session.world.history[2];
    const opportunity = takeBeat.diffs.find((diff) => diff.path.endsWith("characters.MARA.metrics.perceivedOpportunity"));
    const nerve = takeBeat.diffs.find((diff) => diff.path.endsWith("characters.MARA.metrics.nerve"));
    expect(opportunity?.ruleId).toBe("RULE_SCENARIO_MONITOR_OBSERVES_DIVERSION"); expect(nerve?.ruleId).toBe("RULE_SCENARIO_MONITOR_OBSERVES_DIVERSION");
    expect(opportunity?.sourceRefs).toContain("PLAN_B1_MARA_MONITOR");
  });

  it("80 keeps TAKE effects separate from earlier observation effects", () => {
    const beat = opportunityRoute().world.history[2], takeDiffs = beat.diffs.filter((diff) => diff.ruleId === "RULE_EFFECT_TAKE_ENVELOPE");
    expect(takeDiffs.some((diff) => diff.path.includes("envelope.holder"))).toBe(true);
    expect(takeDiffs.some((diff) => diff.path.endsWith("perceivedOpportunity") || diff.path.endsWith("nerve"))).toBe(false);
  });

  it("81 records joint transfer provenance and preserves exclusive possession", () => {
    const session = negotiatedRoute(), jointBeat = session.world.history.find((beat) => beat.jointActions.some((joint) => joint.matched))!;
    expect(jointBeat.diffs.filter((diff) => diff.path.includes("envelope") || diff.path.endsWith("hasEnvelope")).every((diff) => diff.ruleId === "RULE_JOINT_TRANSFER_MATCH")).toBe(true);
    expect(Number(session.world.characters.MARA.hasEnvelope) + Number(session.world.characters.DREW.hasEnvelope)).toBe(1);
  });
});

describe("v0.2.1 semantic invariants and registry integrity", () => {
  it("82 keeps canonical BASED names separate from scenario aliases", () => {
    expect(getVibe("ES")).toMatchObject({ canonicalName: "Community-Minded", scenarioAlias: "steady warmth" });
    expect(getVibe("BE")).toMatchObject({ canonicalName: "Condemning", scenarioAlias: "unyielding" });
  });

  it("83 makes the first Cue dominant for every registry entry", () => expect(allBasedVibes.every((vibe) => vibe.dominantCue === vibe.code[0] && vibe.secondaryCue === vibe.code[1])).toBe(true));

  it("84 labels 62:38 as one prototype-local default and leaves reserved Vibes unmapped", () => {
    expect(prototypeDefaultCueShare).toEqual({ dominant: 0.62, secondary: 0.38 });
    expect(allBasedVibes.filter((vibe) => vibe.status === "RESERVED_UNMAPPED")).toHaveLength(12);
    expect(allBasedVibes.filter((vibe) => vibe.status === "RESERVED_UNMAPPED").every((vibe) => !vibe.prototypeModifiers && !vibe.canonicalName)).toBe(true);
  });

  it("85 exposes honest Function classifications and no fabricated reinterpretation", () => {
    expect(functionalDefinitions.find((entry) => entry.id === "REDUCE_RISK")?.operationalStatus).toBe("PARTIAL");
    expect(functionalDefinitions.find((entry) => entry.id === "DISCHARGE_OBLIGATION")?.operationalStatus).toBe("PARTIAL");
    const interpretation = recipientInterpretation(createInitialWorld(), validDraft());
    expect(interpretation.functionalApplications.every((application) => application.intendedFunctionId === application.interpretedFunctionId)).toBe(true);
  });

  it("86 applies declared Function conflict as real score friction", () => {
    const world = createInitialWorld(); world.social.commitments.push({ id: "C", version: "0.2", debtorId: "DREW", creditorId: "PLAYER", kind: "PERFORM_OFFER_TRANSFER", propositionId: "DREW_RELEASE_ENVELOPE_TO_MARA", requestedAction: "OFFER_TRANSFER", status: "ACTIVE", createdBeat: 1, sourceRefs: [] });
    const all = derivePressures(world, "DREW"), withoutControl = all.filter((entry) => entry.functionId !== "MAINTAIN_CONTROL");
    const withConflict = scoreBehaviors(world, "DREW", all).find((entry) => entry.behaviorId === "OFFER_TRANSFER")!.components.find((entry) => entry.id === "FUNCTION_RELATIONS")!.value;
    const withoutConflictValue = scoreBehaviors(world, "DREW", withoutControl).find((entry) => entry.behaviorId === "OFFER_TRANSFER")!.components.find((entry) => entry.id === "FUNCTION_RELATIONS")!.value;
    expect(withConflict).toBeLessThan(withoutConflictValue);
  });

  it("87 gives every final state diff mutation-time provenance and semantic sources", () => {
    const beat = opportunityRoute().world.history[2];
    expect(beat.diffs.every((diff) => diff.ruleId && diff.explanation && diff.sourceRefs.length)).toBe(true);
    expect(readFileSync("src/simulation/engine.ts", "utf8")).not.toContain("ruleForDiff");
  });

  it("88 keeps deterministic replay identity and causal provenance stable", () => {
    const message = buildStructuredMessage(validDraft(), 1), first = resolveBeat(createInitialWorld(), message).history[0], second = resolveBeat(createInitialWorld(), message).history[0];
    expect(first.queuedMessage?.id).toBe(second.queuedMessage?.id); expect(first.diffs).toEqual(second.diffs); expect(first.trace).toEqual(second.trace);
  });

  it("89 records Wait as a no-message Beat with one clock advance", () => {
    const world = resolveBeat(createInitialWorld(), null), beat = world.history[0];
    expect(world.beat).toBe(2); expect(beat.queuedMessage).toBeNull(); expect(beat.communicationEvent).toBeNull();
    expect(beat.trace.some((entry) => entry.ruleId === "RULE_END_BEAT_ADVANCE" && entry.sourceRefs.includes("PLAYER_WAIT"))).toBe(true);
  });
});

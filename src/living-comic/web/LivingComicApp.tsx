"use client";

import { useMemo, useState } from "react";
import {
  actionBuildContext,
  makeAskPackage,
  makeDealPackage,
  makeDealResponsePackage,
  makeDirectPackage,
  makePressurePackage,
  makeWaitPackage,
  type ActionPackage,
  type LivingComicEngineState,
} from "../actions";
import { loadDefaultContent } from "../content";
import { createReplaySpec, resolveBeat, startScene } from "../engine";
import { createPhase9AcceptanceSetup, phase9ManualScript } from "../fixtures/phase9Acceptance";
import { generateScene } from "../generation";
import { buildDebugView, buildPlayerSafeView } from "../presentation";
import { deliveryOptionsFor, describeProposition, realizeActionPackage } from "../realization";
import { runtimeSnapshotSchema, type GeneratedScene } from "../schemas";
import { directDraftChoices, socialSemanticOptions } from "./playerDraft";

const content = loadDefaultContent();
const SNAPSHOT_STORAGE_KEY = "living_comic_runtime_v0_1";

type PlayMode = "SETUP" | "PLAY" | "DEBUG";
type BuilderMode = "DIRECT" | "ASK" | "PRESSURE" | "DEAL" | "DEAL_RESPONSE" | "WAIT";
type DebugTab = "WORLD" | "CHARACTERS" | "GOALS / REASONS" | "BELIEFS" | "ACTIONS" | "EVENTS" | "PERCEPTIONS" | "INTERPRETATIONS" | "HISTORY" | "GENERATOR" | "BEAT TRACE";

const debugTabs: DebugTab[] = ["WORLD", "CHARACTERS", "GOALS / REASONS", "BELIEFS", "ACTIONS", "EVENTS", "PERCEPTIONS", "INTERPRETATIONS", "HISTORY", "GENERATOR", "BEAT TRACE"];
const builderLabels: Record<BuilderMode, string> = { DIRECT: "Act directly", ASK: "Ask", PRESSURE: "Pressure", DEAL: "Deal", DEAL_RESPONSE: "Deal response", WAIT: "Wait" };

const entityName = (generated: GeneratedScene, id: string): string => {
  const character = generated.snapshot.characters.find((candidate) => candidate.id === id);
  if (character) return content.characters.find(({ id: definitionId }) => definitionId === character.definitionId)?.displayName ?? id;
  const object = generated.snapshot.objects.find((candidate) => candidate.id === id);
  if (object) return content.objects.find(({ id: definitionId }) => definitionId === object.definitionId)?.label ?? id;
  return id.replace(/^zone_/, "").replaceAll("_", " ");
};

interface PlayerDraftSelection {
  targetActorId: string;
  directChoiceId: string;
  requestedChangeId: string;
  consequenceId: string;
  offeredChangeId: string;
  basedVibeId: string;
  messageDelivery: "OPEN" | "PRIVATE";
  dealResponse: "ACCEPT" | "REJECT" | "COUNTER";
}

const makePlayerPackage = (
  state: LivingComicEngineState,
  mode: BuilderMode,
  selection: PlayerDraftSelection,
): ActionPackage => {
  const snapshot = state.snapshot;
  const context = actionBuildContext(snapshot);
  const playerId = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!.id;
  const semantic = socialSemanticOptions(snapshot, selection.targetActorId);
  const requested = semantic.requested.find(({ id }) => id === selection.requestedChangeId) ?? semantic.requested[0]!;
  const consequence = semantic.consequences.find(({ id }) => id === selection.consequenceId) ?? semantic.consequences[0]!;
  const offered = semantic.offers.find(({ id }) => id === selection.offeredChangeId) ?? semantic.offers[0]!;

  if (mode === "WAIT") return makeWaitPackage(context, playerId);
  const messageOptions = { basedVibeId: selection.basedVibeId, delivery: selection.messageDelivery };
  if (mode === "ASK") return makeAskPackage(context, content, playerId, selection.targetActorId, requested.proposition, messageOptions);
  if (mode === "PRESSURE") return makePressurePackage(context, content, playerId, selection.targetActorId, requested.proposition, consequence.proposition, messageOptions);
  if (mode === "DEAL") return makeDealPackage(context, content, playerId, selection.targetActorId, requested.proposition, offered.proposition, messageOptions);
  if (mode === "DEAL_RESPONSE") {
    const inbound = snapshot.deals.find((deal) => deal.recipientId === playerId && deal.status === "PROPOSED");
    if (!inbound) return makeWaitPackage(context, playerId);
    if (selection.dealResponse !== "COUNTER") return makeDealResponsePackage(context, playerId, inbound.id, selection.dealResponse);
    const counterSemantic = socialSemanticOptions(snapshot, inbound.proposerId);
    const counterRequested = counterSemantic.requested.find(({ id }) => id === selection.requestedChangeId) ?? counterSemantic.requested[0]!;
    const counterOffered = counterSemantic.offers.find(({ id }) => id === selection.offeredChangeId) ?? counterSemantic.offers[0]!;
    const counter = makeDealPackage(context, content, playerId, inbound.proposerId, counterRequested.proposition, counterOffered.proposition, messageOptions, inbound.id);
    return makeDealResponsePackage(context, playerId, inbound.id, "COUNTER", { deal: counter.proposedDeal!, terms: counter.dealTerms! });
  }

  const choices = directDraftChoices(snapshot, content);
  const choice = choices.find(({ id }) => id === selection.directChoiceId) ?? choices[0];
  if (!choice) return makeWaitPackage(context, playerId);
  return makeDirectPackage(context, content, playerId, choice.operationId, choice.targetId, choice.intention, choice.parameters);
};

function SetupScreen({ generated, seed, setSeed, regenerate, choose, loadAcceptance }: { generated: GeneratedScene; seed: number; setSeed: (value: number) => void; regenerate: () => void; choose: (id: string) => void; loadAcceptance: () => void }) {
  const room = content.roomPresets.find(({ id }) => id === generated.snapshot.room.presetId)?.label ?? "A room";
  return <main className="lc-shell lc-setup"><header className="lc-titlebar"><div className="lc-monogram">LC</div><div><span className="lc-kicker">Deterministic social-world prototype</span><h1>Living Comic Engine <em>v0.1</em></h1></div></header>
    <section className="lc-setup-grid"><div className="lc-setup-scene"><span className="lc-index">Situation / seed {seed}</span><h2>Three people enter {room.toLowerCase()} with unfinished history.</h2><p>One object sits at the center of a disagreement. Everyone has reasons. Nobody has the whole picture.</p>
      <div className="lc-cast-strip">{generated.snapshot.characters.map((character, index) => <article key={character.id}><div className={`lc-avatar tone-${index}`}><span>{entityName(generated, character.id).slice(0, 1)}</span></div><strong>{character.role === "PLAYER_ROLE" ? "You" : entityName(generated, character.id)}</strong><small>{content.characters.find(({ id }) => id === character.definitionId)?.description}</small></article>)}</div>
      <label className="lc-seed-control"><span>Generate another deterministic situation</span><div><input aria-label="Scene seed" type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))}/><button onClick={regenerate}>Generate</button></div></label><button className="lc-acceptance-load" onClick={loadAcceptance}>Load Phase 9 acceptance fixture</button></div>
      <div className="lc-motivation-card"><span className="lc-index">Choose what matters to you</span><h2>Your Goal &amp; Reason</h2><p className="lc-muted">The situation stays the same. Your purpose inside it changes.</p><div className="lc-options">{generated.playerOptions.map((option, index) => <button key={option.id} onClick={() => choose(option.id)}><span>Path 0{index + 1}</span><strong>{option.label.split(":")[0]}</strong><small>{option.label.split(":").slice(1).join(":")}</small><i>Enter this story →</i></button>)}</div></div></section></main>;
}

function ComicScene({ view, panelIndex, setPanelIndex, onCharacterClick, onObjectClick, onZoneClick }: {
  view: ReturnType<typeof buildPlayerSafeView>;
  panelIndex: number;
  setPanelIndex: (index: number) => void;
  onCharacterClick: (id: string) => void;
  onObjectClick: (id: string) => void;
  onZoneClick: (id: string) => void;
}) {
  const panel = view.resultPanels[panelIndex];
  const object = view.objects[0];
  return <section className="lc-comic" aria-label="Living comic scene"><div className="lc-panel-number">PANEL {String(view.beat || 1).padStart(2, "0")}</div><div className="lc-room"><div className="lc-window"><span>WINDOW</span></div><button className="lc-door" onClick={() => onZoneClick("zone_exit")} aria-label="Use exit zone"><span>EXIT</span></button><button className="lc-table" onClick={() => object && onObjectClick(object.id)} disabled={!object} aria-label="Use central object"><span>{object?.label ?? "OBJECT"}</span></button>
    <div className="lc-prop-strip" aria-label="Other active objects">{view.objects.slice(1).map((item) => <button key={item.id} onClick={() => onObjectClick(item.id)}><strong>{item.label}</strong><small>{item.zoneId.replace("zone_", "")}</small></button>)}</div>
    {view.characters.map((character, index) => <button className={`lc-character lc-zone-${character.zoneId.replace("zone_", "")} tone-${index}`} key={character.id} aria-label={`Use ${character.label}`} onClick={() => character.roleLabel !== "You" && onCharacterClick(character.id)}><span className="lc-head">{character.label.slice(0, 1)}</span><strong>{character.roleLabel === "You" ? "YOU" : character.label.toUpperCase()}</strong><small>{character.zoneId.replace("zone_", "")}</small></button>)}
    {panel?.message ? <div className={`lc-balloon ${panel.message.balloonLabel.toLowerCase()}`}><span>{panel.actorLabel}</span><blockquote>“{panel.message.wording}”</blockquote><small>{panel.message.deliveryLabel} · {panel.message.poseLabel} posture · {panel.message.faceLabel} face</small></div> : null}
    {panel && !panel.message ? <div className="lc-caption"><span>{panel.actorLabel}</span><p>{panel.body}.</p></div> : null}</div>
    {view.resultPanels.length > 1 ? <div className="lc-micro-nav"><button onClick={() => setPanelIndex(Math.max(0, panelIndex - 1))} disabled={panelIndex === 0}>← Earlier</button><span>Moment {panelIndex + 1} of {view.resultPanels.length}</span><button onClick={() => setPanelIndex(Math.min(view.resultPanels.length - 1, panelIndex + 1))} disabled={panelIndex === view.resultPanels.length - 1}>Later →</button></div> : null}</section>;
}

function KnowledgeRail({ view }: { view: ReturnType<typeof buildPlayerSafeView> }) {
  return <aside className="lc-rail"><details open><summary>What I Know <span>{view.whatIKnow.length}</span></summary><div className="lc-detail-body"><article className="lc-goal-card"><span>MY GOAL</span><strong>{view.playerGoal.label}</strong><p>{describeProposition(view.playerGoal.target)}</p></article><article className="lc-reason-card"><span>WHY IT MATTERS</span><strong>{view.playerReason.label}</strong></article><ul>{view.whatIKnow.slice(-8).map((item) => <li key={item.id}><span className={`lc-source ${item.sourceKind.toLowerCase()}`}>{item.sourceKind}</span>{item.label}{item.certainty ? <small>{item.certainty}</small> : null}</li>)}</ul></div></details>
    <details open><summary>What I Noticed <span>{view.whatINoticed.length}</span></summary><div className="lc-detail-body"><ul>{view.whatINoticed.length ? view.whatINoticed.map((item) => <li key={item.id}>{item.label}</li>) : <li className="lc-muted">End a Beat to collect what you directly perceived.</li>}</ul></div></details>
    <details open><summary>Open Deals <span>{view.openDeals.length}</span></summary><div className="lc-detail-body"><ul>{view.openDeals.length ? view.openDeals.map((deal) => <li key={deal.id}><strong>{deal.status}</strong> {deal.summary}</li>) : <li className="lc-muted">No proposal or accepted obligation involves you.</li>}</ul></div></details></aside>;
}

function ActionBuilder({ state, generated, mode, setMode, selection, setSelection, draft, commit }: {
  state: LivingComicEngineState;
  generated: GeneratedScene;
  mode: BuilderMode;
  setMode: (mode: BuilderMode) => void;
  selection: PlayerDraftSelection;
  setSelection: (update: Partial<PlayerDraftSelection>) => void;
  draft: ActionPackage;
  commit: () => void;
}) {
  const playerId = state.snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!.id;
  const actors = state.snapshot.characters.filter(({ id, active }) => id !== playerId && active);
  const inbound = state.snapshot.deals.find((deal) => deal.recipientId === playerId && deal.status === "PROPOSED");
  const social = ["ASK", "PRESSURE", "DEAL"].includes(mode);
  const tactic = social ? mode as "ASK" | "PRESSURE" | "DEAL" : null;
  const deliveries = tactic ? deliveryOptionsFor(tactic, content) : [];
  const realized = draft.message ? realizeActionPackage(draft, content, state.snapshot.seed).realizedMessage : undefined;
  const action = draft.action;
  const directChoices = directDraftChoices(state.snapshot, content);
  const semantic = socialSemanticOptions(state.snapshot, selection.targetActorId);
  const previewLabel = action.family === "SOCIAL"
    ? action.tactic
    : action.family === "DIRECT"
      ? content.directActions.find(({ id }) => id === action.operationId)?.label
      : action.family === "DEAL_RESPONSE" ? action.response : "Wait and observe";
  const requested = semantic.requested.find(({ id }) => id === selection.requestedChangeId) ?? semantic.requested[0]!;
  const consequence = semantic.consequences.find(({ id }) => id === selection.consequenceId) ?? semantic.consequences[0]!;
  const offered = semantic.offers.find(({ id }) => id === selection.offeredChangeId) ?? semantic.offers[0]!;

  return <section className="lc-builder" aria-label="Action builder"><div className="lc-builder-head"><div><span className="lc-kicker">Your private draft</span><h2>What do you do?</h2></div><span className="lc-beat-chip">Beat {state.snapshot.beat + 1}</span></div>
    <div className="lc-action-tabs">{(["DIRECT", "ASK", "PRESSURE", "DEAL", ...(inbound ? ["DEAL_RESPONSE" as const] : []), "WAIT"] as BuilderMode[]).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)}>{builderLabels[item]}</button>)}</div>
    {mode === "DIRECT" ? <div className="lc-builder-fields"><label><span>Valid direct action</span><select aria-label="Direct action" value={directChoices.some(({ id }) => id === selection.directChoiceId) ? selection.directChoiceId : directChoices[0]?.id ?? ""} onChange={(event) => setSelection({ directChoiceId: event.target.value })}>{directChoices.length ? directChoices.map((choice) => <option value={choice.id} key={choice.id}>{choice.label}</option>) : <option value="">No valid direct action</option>}</select></label></div> : null}
    {social ? <div className="lc-builder-fields"><label><span>Target</span><select aria-label="Action target" value={selection.targetActorId} onChange={(event) => setSelection({ targetActorId: event.target.value })}>{actors.map((actor) => <option key={actor.id} value={actor.id}>{entityName(generated, actor.id)}</option>)}</select></label><label><span>Semantic request</span><select aria-label="Requested change" value={requested.id} onChange={(event) => setSelection({ requestedChangeId: event.target.value })}>{semantic.requested.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{mode === "PRESSURE" ? <label><span>If not / consequence</span><select aria-label="Threatened consequence" value={consequence.id} onChange={(event) => setSelection({ consequenceId: event.target.value })}>{semantic.consequences.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}{mode === "DEAL" ? <label><span>I offer</span><select aria-label="Offered change" value={offered.id} onChange={(event) => setSelection({ offeredChangeId: event.target.value })}>{semantic.offers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}</div> : null}
    {mode === "DEAL" ? <div className="lc-deal-builder"><article><span>THEY DO</span><strong>{requested.label}</strong></article><div>⇄</div><article><span>I DO</span><strong>{offered.label}</strong></article></div> : null}
    {mode === "DEAL_RESPONSE" ? <><div className="lc-response-row">{(["ACCEPT", "REJECT", "COUNTER"] as const).map((response) => <button className={selection.dealResponse === response ? "active" : ""} onClick={() => setSelection({ dealResponse: response })} key={response}>{response}</button>)}</div>{selection.dealResponse === "COUNTER" ? <div className="lc-builder-fields"><label><span>Counter request</span><select value={requested.id} onChange={(event) => setSelection({ requestedChangeId: event.target.value })}>{semantic.requested.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>Counter offer</span><select value={offered.id} onChange={(event) => setSelection({ offeredChangeId: event.target.value })}>{semantic.offers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div> : null}</> : null}
    {tactic ? <><div className="lc-builder-fields lc-delivery-access"><label><span>Who can hear the content?</span><select aria-label="Message delivery" value={selection.messageDelivery} onChange={(event) => setSelection({ messageDelivery: event.target.value as "OPEN" | "PRIVATE" })}><option value="OPEN">Open — focused observers may overhear</option><option value="PRIVATE">Private — only the recipient gets content</option></select></label></div><div className="lc-deliveries"><span>How do you deliver it?</span><div>{deliveries.map((option) => <button className={selection.basedVibeId === option.basedVibeId ? "active" : ""} key={option.id} onClick={() => setSelection({ basedVibeId: option.basedVibeId })}><strong>{option.label}</strong><small>{option.description}</small></button>)}</div></div></> : null}
    <div className="lc-preview"><span>ACTION PREVIEW</span><strong>{previewLabel}</strong>{draft.action.intention.map((intention) => <p key={JSON.stringify(intention)}>{describeProposition(intention)}</p>)}{realized ? <blockquote>“{realized.wording}”</blockquote> : null}<small>Preview only — nothing happens until you end the Beat.</small></div>
    <button className="lc-end-beat" disabled={state.snapshot.phase === "TERMINAL"} onClick={commit}>End Beat &amp; Observe <span>→</span></button><p className="lc-advance-note">This is the only control that advances the simulation. Editing and inspection remain private.</p></section>;
}

function DebugSurface({ state, generated, saveSnapshot, restoreSnapshot }: { state: LivingComicEngineState; generated: GeneratedScene; saveSnapshot: () => void; restoreSnapshot: () => void }) {
  const [tab, setTab] = useState<DebugTab>("BEAT TRACE");
  const debug = buildDebugView(state, generated);
  const latest = debug.reports.at(-1);
  const data: Record<DebugTab, unknown> = {
    WORLD: { stateId: debug.snapshot.stateId, room: debug.snapshot.room, objects: debug.snapshot.objects, worldFacts: debug.snapshot.worldFacts, scenePressure: debug.snapshot.scenePressure }, CHARACTERS: debug.snapshot.characters,
    "GOALS / REASONS": { goals: debug.snapshot.goals, reasons: debug.snapshot.reasons, obstacles: debug.snapshot.obstacles }, BELIEFS: debug.snapshot.beliefs,
    ACTIONS: { committedActions: latest?.committedActions ?? [], npcDecisions: latest?.npcDecisions ?? [], messages: debug.snapshot.messages, realizedMessages: debug.snapshot.realizedMessages },
    EVENTS: latest?.observableEvents ?? [], PERCEPTIONS: latest?.perceptions ?? [], INTERPRETATIONS: latest?.interpretations ?? [], HISTORY: debug.snapshot.history,
    GENERATOR: { seed: debug.seed, generationTrace: debug.generationTrace, validationTrace: debug.validationTrace }, "BEAT TRACE": latest ?? { message: "No Beat has resolved yet." },
  };
  const exportJson = () => { const blob = new Blob([JSON.stringify(debug, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `living-comic-${debug.snapshot.sceneId}-beat-${debug.snapshot.beat}.json`; anchor.click(); URL.revokeObjectURL(url); };
  const copyReplay = () => navigator.clipboard?.writeText(JSON.stringify(createReplaySpec(state), null, 2));
  return <section className="lc-debug" aria-label="Debug causal inspector"><div className="lc-debug-head"><div><span className="lc-kicker">Read-only semantic inspection</span><h2>Debug / full causal state</h2></div><div><button onClick={copyReplay}>Copy replay spec</button><button onClick={saveSnapshot}>Save snapshot</button><button onClick={restoreSnapshot}>Restore snapshot</button><button onClick={exportJson}>Export JSON</button></div></div>
    <div className="lc-debug-meta"><span>SEED <strong>{debug.seed}</strong></span><span>STATE <strong>{debug.snapshot.stateId}</strong></span><span>STABLE ORDER <strong>{debug.snapshot.stableActorOrder.join(" → ")}</strong></span></div>
    <div className="lc-debug-layout"><nav>{debugTabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav><article><header><span>{tab}</span><small>{latest ? `Beat ${latest.beat} · ${latest.preBeatSnapshotId} → ${latest.postBeatSnapshotId}` : "Pre-Beat"}</small></header><pre>{JSON.stringify(data[tab], null, 2)}</pre></article></div></section>;
}

export default function LivingComicApp() {
  const [seed, setSeed] = useState(14);
  const [generated, setGenerated] = useState(() => generateScene(14, content));
  const [state, setState] = useState<LivingComicEngineState | null>(null);
  const [mode, setMode] = useState<PlayMode>("SETUP");
  const [builderMode, setBuilderMode] = useState<BuilderMode>("WAIT");
  const [selection, setSelectionState] = useState<PlayerDraftSelection>({
    targetActorId: "actor_counterpart",
    directChoiceId: "",
    requestedChangeId: "request_attention",
    consequenceId: "consequence_exposed",
    offeredChangeId: "offer_access",
    basedVibeId: "vibe_sd",
    messageDelivery: "OPEN",
    dealResponse: "ACCEPT",
  });
  const [panelIndex, setPanelIndex] = useState(0);
  const [acceptanceMode, setAcceptanceMode] = useState(false);
  const setSelection = (update: Partial<PlayerDraftSelection>) => setSelectionState((current) => ({ ...current, ...update }));
  const regenerate = () => { const next = generateScene(seed, content); setGenerated(next); setState(null); setAcceptanceMode(false); setMode("SETUP"); };
  const choose = (optionId: string) => { setState(startScene(generated, optionId)); setAcceptanceMode(false); setMode("PLAY"); setBuilderMode("WAIT"); };
  const loadAcceptance = () => {
    const setup = createPhase9AcceptanceSetup(content);
    setSeed(setup.state.snapshot.seed);
    setGenerated(setup.generated);
    setState(setup.state);
    setAcceptanceMode(true);
    setMode("PLAY");
    setBuilderMode("ASK");
    setSelection({
      targetActorId: "actor_third_party",
      requestedChangeId: "request_attention",
      messageDelivery: "PRIVATE",
      basedVibeId: "vibe_sd",
    });
    setPanelIndex(0);
  };
  const draft = useMemo(() => state ? makePlayerPackage(state, builderMode, selection) : null, [state, builderMode, selection]);
  const view = useMemo(() => state ? buildPlayerSafeView(state, content) : null, [state]);
  const commit = () => { if (!state || !draft || state.snapshot.phase === "TERMINAL") return; const next = resolveBeat(state, realizeActionPackage(draft, content, state.snapshot.seed), content); setState(next); setBuilderMode("WAIT"); setPanelIndex(0); };
  const saveSnapshot = () => { if (state) localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(state.snapshot)); };
  const restoreSnapshot = () => {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return;
    const snapshot = runtimeSnapshotSchema.parse(JSON.parse(raw));
    const restoredGenerated = generateScene(snapshot.seed, content);
    const player = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!;
    const option = restoredGenerated.playerOptions.find(({ goal }) => goal.id === player.primaryGoalId);
    if (!option) throw new Error("Saved RuntimeSnapshot does not match its deterministic generated player options");
    const restored = startScene(restoredGenerated, option.id);
    restored.snapshot = snapshot;
    setSeed(snapshot.seed);
    setGenerated(restoredGenerated);
    setState(restored);
    setAcceptanceMode(false);
    setMode("PLAY");
    setBuilderMode("WAIT");
    setPanelIndex(0);
  };
  const chooseDirectForEntity = (entityId: string) => {
    if (!state) return;
    const choices = directDraftChoices(state.snapshot, content);
    const choice = choices.find(({ targetId }) => targetId === entityId) ?? choices.find(({ parameters }) => parameters.objectId === entityId);
    setBuilderMode("DIRECT");
    if (choice) setSelection({ directChoiceId: choice.id });
  };
  const chooseDirectForZone = (zoneId: string) => {
    if (!state) return;
    const choices = directDraftChoices(state.snapshot, content);
    const choice = choices.find(({ targetId, parameters }) => targetId === zoneId || parameters.destinationZoneId === zoneId);
    setBuilderMode("DIRECT");
    if (choice) setSelection({ directChoiceId: choice.id });
  };

  if (!state || mode === "SETUP") return <SetupScreen generated={generated} seed={seed} setSeed={setSeed} regenerate={regenerate} choose={choose} loadAcceptance={loadAcceptance}/>;
  return <main className="lc-shell"><header className="lc-titlebar compact"><button className="lc-monogram" onClick={() => setMode("SETUP")} aria-label="New situation">LC</button><div><span className="lc-kicker">Living Comic Engine</span><h1>{view!.roomLabel}</h1></div><div className="lc-mode-switch"><button className={mode === "PLAY" ? "active" : ""} onClick={() => setMode("PLAY")}>PLAY</button><button className={mode === "DEBUG" ? "active" : ""} onClick={() => setMode("DEBUG")}>DEBUG</button></div><div className="lc-beat"><span>BEAT</span><strong>{state.snapshot.beat}</strong><small>/ 10</small></div></header>
    {acceptanceMode ? <details className="lc-acceptance-guide" open><summary>Phase 9 manual acceptance script</summary><ol>{phase9ManualScript.map((step) => <li key={step}>{step}</li>)}</ol></details> : null}
    {mode === "DEBUG" ? <DebugSurface state={state} generated={generated} saveSnapshot={saveSnapshot} restoreSnapshot={restoreSnapshot}/> : <><div className="lc-play-grid"><ComicScene view={view!} panelIndex={panelIndex} setPanelIndex={setPanelIndex} onCharacterClick={(id) => { setSelection({ targetActorId: id }); setBuilderMode("ASK"); }} onObjectClick={chooseDirectForEntity} onZoneClick={chooseDirectForZone}/><KnowledgeRail view={view!}/></div>{view!.terminalSummary ? <section className="lc-terminal"><span>SCENE COMPLETE</span><h2>{view!.terminalSummary}</h2><button onClick={() => setMode("SETUP")}>Generate another situation</button></section> : <ActionBuilder state={state} generated={generated} mode={builderMode} setMode={setBuilderMode} selection={selection} setSelection={setSelection} draft={draft!} commit={commit}/>}</>}
    <footer className="lc-footer"><span>Living Comic Engine v0.1</span><p>World Truth ≠ Belief · Action ≠ Result · Event ≠ Perception · Perception ≠ Interpretation</p></footer></main>;
}

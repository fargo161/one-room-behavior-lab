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
import { resolveBeat, startScene } from "../engine";
import { generateScene } from "../generation";
import { buildDebugView, buildPlayerSafeView } from "../presentation";
import { deliveryOptionsFor, describeProposition, realizeActionPackage } from "../realization";
import type { GeneratedScene, Proposition } from "../schemas";

const content = loadDefaultContent();
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

const makePlayerPackage = (state: LivingComicEngineState, mode: BuilderMode, targetActorId: string, operationId: string, basedVibeId: string, dealResponse: "ACCEPT" | "REJECT" | "COUNTER"): ActionPackage => {
  const snapshot = state.snapshot;
  const context = actionBuildContext(snapshot);
  const playerId = snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!.id;
  const object = snapshot.objects[0]!;
  if (mode === "WAIT") return makeWaitPackage(context, playerId);
  if (mode === "ASK") return makeAskPackage(context, content, playerId, targetActorId, { subjectId: targetActorId, predicate: "ATTENDING_TO", objectId: playerId }, { basedVibeId });
  if (mode === "PRESSURE") return makePressurePackage(context, content, playerId, targetActorId, { subjectId: object.id, predicate: "VISIBLE_TO", objectId: playerId }, { subjectId: targetActorId, predicate: "EXPOSED", value: true }, { basedVibeId });
  if (mode === "DEAL") return makeDealPackage(context, content, playerId, targetActorId, { subjectId: object.id, predicate: "AVAILABLE_TO", objectId: playerId }, { subjectId: snapshot.room.id, predicate: "ACCESSIBLE_TO", objectId: targetActorId }, { basedVibeId });
  if (mode === "DEAL_RESPONSE") {
    const inbound = snapshot.deals.find((deal) => deal.recipientId === playerId && deal.status === "PROPOSED");
    if (!inbound) return makeWaitPackage(context, playerId);
    if (dealResponse !== "COUNTER") return makeDealResponsePackage(context, playerId, inbound.id, dealResponse);
    const counter = makeDealPackage(context, content, playerId, inbound.proposerId, { subjectId: object.id, predicate: "AVAILABLE_TO", objectId: playerId }, { subjectId: snapshot.room.id, predicate: "ACCESSIBLE_TO", objectId: inbound.proposerId }, { basedVibeId }, inbound.id);
    return makeDealResponsePackage(context, playerId, inbound.id, "COUNTER", { deal: counter.proposedDeal!, terms: counter.dealTerms! });
  }
  let targetId = object.id;
  let intention: Proposition[] = [];
  let parameters: Parameters<typeof makeDirectPackage>[6] = { objectId: object.id };
  switch (operationId) {
    case "action_take": intention = [{ subjectId: object.id, predicate: "HELD_BY", objectId: playerId }]; break;
    case "action_offer_object": targetId = targetActorId; intention = [{ subjectId: object.id, predicate: "AVAILABLE_TO", objectId: targetActorId }]; parameters = { objectId: object.id, recipientId: targetActorId }; break;
    case "action_show": targetId = targetActorId; intention = [{ subjectId: object.id, predicate: "VISIBLE_TO", objectId: targetActorId }]; parameters = { objectId: object.id, recipientId: targetActorId }; break;
    case "action_hide": intention = [{ subjectId: object.id, predicate: "VISIBLE", value: false }]; break;
    case "action_open": intention = [{ subjectId: object.id, predicate: "OPEN", value: true }]; break;
    case "action_close": intention = [{ subjectId: object.id, predicate: "OPEN", value: false }]; break;
    case "action_approach": intention = [{ subjectId: playerId, predicate: "LOCATED_AT", objectId: object.zoneId }]; break;
    case "action_withdraw": targetId = "zone_entry"; intention = [{ subjectId: playerId, predicate: "LOCATED_AT", objectId: "zone_entry" }]; parameters = { destinationZoneId: "zone_entry" }; break;
    case "action_leave": targetId = "zone_exit"; intention = [{ subjectId: playerId, predicate: "LOCATED_AT", objectId: "zone_exit" }]; parameters = {}; break;
    default: throw new Error(`Unsupported player operation ${operationId}`);
  }
  return makeDirectPackage(context, content, playerId, operationId, targetId, intention, parameters);
};

function SetupScreen({ generated, seed, setSeed, regenerate, choose }: { generated: GeneratedScene; seed: number; setSeed: (value: number) => void; regenerate: () => void; choose: (id: string) => void }) {
  const room = content.roomPresets.find(({ id }) => id === generated.snapshot.room.presetId)?.label ?? "A room";
  return <main className="lc-shell lc-setup"><header className="lc-titlebar"><div className="lc-monogram">LC</div><div><span className="lc-kicker">Deterministic social-world prototype</span><h1>Living Comic Engine <em>v0.1</em></h1></div></header>
    <section className="lc-setup-grid"><div className="lc-setup-scene"><span className="lc-index">Situation / seed {seed}</span><h2>Three people enter {room.toLowerCase()} with unfinished history.</h2><p>One object sits at the center of a disagreement. Everyone has reasons. Nobody has the whole picture.</p>
      <div className="lc-cast-strip">{generated.snapshot.characters.map((character, index) => <article key={character.id}><div className={`lc-avatar tone-${index}`}><span>{entityName(generated, character.id).slice(0, 1)}</span></div><strong>{index === 0 ? "You" : entityName(generated, character.id)}</strong><small>{content.characters.find(({ id }) => id === character.definitionId)?.description}</small></article>)}</div>
      <label className="lc-seed-control"><span>Generate another deterministic situation</span><div><input aria-label="Scene seed" type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))}/><button onClick={regenerate}>Generate</button></div></label></div>
      <div className="lc-motivation-card"><span className="lc-index">Choose what matters to you</span><h2>Your Goal &amp; Reason</h2><p className="lc-muted">The situation stays the same. Your purpose inside it changes.</p><div className="lc-options">{generated.playerOptions.map((option, index) => <button key={option.id} onClick={() => choose(option.id)}><span>Path 0{index + 1}</span><strong>{option.label.split(":")[0]}</strong><small>{option.label.split(":").slice(1).join(":")}</small><i>Enter this story →</i></button>)}</div></div></section></main>;
}

function ComicScene({ view, panelIndex, setPanelIndex }: { view: ReturnType<typeof buildPlayerSafeView>; panelIndex: number; setPanelIndex: (index: number) => void }) {
  const panel = view.resultPanels[panelIndex];
  return <section className="lc-comic" aria-label="Living comic scene"><div className="lc-panel-number">PANEL {String(view.beat || 1).padStart(2, "0")}</div><div className="lc-room"><div className="lc-window"><span>WINDOW</span></div><div className="lc-door"><span>EXIT</span></div><div className="lc-table"><span>{view.objects[0]?.label ?? "OBJECT"}</span></div>
    {view.characters.map((character, index) => <button className={`lc-character lc-zone-${character.zoneId.replace("zone_", "")} tone-${index}`} key={character.id} aria-label={`Inspect ${character.label}`}><span className="lc-head">{character.label.slice(0, 1)}</span><strong>{character.roleLabel === "You" ? "YOU" : character.label.toUpperCase()}</strong><small>{character.zoneId.replace("zone_", "")}</small></button>)}
    {panel?.message ? <div className={`lc-balloon ${panel.message.balloonLabel.toLowerCase()}`}><span>{panel.actorLabel}</span><blockquote>“{panel.message.wording}”</blockquote><small>{panel.message.deliveryLabel} · {panel.message.poseLabel} posture · {panel.message.faceLabel} face</small></div> : null}
    {panel && !panel.message ? <div className="lc-caption"><span>{panel.actorLabel}</span><p>{panel.body}.</p></div> : null}</div>
    {view.resultPanels.length > 1 ? <div className="lc-micro-nav"><button onClick={() => setPanelIndex(Math.max(0, panelIndex - 1))} disabled={panelIndex === 0}>← Earlier</button><span>Moment {panelIndex + 1} of {view.resultPanels.length}</span><button onClick={() => setPanelIndex(Math.min(view.resultPanels.length - 1, panelIndex + 1))} disabled={panelIndex === view.resultPanels.length - 1}>Later →</button></div> : null}</section>;
}

function KnowledgeRail({ view }: { view: ReturnType<typeof buildPlayerSafeView> }) {
  return <aside className="lc-rail"><details open><summary>What I Know <span>{view.whatIKnow.length}</span></summary><div className="lc-detail-body"><article className="lc-goal-card"><span>MY GOAL</span><strong>{view.playerGoal.label}</strong><p>{describeProposition(view.playerGoal.target)}</p></article><article className="lc-reason-card"><span>WHY IT MATTERS</span><strong>{view.playerReason.label}</strong></article><ul>{view.whatIKnow.slice(-8).map((item) => <li key={item.id}><span className={`lc-source ${item.sourceKind.toLowerCase()}`}>{item.sourceKind}</span>{item.label}{item.certainty ? <small>{item.certainty}</small> : null}</li>)}</ul></div></details>
    <details open><summary>What I Noticed <span>{view.whatINoticed.length}</span></summary><div className="lc-detail-body"><ul>{view.whatINoticed.length ? view.whatINoticed.map((item) => <li key={item.id}>{item.label}</li>) : <li className="lc-muted">End a Beat to collect what you directly perceived.</li>}</ul></div></details>
    <details open><summary>Open Deals <span>{view.openDeals.length}</span></summary><div className="lc-detail-body"><ul>{view.openDeals.length ? view.openDeals.map((deal) => <li key={deal.id}><strong>{deal.status}</strong> {deal.summary}</li>) : <li className="lc-muted">No proposal or accepted obligation involves you.</li>}</ul></div></details></aside>;
}

function ActionBuilder({ state, generated, mode, setMode, targetActorId, setTargetActorId, operationId, setOperationId, basedVibeId, setBasedVibeId, dealResponse, setDealResponse, draft, commit }: { state: LivingComicEngineState; generated: GeneratedScene; mode: BuilderMode; setMode: (mode: BuilderMode) => void; targetActorId: string; setTargetActorId: (id: string) => void; operationId: string; setOperationId: (id: string) => void; basedVibeId: string; setBasedVibeId: (id: string) => void; dealResponse: "ACCEPT" | "REJECT" | "COUNTER"; setDealResponse: (response: "ACCEPT" | "REJECT" | "COUNTER") => void; draft: ActionPackage; commit: () => void }) {
  const playerId = state.snapshot.characters.find(({ role }) => role === "PLAYER_ROLE")!.id;
  const actors = state.snapshot.characters.filter(({ id, active }) => id !== playerId && active);
  const inbound = state.snapshot.deals.find((deal) => deal.recipientId === playerId && deal.status === "PROPOSED");
  const social = ["ASK", "PRESSURE", "DEAL"].includes(mode);
  const tactic = social ? mode as "ASK" | "PRESSURE" | "DEAL" : null;
  const deliveries = tactic ? deliveryOptionsFor(tactic, content) : [];
  const realized = draft.message ? realizeActionPackage(draft, content, state.snapshot.seed).realizedMessage : undefined;
  const action = draft.action;
  const previewLabel = action.family === "SOCIAL"
    ? action.tactic
    : action.family === "DIRECT"
      ? content.directActions.find(({ id }) => id === action.operationId)?.label
      : action.family === "DEAL_RESPONSE" ? action.response : "Wait and observe";
  return <section className="lc-builder" aria-label="Action builder"><div className="lc-builder-head"><div><span className="lc-kicker">Your private draft</span><h2>What do you do?</h2></div><span className="lc-beat-chip">Beat {state.snapshot.beat + 1}</span></div>
    <div className="lc-action-tabs">{(["DIRECT", "ASK", "PRESSURE", "DEAL", ...(inbound ? ["DEAL_RESPONSE" as const] : []), "WAIT"] as BuilderMode[]).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)}>{builderLabels[item]}</button>)}</div>
    {mode !== "WAIT" && mode !== "DEAL_RESPONSE" ? <div className="lc-builder-fields"><label><span>Target</span><select aria-label="Action target" value={targetActorId} onChange={(event) => setTargetActorId(event.target.value)}>{actors.map((actor) => <option key={actor.id} value={actor.id}>{entityName(generated, actor.id)}</option>)}</select></label>{mode === "DIRECT" ? <label><span>Direct action</span><select aria-label="Direct action" value={operationId} onChange={(event) => setOperationId(event.target.value)}>{content.directActions.map((action) => <option value={action.id} key={action.id}>{action.label}</option>)}</select></label> : null}</div> : null}
    {mode === "DEAL" ? <div className="lc-deal-builder"><article><span>THEY DO</span><strong>Make the central object available to you</strong></article><div>⇄</div><article><span>I DO</span><strong>Preserve their access to the room</strong></article></div> : null}
    {mode === "DEAL_RESPONSE" ? <div className="lc-response-row">{(["ACCEPT", "REJECT", "COUNTER"] as const).map((response) => <button className={dealResponse === response ? "active" : ""} onClick={() => setDealResponse(response)} key={response}>{response}</button>)}</div> : null}
    {tactic ? <div className="lc-deliveries"><span>How do you deliver it?</span><div>{deliveries.map((option) => <button className={basedVibeId === option.basedVibeId ? "active" : ""} key={option.id} onClick={() => setBasedVibeId(option.basedVibeId)}><strong>{option.label}</strong><small>{option.description}</small></button>)}</div></div> : null}
    <div className="lc-preview"><span>ACTION PREVIEW</span><strong>{previewLabel}</strong>{draft.action.intention.map((intention) => <p key={JSON.stringify(intention)}>{describeProposition(intention)}</p>)}{realized ? <blockquote>“{realized.wording}”</blockquote> : null}<small>Preview only — nothing happens until you end the Beat.</small></div>
    <button className="lc-end-beat" disabled={state.snapshot.phase === "TERMINAL"} onClick={commit}>End Beat &amp; Observe <span>→</span></button><p className="lc-advance-note">This is the only control that advances the simulation. Editing and inspection remain private.</p></section>;
}

function DebugSurface({ state, generated }: { state: LivingComicEngineState; generated: GeneratedScene }) {
  const [tab, setTab] = useState<DebugTab>("BEAT TRACE");
  const debug = buildDebugView(state, generated);
  const latest = debug.reports.at(-1);
  const data: Record<DebugTab, unknown> = {
    WORLD: { stateId: debug.snapshot.stateId, room: debug.snapshot.room, objects: debug.snapshot.objects, worldFacts: debug.snapshot.worldFacts, scenePressure: debug.snapshot.scenePressure }, CHARACTERS: debug.snapshot.characters,
    "GOALS / REASONS": { goals: debug.snapshot.goals, reasons: debug.snapshot.reasons, obstacles: debug.snapshot.obstacles }, BELIEFS: debug.snapshot.beliefs,
    ACTIONS: {
      committedActions: latest?.committedActions ?? [],
      npcDecisions: latest?.npcDecisions ?? [],
      messages: debug.snapshot.messages,
      realizedMessages: debug.snapshot.realizedMessages,
    }, EVENTS: latest?.observableEvents ?? [], PERCEPTIONS: latest?.perceptions ?? [], INTERPRETATIONS: latest?.interpretations ?? [], HISTORY: debug.snapshot.history,
    GENERATOR: { seed: debug.seed, generationTrace: debug.generationTrace, validationTrace: debug.validationTrace }, "BEAT TRACE": latest ?? { message: "No Beat has resolved yet." },
  };
  const exportJson = () => { const blob = new Blob([JSON.stringify(debug, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `living-comic-${debug.snapshot.sceneId}-beat-${debug.snapshot.beat}.json`; anchor.click(); URL.revokeObjectURL(url); };
  return <section className="lc-debug" aria-label="Debug causal inspector"><div className="lc-debug-head"><div><span className="lc-kicker">Read-only semantic inspection</span><h2>Debug / full causal state</h2></div><div><button onClick={() => navigator.clipboard?.writeText(JSON.stringify({ seed: debug.seed, sceneId: debug.snapshot.sceneId, beat: debug.snapshot.beat }))}>Copy replay spec</button><button onClick={exportJson}>Export JSON</button></div></div>
    <div className="lc-debug-meta"><span>SEED <strong>{debug.seed}</strong></span><span>STATE <strong>{debug.snapshot.stateId}</strong></span><span>STABLE ORDER <strong>{debug.snapshot.stableActorOrder.join(" → ")}</strong></span></div>
    <div className="lc-debug-layout"><nav>{debugTabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav><article><header><span>{tab}</span><small>{latest ? `Beat ${latest.beat} · ${latest.preBeatSnapshotId} → ${latest.postBeatSnapshotId}` : "Pre-Beat"}</small></header><pre>{JSON.stringify(data[tab], null, 2)}</pre></article></div></section>;
}

export default function LivingComicApp() {
  const [seed, setSeed] = useState(14);
  const [generated, setGenerated] = useState(() => generateScene(14, content));
  const [state, setState] = useState<LivingComicEngineState | null>(null);
  const [mode, setMode] = useState<PlayMode>("SETUP");
  const [builderMode, setBuilderMode] = useState<BuilderMode>("WAIT");
  const [targetActorId, setTargetActorId] = useState("actor_counterpart");
  const [operationId, setOperationId] = useState("action_approach");
  const [basedVibeId, setBasedVibeId] = useState("vibe_sd");
  const [dealResponse, setDealResponse] = useState<"ACCEPT" | "REJECT" | "COUNTER">("ACCEPT");
  const [panelIndex, setPanelIndex] = useState(0);
  const regenerate = () => { const next = generateScene(seed, content); setGenerated(next); setState(null); setMode("SETUP"); };
  const choose = (optionId: string) => { setState(startScene(generated, optionId)); setMode("PLAY"); setBuilderMode("WAIT"); };
  const draft = useMemo(() => state ? makePlayerPackage(state, builderMode, targetActorId, operationId, basedVibeId, dealResponse) : null, [state, builderMode, targetActorId, operationId, basedVibeId, dealResponse]);
  const view = useMemo(() => state ? buildPlayerSafeView(state, content) : null, [state]);
  const commit = () => { if (!state || !draft || state.snapshot.phase === "TERMINAL") return; const next = resolveBeat(state, realizeActionPackage(draft, content, state.snapshot.seed), content); setState(next); setBuilderMode("WAIT"); setPanelIndex(0); };
  if (!state || mode === "SETUP") return <SetupScreen generated={generated} seed={seed} setSeed={setSeed} regenerate={regenerate} choose={choose}/>;
  return <main className="lc-shell"><header className="lc-titlebar compact"><button className="lc-monogram" onClick={() => setMode("SETUP")} aria-label="New situation">LC</button><div><span className="lc-kicker">Living Comic Engine</span><h1>{view!.roomLabel}</h1></div><div className="lc-mode-switch"><button className={mode === "PLAY" ? "active" : ""} onClick={() => setMode("PLAY")}>PLAY</button><button className={mode === "DEBUG" ? "active" : ""} onClick={() => setMode("DEBUG")}>DEBUG</button></div><div className="lc-beat"><span>BEAT</span><strong>{state.snapshot.beat}</strong><small>/ 10</small></div></header>
    {mode === "DEBUG" ? <DebugSurface state={state} generated={generated}/> : <><div className="lc-play-grid"><ComicScene view={view!} panelIndex={panelIndex} setPanelIndex={setPanelIndex}/><KnowledgeRail view={view!}/></div>{view!.terminalSummary ? <section className="lc-terminal"><span>SCENE COMPLETE</span><h2>{view!.terminalSummary}</h2><button onClick={() => setMode("SETUP")}>Generate another situation</button></section> : <ActionBuilder state={state} generated={generated} mode={builderMode} setMode={setBuilderMode} targetActorId={targetActorId} setTargetActorId={setTargetActorId} operationId={operationId} setOperationId={setOperationId} basedVibeId={basedVibeId} setBasedVibeId={setBasedVibeId} dealResponse={dealResponse} setDealResponse={setDealResponse} draft={draft!} commit={commit}/>}</>}
    <footer className="lc-footer"><span>Living Comic Engine v0.1</span><p>World Truth ≠ Belief · Action ≠ Result · Event ≠ Perception · Perception ≠ Interpretation</p></footer></main>;
}

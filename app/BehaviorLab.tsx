"use client";

import { useMemo, useState } from "react";
import { prototypeConfig, roomAnchorLabels } from "../src/v3/config";
import {
  appendPlayerAction, commitPlayerBeat, createInitialSessionV3, makeDistractAction,
  makeInteractAction, makeMessageAction, makeMoveAction, makeScanAction,
  removePlayerAction, reorderPlayerAction, validatePlan,
} from "../src/v3/engine";
import { defaultPlayerMessageDraft, messageOptions, renderMessage } from "../src/v3/messages";
import type {
  ActionKind, ActorId, BehaviorLabSessionV3, DistractionMode, InteractAction,
  MessageDraftV3, PlannedAction, RoomAnchor, ScanAction,
} from "../src/v3/types";

const actorLabel = (id: ActorId) => id === "PLAYER" ? "You" : id === "MARA" ? "Mara" : "Drew";
const humanize = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
const faceParts: Record<string, { mouth: string; eyes: string; brow: string }> = {
  COMPOSED: { mouth: "—", eyes: "•  •", brow: "—  —" }, ATTENTIVE: { mouth: "⌣", eyes: "●  ●", brow: "⌒  ⌒" },
  UNEASY: { mouth: "⌁", eyes: "•  ●", brow: "⌁  —" }, TENSE: { mouth: "―", eyes: "●  ●", brow: "╲  ╱" },
  RESOLVED: { mouth: "⌒", eyes: "•  •", brow: "—  —" }, CLOSED: { mouth: "━", eyes: "▪  ▪", brow: "╲  ╱" },
};

function Face({ state, name }: { state: string; name: string }) {
  const parts = faceParts[state] ?? faceParts.COMPOSED;
  return <div className={`face face-${state.toLowerCase()}`} aria-label={`${name}'s face appears ${state.toLowerCase()}`}>
    <span className="brow">{parts.brow}</span><span className="eyes">{parts.eyes}</span><span className="mouth">{parts.mouth}</span>
  </div>;
}

function ActorTableau({ session, id }: { session: BehaviorLabSessionV3; id: "MARA" | "DREW" }) {
  const actor = session.world.actors[id];
  return <article className={`actor-tableau ${id.toLowerCase()} ${!actor.active ? "departed" : ""}`}>
    <div className="actor-portrait"><Face state={actor.face} name={actor.name} /><span className="gaze-line">Gaze → {actor.gaze}</span></div>
    <div className="actor-copy">
      <div className="actor-heading"><h3>{actor.name}</h3><span>{id === "MARA" ? humanize(actor.maraTrajectory ?? "ENGAGED") : humanize(actor.drewTrajectory ?? "NORMAL")}</span></div>
      <strong>{roomAnchorLabels[actor.position]}</strong><p>{actor.orientation}. {actor.posture}. {actor.hands}.</p>
    </div>
  </article>;
}

function RoomTableau({ session }: { session: BehaviorLabSessionV3 }) {
  const { world } = session;
  return <section className="room-shell" aria-labelledby="room-title">
    <div className="section-heading"><div><span className="eyebrow">Beat-start tableau</span><h2 id="room-title">Read the room before you commit.</h2></div><span className={`noise-pill noise-${world.roomNoise.toLowerCase()}`}>{humanize(world.roomNoise)} room</span></div>
    <div className="room-event"><span className="event-pulse" aria-hidden="true" /><div><strong>{world.currentRoomEvent.title}</strong><p>{world.currentRoomEvent.description} {world.currentRoomEvent.actionableEffect}</p></div></div>
    <div className="room-map" aria-label="Discrete room positions">
      <div className="anchor anchor-window"><span>Window</span></div><div className="anchor anchor-door"><span>Door</span></div><div className="anchor anchor-center"><span>Center</span></div>
      <div className="anchor anchor-table"><span>Table</span><div className={`envelope envelope-${world.envelope.state.toLowerCase()}`} aria-label={`Envelope ${world.envelope.state.toLowerCase()}`}><i /><b>{humanize(world.envelope.state)}</b></div></div>
      {(["PLAYER", "MARA", "DREW"] as ActorId[]).map((actorId) => {
        const actor = world.actors[actorId];
        return actor.active ? <div key={actorId} className={`room-person person-${actorId.toLowerCase()} at-${actor.position.toLowerCase().replaceAll("_", "-")}`}><span>{actorLabel(actorId)}</span><small>{humanize(actor.position)}</small></div> : null;
      })}
    </div>
    <div className="tableau-grid"><ActorTableau session={session} id="MARA" /><ActorTableau session={session} id="DREW" /></div>
  </section>;
}

function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: readonly T[] }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value as T)}>{options.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}</select></label>;
}
const messageKeys = <T extends Record<string, string>>(record: T) => Object.keys(record) as Array<keyof T & string>;

function MessageComposer({ session, onAdd }: { session: BehaviorLabSessionV3; onAdd: (action: PlannedAction) => void }) {
  const [draft, setDraft] = useState<MessageDraftV3>(() => defaultPlayerMessageDraft());
  const set = <K extends keyof MessageDraftV3>(key: K, value: MessageDraftV3[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="composer message-composer">
    <div className="composer-intro"><div><span className="eyebrow">Construct communication</span><h3>Build the message from meaningful pieces.</h3></div><span className="cost-chip">1 AP</span></div>
    <div className="builder-grid">
      <Select label="Recipient" value={draft.recipientId} onChange={(value) => set("recipientId", value)} options={["MARA", "DREW"] as ActorId[]} />
      <Select label="Core content" value={draft.coreContentId} onChange={(value) => set("coreContentId", value)} options={messageKeys(messageOptions.coreText)} />
      <Select label="Reason" value={draft.reasonId} onChange={(value) => set("reasonId", value)} options={messageKeys(messageOptions.reasons)} />
      <Select label="Evidence / reference" value={draft.evidenceId} onChange={(value) => set("evidenceId", value)} options={messageKeys(messageOptions.evidence)} />
      <Select label="Acknowledgment" value={draft.acknowledgmentId} onChange={(value) => set("acknowledgmentId", value)} options={messageKeys(messageOptions.acknowledgments)} />
      <Select label="Promise" value={draft.promiseId} onChange={(value) => set("promiseId", value)} options={messageKeys(messageOptions.promises)} />
      <Select label="Offer" value={draft.offerId} onChange={(value) => set("offerId", value)} options={messageKeys(messageOptions.offers)} />
      <Select label="Qualification" value={draft.qualificationId} onChange={(value) => set("qualificationId", value)} options={messageKeys(messageOptions.qualifications)} />
      <Select label="Condition" value={draft.conditionId} onChange={(value) => set("conditionId", value)} options={messageKeys(messageOptions.conditions)} />
      <Select label="Warning / consequence" value={draft.warningId} onChange={(value) => set("warningId", value)} options={messageKeys(messageOptions.warnings)} />
      <Select label="Directness" value={draft.directness} onChange={(value) => set("directness", value)} options={["GENTLE", "PLAIN", "BLUNT"]} />
      <Select label="Delivery" value={draft.deliveryMode} onChange={(value) => set("deliveryMode", value)} options={["NORMAL", "LOW_VOICE", "WHISPER"]} />
    </div>
    <label className="check-field"><input type="checkbox" checked={draft.refusalSpace} onChange={(event) => set("refusalSpace", event.target.checked)} /><span>Leave explicit room to refuse</span></label>
    <div className="assembled-message"><span>Message preview · wording is downstream of structured identity</span><blockquote>“{renderMessage(draft)}”</blockquote></div>
    <button className="add-action" type="button" onClick={() => onAdd(makeMessageAction(session.world, "PLAYER", draft, session.playerPlan.actions.length + 1))}>Add Message to plan</button>
  </div>;
}

function ActionComposer({ session, onAdd }: { session: BehaviorLabSessionV3; onAdd: (action: PlannedAction) => void }) {
  const [kind, setKind] = useState<ActionKind>("MOVE");
  const [moveTarget, setMoveTarget] = useState<RoomAnchor>("NEAR_MARA");
  const [scanType, setScanType] = useState<ScanAction["targetType"]>("ACTOR");
  const [scanTarget, setScanTarget] = useState<ScanAction["targetId"]>("DREW");
  const [interaction, setInteraction] = useState<InteractAction["operation"]>("TAKE");
  const [distraction, setDistraction] = useState<DistractionMode>("VISIBLE_CALL");
  const [distractTarget, setDistractTarget] = useState<"MARA" | "DREW">("DREW");
  const ordinal = session.playerPlan.actions.length + 1;
  const add = () => {
    if (kind === "MOVE") onAdd(makeMoveAction(session.world, "PLAYER", moveTarget, ordinal));
    if (kind === "SCAN") onAdd(makeScanAction(session.world, "PLAYER", scanType, scanTarget, ordinal));
    if (kind === "INTERACT") onAdd(makeInteractAction(session.world, "PLAYER", interaction === "LEAVE" ? "DOOR" : "ENVELOPE", interaction, ordinal));
    if (kind === "DISTRACT") onAdd(makeDistractAction(session.world, distractTarget, distraction, ordinal));
  };
  if (kind === "MESSAGE") return <MessageComposer session={session} onAdd={onAdd} />;
  return <div className="composer">
    <div className="composer-intro"><div><span className="eyebrow">Choose action</span><h3>Spend one AP to change the room.</h3></div><span className="cost-chip">1 AP</span></div>
    <div className="action-tabs" role="tablist" aria-label="Action type">{(["MOVE", "MESSAGE", "SCAN", "INTERACT", "DISTRACT"] as ActionKind[]).map((actionKind) => <button type="button" role="tab" aria-selected={kind === actionKind} className={kind === actionKind ? "active" : ""} onClick={() => setKind(actionKind)} key={actionKind}>{humanize(actionKind)}</button>)}</div>
    <div className="compact-fields">
      {kind === "MOVE" ? <Select label="Destination" value={moveTarget} onChange={setMoveTarget} options={Object.keys(roomAnchorLabels) as RoomAnchor[]} /> : null}
      {kind === "SCAN" ? <><Select label="Scan type" value={scanType} onChange={(value) => { setScanType(value); setScanTarget(value === "ROOM" ? "ROOM" : value === "OBJECT" ? "ENVELOPE" : "DREW"); }} options={["ACTOR", "ROOM", "OBJECT"]} />{scanType === "ACTOR" ? <Select label="Actor" value={scanTarget as ActorId} onChange={(value) => setScanTarget(value)} options={["MARA", "DREW"] as ActorId[]} /> : null}</> : null}
      {kind === "INTERACT" ? <Select label="Affordance" value={interaction} onChange={setInteraction} options={["TAKE", "PLACE_ON_TABLE", "INSPECT", "GUARD", "LEAVE"]} /> : null}
      {kind === "DISTRACT" ? <><Select label="Target" value={distractTarget} onChange={setDistractTarget} options={["MARA", "DREW"]} /><Select label="Method" value={distraction} onChange={setDistraction} options={["VISIBLE_CALL", "COVERT_WINDOW_RATTLE"]} /></> : null}
    </div>
    <p className="action-help">{kind === "MOVE" ? "Movement follows the discrete room graph and is visible to attentive actors." : kind === "SCAN" ? "Scan reveals extra observable evidence, never hidden meters." : kind === "INTERACT" ? "Object and door affordances are rechecked when this action resolves." : "Attention success and attribution resolve separately."}</p>
    <button className="add-action" type="button" onClick={add}>Add {humanize(kind)} to plan</button>
  </div>;
}

function actionSummary(action: PlannedAction): string {
  if (action.kind === "MOVE") return `Move toward ${roomAnchorLabels[action.target]}`;
  if (action.kind === "MESSAGE") return `${humanize(action.message.deliveryMode)} message to ${actorLabel(action.message.intendedRecipients[0])}: “${action.message.surfaceText}”`;
  if (action.kind === "SCAN") return `Scan ${action.targetType === "ROOM" ? "the room" : action.targetId === "ENVELOPE" ? "the envelope" : actorLabel(action.targetId as ActorId)}`;
  if (action.kind === "INTERACT") return `${humanize(action.operation)} ${action.targetId === "DOOR" ? "at the door" : "the envelope"}`;
  return `${humanize(action.mode)} aimed at ${actorLabel(action.targetActorId)}`;
}

function ActionQueue({ session, setSession }: { session: BehaviorLabSessionV3; setSession: (session: BehaviorLabSessionV3) => void }) {
  const validation = validatePlan(session.world, session.playerPlan);
  return <aside className="queue-shell" aria-labelledby="queue-title">
    <div className="section-heading"><div><span className="eyebrow">Your plan</span><h2 id="queue-title">Three actions. One shared Beat.</h2></div><div className="ap-meter" aria-label={`${validation.apRemaining} action points remaining`}>{[0,1,2].map((index) => <span key={index} className={index < validation.apCommitted ? "spent" : "available"}>{index < validation.apCommitted ? "×" : "1"}</span>)}</div></div>
    <ol className="action-queue">{[0,1,2].map((index) => {
      const action = session.playerPlan.actions[index];
      return <li key={action?.id ?? `empty-${index}`} className={action ? "filled" : "empty"}><span className="slot-number">{index + 1}</span>{action ? <><div><strong>{action.kind}</strong><p>{actionSummary(action)}</p></div><div className="queue-controls"><button type="button" disabled={index === 0} onClick={() => setSession(reorderPlayerAction(session, index, index - 1))} aria-label="Move action earlier">↑</button><button type="button" disabled={index === session.playerPlan.actions.length - 1} onClick={() => setSession(reorderPlayerAction(session, index, index + 1))} aria-label="Move action later">↓</button><button type="button" onClick={() => setSession(removePlayerAction(session, index))} aria-label="Remove action">×</button></div></> : <p>Open action slot</p>}</li>;
    })}</ol>
    {session.queueNotice ? <p className="queue-notice" role="status">{session.queueNotice}</p> : null}
    <button className="commit-beat" type="button" disabled={!validation.legal || Boolean(session.world.terminal)} onClick={() => setSession(commitPlayerBeat(session))}>{session.world.terminal ? "Scenario complete" : `Commit Beat ${session.world.beat}`}</button>
    <p className="commit-note">Mara and Drew plan independently from this same tableau. Their choices remain hidden until resolution.</p>
  </aside>;
}

function CausalHistory({ session }: { session: BehaviorLabSessionV3 }) {
  return <section className="history-shell" aria-labelledby="history-title"><div className="section-heading"><div><span className="eyebrow">What changed, in order</span><h2 id="history-title">Cause and effect</h2></div><span className="trace-count">{session.world.traces.length} sourced changes</span></div><div className="history-list">{session.world.history.slice(-12).reverse().map((event) => <article key={event.id}><span>B{event.beat}</span><p>{event.text}</p></article>)}</div></section>;
}

function DebugDrawer({ session, setSession }: { session: BehaviorLabSessionV3; setSession: (session: BehaviorLabSessionV3) => void }) {
  return <section className="debug-shell"><button className="debug-toggle" type="button" aria-expanded={session.debugVisible} onClick={() => setSession({ ...session, debugVisible: !session.debugVisible })}>{session.debugVisible ? "Hide" : "Show"} prototype trace</button>{session.debugVisible ? <div className="debug-grid"><div><h3>Last plans</h3><pre>{JSON.stringify(session.world.lastPlans, null, 2)}</pre></div><div><h3>Last resolutions</h3><pre>{JSON.stringify(session.world.lastResolutions, null, 2)}</pre></div><div><h3>Actor-specific reception</h3><pre>{JSON.stringify(session.world.receptions.slice(-12), null, 2)}</pre></div><div><h3>Mutation-time provenance</h3><pre>{JSON.stringify(session.world.traces.slice(-16), null, 2)}</pre></div></div> : null}</section>;
}

export default function BehaviorLab() {
  const [session, setSession] = useState<BehaviorLabSessionV3>(() => createInitialSessionV3());
  const [composerKey, setComposerKey] = useState(0);
  const validation = useMemo(() => validatePlan(session.world, session.playerPlan), [session]);
  const addAction = (action: PlannedAction) => { setSession((current) => appendPlayerAction(current, action)); setComposerKey((current) => current + 1); };
  return <main>
    <header className="site-header"><div className="brand-mark"><span>OR</span><span>BL</span></div><div><span className="eyebrow">Executable social-tactics prototype · v0.3.0</span><h1>One-Room Behavior Lab</h1><p>Observe. Plan three actions. Let them collide. Read the room again.</p></div><div className="beat-display"><span>Current Beat</span><strong>{String(session.world.beat).padStart(2, "0")}</strong><small>{validation.apRemaining} AP open</small></div></header>
    {session.world.terminal ? <section className="terminal-banner"><span>{humanize(session.world.terminal.kind)}</span><h2>The room reached a terminal state.</h2><p>{session.world.terminal.explanation}</p><button type="button" onClick={() => setSession(createInitialSessionV3(session.world.seed))}>Restart same seed</button></section> : null}
    <div className="primary-layout"><RoomTableau session={session} /><ActionQueue session={session} setSession={setSession} /></div>
    <section className="planning-shell" aria-labelledby="planning-title"><div className="section-heading planning-heading"><div><span className="eyebrow">Action queue</span><h2 id="planning-title">What do you do next?</h2></div><p>Every normal action costs 1 AP. Repeated action types are legal.</p></div><ActionComposer key={composerKey} session={session} onAdd={addAction} /></section>
    <CausalHistory session={session} /><DebugDrawer session={session} setSession={setSession} />
    <footer><p><strong>Prototype boundary.</strong> This bounded implementation tests social-interaction mechanics. It does not redefine the canonical Social Interaction Master or PSG.</p><p>{prototypeConfig.status}: initiative, room graph, hearing, event selection, planner priorities, and fail thresholds.</p></footer>
  </main>;
}

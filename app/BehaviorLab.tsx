"use client";

import { useEffect, useMemo, useState } from "react";
import type { CharacterId, FacePose, GameSession, MessageDraft, PerformancePlan, ResolvedBeat } from "@/src/core/types";
import { assertValidScenario } from "@/src/core/validation";
import { enabledVibes } from "@/src/data/based";
import { consequences, functions, offeredValues, reasons, recipients, subjects, compatiblePropositions, renderMessage, validateDraft } from "@/src/data/messageGrammar";
import { neutralFace } from "@/src/data/performance";
import { scenario } from "@/src/data/scenario";
import { createInitialSession, endBeat, queueDraft, removeQueuedMessage, updateDraft } from "@/src/simulation/engine";

assertValidScenario(scenario);
type ViewMode = "PLAYER" | "DESIGNER";
const locationLabels = { CHAIR: "waiting chair", TABLE: "table", EXIT: "exit" } as const;
const title = (value: string) => value.replaceAll("_", " ").toLowerCase();

function CharacterFace({ name, pose }: { name: string; pose: FacePose }) {
  const pupilX = (pose.gazeX - 0.5) * 9, pupilY = (pose.gazeY - 0.5) * 6, browRotate = (pose.browAngle - 0.5) * 24;
  return <div className="face" aria-label={`${name} facial performance, tension ${Math.round(pose.overallTension * 100)} percent`}>
    <i className="brow left" style={{ transform: `translateY(${(0.5 - pose.browOuterHeight) * 8}px) rotate(${browRotate}deg)` }} /><i className="brow right" style={{ transform: `translateY(${(0.5 - pose.browOuterHeight) * 8}px) rotate(${-browRotate}deg)` }} />
    <i className="eye left" style={{ height: `${8 + pose.eyeOpennessLeft * 10}px` }}><b style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }} /></i><i className="eye right" style={{ height: `${8 + pose.eyeOpennessRight * 10}px` }}><b style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }} /></i>
    <i className="nose" /><i className="mouth" style={{ width: `${25 + pose.mouthWidth * 25}px`, height: `${3 + pose.mouthOpenness * 15}px`, transform: `translateX(-50%) rotate(${(pose.asymmetry - 0.1) * 8}deg)` }} />
  </div>;
}

function PerformedLine({ plan, fallback }: { plan?: PerformancePlan; fallback: string }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (!plan?.line) return;
    let tick = 0;
    const start = window.setTimeout(() => { let index = 0; tick = window.setInterval(() => { index += 1; setVisible(index); if (index >= plan.line.length) window.clearInterval(tick); }, plan.textPlan.revealIntervalMs); }, plan.textPlan.initialDelayMs);
    return () => { window.clearTimeout(start); window.clearInterval(tick); };
  }, [fallback, plan]);
  const line = plan?.line ?? fallback;
  if (!line) return <span className="silence">No line. The action carries the Beat.</span>;
  const shown = plan?.line ? visible : line.length;
  return <span data-delay={plan?.textPlan.initialDelayMs ?? 0} data-tempo={plan?.textPlan.tempo ?? "NORMAL"} data-completion={plan?.textPlan.completion ?? "FULL"}>{line.slice(0, shown).split(" ").map((word, index) => <span key={`${index}-${word}`} className={plan?.textPlan.emphasisRanges.some((range) => index >= range.start && index <= range.end) ? "emphasis" : ""}>{word}{plan?.textPlan.pausePositions.includes(index) ? <i className="performed-pause">  /  </i> : " "}</span>)}</span>;
}

function CharacterCard({ session, id }: { session: GameSession; id: CharacterId }) {
  const character = session.world.characters[id], performance = session.world.history.at(-1)?.performances[id], pose = performance?.facePose ?? neutralFace;
  return <article className={`character-card ${id.toLowerCase()}`}><div className="character-head"><div><span className="eyebrow">{character.role}</span><h3>{character.name}</h3></div><span className="chip">{locationLabels[character.location]}</span></div><div className="portrait"><CharacterFace name={character.name} pose={pose} /><div className="visible-facts"><p>{character.visibleAction}</p><span>attention / {title(character.attention.primaryTarget ?? "unfixed")}</span>{character.hasEnvelope && <b>holds envelope</b>}</div></div><p className={`dialogue volume-${performance?.textPlan.volume.toLowerCase() ?? "normal"}`}><PerformedLine key={performance?.id ?? "initial"} plan={performance} fallback={character.visibleLine} /></p>{performance?.behaviorId === "FEIGN_COMPLIANCE" && <small className="leakage">Words yield; gaze remains on the envelope.</small>}</article>;
}

function Room({ session }: { session: GameSession }) {
  const world = session.world;
  return <section className="room-shell"><header><div><span className="eyebrow">observable room</span><h2>One room. No privileged narrator.</h2></div><span className="beat-stamp">BEAT {Math.min(world.beat, world.maxBeats)} / {world.maxBeats}</span></header><div className="room-map" aria-label="One room with a chair, table, envelope, and exit"><div className="node chair"><b>01</b> CHAIR</div><div className="node table"><b>02</b> TABLE</div><div className="node exit"><b>03</b> EXIT <i>{world.exitAccessible ? "OPEN" : "BLOCKED"}</i></div>{world.envelope.location === "TABLE" && <div className="envelope">SEALED<br /><b>ENVELOPE</b></div>}{world.envelope.holder && <div className={`envelope held ${world.envelope.holder.toLowerCase()}`}>{world.envelope.visible ? "VISIBLE" : "CONCEALED"}<br /><b>ENVELOPE</b></div>}{(["MARA", "DREW"] as CharacterId[]).map((id) => <div key={id} className={`person ${id.toLowerCase()} at-${world.characters[id].location.toLowerCase()}`}>{id[0]}</div>)}</div><div className="character-grid"><CharacterCard session={session} id="MARA" /><CharacterCard session={session} id="DREW" /></div></section>;
}

function SelectField({ label, value, onChange, children, help }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; help?: string }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose...</option>{children}</select>{help && <small>{help}</small>}</label>;
}

function MessageBuilder({ session, setSession }: { session: GameSession; setSession: (session: GameSession) => void }) {
  const draft = session.draft, validation = validateDraft(draft), propositionOptions = compatiblePropositions(draft), change = (patch: Partial<MessageDraft>) => setSession(updateDraft(session, patch)), terminal = Boolean(session.world.terminalState);
  const selectedFunction = functions.find((item) => item.id === draft.functionId);
  return <section className="builder-shell"><header><div><span className="eyebrow">structured intervention</span><h2>Build one direct message</h2></div><p>Queueing edits the pending action. Only <b>End Beat &amp; Observe</b> advances time.</p></header>
    <fieldset disabled={terminal}><legend>Address</legend><div className="field-grid">
      <SelectField label="Recipient" value={draft.recipientId ?? ""} onChange={(value) => change({ recipientId: value as MessageDraft["recipientId"] })}>{recipients.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectField>
      <SelectField label="Subject  /  semantic metadata" value={draft.subjectId ?? ""} onChange={(value) => change({ subjectId: value as MessageDraft["subjectId"] })} help="Validation context only; no independent numeric modifier in v0.2.1.">{subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectField>
      <SelectField label="Visibility" value={draft.visibility ?? ""} onChange={(value) => change({ visibility: value as MessageDraft["visibility"] })} help="Private can reveal contact, never content, to an attentive nonrecipient."><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></SelectField>
    </div></fieldset>
    <fieldset disabled={terminal}><legend>Social structure</legend><div className="field-grid">
      <SelectField label="DPA" value={draft.dpa ?? ""} onChange={(value) => change({ dpa: value as MessageDraft["dpa"], askPayload: value === "ASK" ? {} : undefined, dealPayload: value === "DEAL" ? { offeredValueId: null } : undefined, pressurePayload: value === "PRESSURE" ? { consequenceId: null } : undefined })}><option value="ASK">Ask</option><option value="DEAL">Deal</option><option value="PRESSURE">Pressure</option></SelectField>
      <SelectField label="One primary Function" value={draft.functionId ?? ""} onChange={(value) => change({ functionId: value as MessageDraft["functionId"] })} help={selectedFunction ? `${selectedFunction.operationalStatus}: ${selectedFunction.help}` : "Operational status is shown in every option."}>{functions.map((item) => <option key={item.id} value={item.id}>{item.label}  /  {item.operationalStatus.toLowerCase()}</option>)}</SelectField>
      <SelectField label="Delivery Vibe  /  prototype" value={draft.deliveryVibe ?? ""} onChange={(value) => change({ deliveryVibe: value as MessageDraft["deliveryVibe"] })} help="Canonical name first; room alias second. First Cue dominates. 62:38 is prototype-local.">{enabledVibes().map((item) => <option key={item.code} value={item.code}>{item.code}  /  {item.canonicalName}  -  {item.scenarioAlias}</option>)}</SelectField>
    </div>
    {draft.dpa === "ASK" && <SelectField label="Optional reason  /  wording only" value={draft.askPayload?.reasonId ?? ""} onChange={(value) => change({ askPayload: { reasonId: value || null } })} help="Changes generated wording and provenance; no independent mechanical modifier in v0.2.1.">{reasons.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectField>}
    {draft.dpa === "DEAL" && <SelectField label="Offered value  /  required" value={draft.dealPayload?.offeredValueId ?? ""} onChange={(value) => change({ dealPayload: { offeredValueId: value || null } })}>{offeredValues.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectField>}
    {draft.dpa === "PRESSURE" && <SelectField label="Consequence  /  required" value={draft.pressurePayload?.consequenceId ?? ""} onChange={(value) => change({ pressurePayload: { consequenceId: value || null } })}>{consequences.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectField>}
    </fieldset>
    <fieldset disabled={terminal}><legend>Proposition</legend><div className="proposition-grid">{propositionOptions.map(({ proposition, enabled, reasons: disabledReasons }) => <button type="button" key={proposition.id} disabled={!enabled} className={draft.propositionId === proposition.id ? "chosen" : ""} onClick={() => change({ propositionId: proposition.id })} title={disabledReasons.join(" ")}><b>{proposition.label}</b><span>{title(proposition.kind)}</span><small>{enabled ? proposition.boundaryNotes[0] : disabledReasons.join(" ")}</small></button>)}</div></fieldset>
    <div className={`message-preview ${validation.valid ? "valid" : "invalid"}`}><span>generated line</span><p>&quot;{renderMessage(draft)}&quot;</p><small>{validation.valid ? "Valid bounded message. Wording is generated presentation; mechanics use the structured fields." : validation.issues.map((issue) => issue.explanation).join(" ")}</small></div>
    <div className="queue-row"><button className="queue" disabled={!validation.valid || terminal} onClick={() => setSession(queueDraft(session))}>{session.queuedMessage ? "Update queued message" : "Queue message"}</button>{session.queuedMessage && <button className="remove" onClick={() => setSession(removeQueuedMessage(session))}>Remove</button>}<span>{session.queueNotice}</span></div>
    {session.queuedMessage && <div className="queued"><span>QUEUED  /  BEAT HAS NOT ADVANCED</span><b>{session.queuedMessage.visibility} -&gt; {session.queuedMessage.recipientId}</b><p>{session.queuedMessage.surfaceText}</p></div>}
  </section>;
}

const JSONBlock = ({ value }: { value: unknown }) => <pre>{JSON.stringify(value, null, 2)}</pre>;
function Panel({ number, title: panelTitle, children }: { number: number; title: string; children: React.ReactNode }) { return <section className="trace-panel"><header><span>{String(number).padStart(2, "0")}</span><h3>{panelTitle}</h3></header>{children}</section>; }
function Designer({ session }: { session: GameSession }) {
  const [index, setIndex] = useState(-1), selectedIndex = index < 0 ? session.world.history.length - 1 : Math.min(index, session.world.history.length - 1);
  const beat: ResolvedBeat | undefined = session.world.history[selectedIndex]; if (!beat) return <section className="designer-empty"><span>NO RESOLVED BEAT</span><h2>The causal instrument is ready.</h2><p>Resolve a Beat in Player View. Every panel reads the stored record; nothing is recomputed for display.</p></section>;
  const char = (id: CharacterId) => session.world.characters[id];
  return <div className="designer-shell"><nav className="history-nav"><b>Beat history</b>{session.world.history.map((item, itemIndex) => <button key={item.beat} className={itemIndex === selectedIndex ? "active" : ""} onClick={() => setIndex(itemIndex)}>B{item.beat}</button>)}</nav><div className="trace-grid">
    <Panel number={1} title="Beat frame"><p>Beat {beat.beat}; one queued message or Wait. Both intentions used one post-interpretation, pre-action snapshot.</p></Panel><Panel number={2} title="Message & builder field integrity"><JSONBlock value={{ message: beat.queuedMessage ?? { action: "WAIT", explanation: "Empty queue" }, fields: beat.builderFieldIntegrity }} /></Panel><Panel number={3} title="Communication event"><JSONBlock value={beat.communicationEvent ?? { event: null }} /></Panel><Panel number={4} title="Perception & privacy"><JSONBlock value={beat.perceptions} /></Panel><Panel number={5} title="Interpretation"><JSONBlock value={beat.interpretations} /></Panel><Panel number={6} title="Belief changes"><JSONBlock value={beat.beliefChanges} /></Panel><Panel number={7} title="Functional applications"><JSONBlock value={beat.functionalApplications} /></Panel><Panel number={8} title="Functional pressures"><JSONBlock value={beat.functionalPressures} /></Panel><Panel number={9} title="Candidate scores"><JSONBlock value={beat.candidates} /></Panel><Panel number={10} title="Selected intentions"><JSONBlock value={beat.selectedIntents} /></Panel><Panel number={11} title="Joint resolution"><JSONBlock value={beat.jointActions} /></Panel><Panel number={12} title="Performance plans"><JSONBlock value={beat.performances} /></Panel><Panel number={13} title="State diffs"><JSONBlock value={beat.diffs} /></Panel><Panel number={14} title="Mutation-time causal trace"><JSONBlock value={beat.trace} /></Panel><Panel number={15} title="Current epistemic & social state"><JSONBlock value={{ beliefs: { MARA: char("MARA").beliefs, DREW: char("DREW").beliefs }, inferences: { MARA: char("MARA").inferences, DREW: char("DREW").inferences }, social: session.world.social, boundary: "Reported claims are not objective truth. Private nonrecipients never receive content." }} /></Panel>
  </div></div>;
}

export default function BehaviorLab() {
  const [session, setSession] = useState<GameSession>(() => createInitialSession()), [view, setView] = useState<ViewMode>("PLAYER");
  const last = session.world.history.at(-1), status = useMemo(() => session.world.terminalState?.title ?? (session.queuedMessage ? "message queued" : "awaiting intervention"), [session]);
  return <main><header className="app-header"><div><span className="edition">ORBL / v0.2.1</span><h1>One Room Behavior Lab</h1><p>Author a condition. Observe two situated decisions.</p></div><div className="view-switch"><button className={view === "PLAYER" ? "active" : ""} onClick={() => setView("PLAYER")}>Player</button><button className={view === "DESIGNER" ? "active" : ""} onClick={() => setView("DESIGNER")}>Designer</button></div></header><div className="status-strip"><span><i /> {status}</span><b>Beat {Math.min(session.world.beat, session.world.maxBeats)} / {session.world.maxBeats}</b><span>{last ? `${title(last.selectedIntents.MARA)} + ${title(last.selectedIntents.DREW)}` : "room initialized"}</span></div>{view === "PLAYER" ? <div className="player-layout"><Room session={session} /><MessageBuilder session={session} setSession={setSession} /><section className="observable-log"><span className="eyebrow">observable record</span><ol>{session.world.eventLog.map((entry, index) => <li key={`${index}-${entry}`}><b>{String(index).padStart(2, "0")}</b>{entry}</li>)}</ol></section></div> : <Designer session={session} />}<div className="end-dock"><div><span>{session.queuedMessage ? "Resolve the queued message" : "Empty queue = Wait"}</span><small>Queue, edit, and remove do not advance the Beat.</small></div><button disabled={Boolean(session.world.terminalState)} onClick={() => setSession(endBeat(session))}>END BEAT &amp; OBSERVE <b>-&gt;</b></button>{session.world.terminalState && <button className="restart" onClick={() => setSession(createInitialSession())}>Restart lab</button>}</div></main>;
}

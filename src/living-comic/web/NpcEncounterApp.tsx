"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildEncounterDesignerView,
  buildEncounterPlayerView,
} from "../encounters/presentation";
import {
  applyEncounterChoice,
  createInitialEncounterState,
} from "../encounters/runtime";
import type { ChoiceId, EncounterMood } from "../encounters/schema";
import { trapstarPaymentEncounter } from "../encounters/trapstarPaymentEncounter";
import {
  createInitialNpcEncounterPresentationState,
  enterNpcEncounterSession,
  restartNpcEncounterSession,
  setNpcEncounterDesignerOpen,
} from "./npcEncounterPresentationState";

const moodArtwork: Record<EncounterMood, string> = {
  neutral: "/scene-maker/characters/2d/broker/idle.png",
  guarded: "/scene-maker/characters/2d/broker/arms_crossed.png",
  angry: "/scene-maker/characters/2d/broker/pointing.png",
  agreement: "/scene-maker/characters/2d/broker/open_hand_negotiating.png",
};

type FocusTarget = "setup" | "speaker" | "ending";

export default function NpcEncounterApp() {
  const [state, setState] = useState(() => createInitialEncounterState(trapstarPaymentEncounter));
  const [presentation, setPresentation] = useState(createInitialNpcEncounterPresentationState);
  const focusRequest = useRef<FocusTarget | null>(null);
  const setupButtonRef = useRef<HTMLButtonElement>(null);
  const speakerHeadingRef = useRef<HTMLHeadingElement>(null);
  const endingHeadingRef = useRef<HTMLHeadingElement>(null);
  const playerView = buildEncounterPlayerView(trapstarPaymentEncounter, state);
  const designerView = buildEncounterDesignerView(trapstarPaymentEncounter, state);
  const artwork = moodArtwork[playerView.npc.visualMoodToken];

  useEffect(() => {
    const target = focusRequest.current;
    if (!target) return;
    const element = {
      setup: setupButtonRef.current,
      speaker: speakerHeadingRef.current,
      ending: endingHeadingRef.current,
    }[target];
    element?.focus();
    focusRequest.current = null;
  }, [presentation.entered, state.stateId]);

  const enter = () => {
    const next = enterNpcEncounterSession(state, presentation);
    focusRequest.current = "speaker";
    setState(next.encounterState);
    setPresentation(next.presentationState);
  };

  const choose = (choiceId: ChoiceId) => {
    const next = applyEncounterChoice(trapstarPaymentEncounter, state, choiceId);
    focusRequest.current = next.status === "COMPLETE" ? "ending" : "speaker";
    setState(next);
  };

  const restart = () => {
    const next = restartNpcEncounterSession(trapstarPaymentEncounter);
    focusRequest.current = "setup";
    setState(next.encounterState);
    setPresentation(next.presentationState);
  };

  return (
    <main className="npc-encounter" data-mood={playerView.npc.visualMoodToken}>
      <p className="npc-live-status" role="status" aria-live="polite" aria-atomic="true">
        {presentation.entered ? playerView.dialogue : ""}
      </p>

      <div className="npc-encounter-shell">
        {!presentation.entered ? (
          <section className="npc-setup-card" aria-labelledby="npc-setup-title">
            {/* Native image preserves the tracked Apartment 305 plate. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="npc-setup-room"
              src="/scene-maker/backgrounds/apt-305-2d.png"
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            <div className="npc-setup-shade" />
            <div className="npc-setup-copy">
              <div className="npc-setup-meta">
                <span>{playerView.setup.location}</span>
                <time>{playerView.setup.time}</time>
              </div>
              <h1 id="npc-setup-title">{playerView.setup.problem}</h1>
              <div className="npc-setup-payment">
                <p>{playerView.setup.debt}</p>
                <p>{playerView.setup.payment}</p>
              </div>
              <p className="npc-setup-stakes">{playerView.setup.stakes}</p>
              <p className="npc-setup-objective">{playerView.setup.objective}</p>
              <button ref={setupButtonRef} type="button" onClick={enter}>
                <span>{playerView.setup.ctaLabel}</span>
                <i aria-hidden="true">→</i>
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="npc-encounter-stage" aria-label="Disputed payment negotiation">
              <div className="npc-scene-frame">
                {/* Native images preserve the tracked transparent cutout and presentation frame. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="npc-room-plate"
                  src="/scene-maker/backgrounds/apt-305-2d.png"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
                <div className="npc-scene-shade" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={playerView.npc.visualMoodToken}
                  className="npc-character-art"
                  src={artwork}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
                <div className="npc-location-stamp">
                  <span>{playerView.setup.location}</span>
                  <time>{playerView.setup.time}</time>
                </div>
              </div>

              <article className="npc-dialogue-panel">
                <div className="npc-speaker-line">
                  <span>{playerView.npc.role}</span>
                  <h1 ref={speakerHeadingRef} tabIndex={-1}>{playerView.npc.name}</h1>
                </div>

                {playerView.ending ? (
                  <div className="npc-ending">
                    <h2 ref={endingHeadingRef} tabIndex={-1}>{playerView.ending.title}</h2>
                    <blockquote key={playerView.nodeId}>“{playerView.dialogue}”</blockquote>
                    <p className="npc-outcome-lead">{playerView.ending.outcomeLead}</p>
                    <h3>What shaped the outcome</h3>
                    <ol>
                      {playerView.ending.factors.map((factor) => <li key={factor}>{factor}</li>)}
                    </ol>
                    <button className="npc-restart" type="button" onClick={restart}>
                      START OVER
                    </button>
                  </div>
                ) : (
                  <>
                    <blockquote key={playerView.nodeId}>
                      “{playerView.dialogue}”
                    </blockquote>
                    <div className="npc-choice-list" role="group" aria-label="Choose a response">
                      {playerView.choices.map((choice) => (
                        <button key={choice.id} type="button" onClick={() => choose(choice.id)}>
                          <span>{choice.intentLabel}</span>
                          <strong>“{choice.text}”</strong>
                          <i aria-hidden="true">→</i>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </article>
            </section>

            <section className="npc-designer-tools" aria-label="Encounter designer tools">
              <button
                className="npc-designer-toggle"
                type="button"
                aria-expanded={presentation.designerOpen}
                aria-controls="npc-designer-view"
                onClick={() => setPresentation((current) =>
                  setNpcEncounterDesignerOpen(current, !current.designerOpen))}
              >
                {presentation.designerOpen ? "Hide Designer View" : "Show Designer View"}
                <span aria-hidden="true">{presentation.designerOpen ? "−" : "+"}</span>
              </button>

              {presentation.designerOpen ? (
                <div id="npc-designer-view" className="npc-designer-view">
                  <div className="npc-designer-heading">
                    <span>READ-ONLY AUTHORITATIVE ENCOUNTER STATE</span>
                    <small>{designerView.boundaryNote}</small>
                  </div>
                  <dl className="npc-designer-metrics">
                    <div><dt>Trust</dt><dd>{designerView.trust}</dd></div>
                    <div><dt>Tension</dt><dd>{designerView.tension}</dd></div>
                    <div><dt>Mood</dt><dd>{designerView.mood}</dd></div>
                    <div><dt>Status</dt><dd>{designerView.status}</dd></div>
                    <div><dt>Round</dt><dd>{designerView.currentRound}</dd></div>
                    <div><dt>Matched outcome</dt><dd>{designerView.matchedOutcome}</dd></div>
                    <div className="npc-designer-wide"><dt>Node</dt><dd>{designerView.currentNodeId}</dd></div>
                    <div className="npc-designer-wide"><dt>Latest authored effect</dt><dd>{designerView.latestStateEffect}</dd></div>
                    <div className="npc-designer-wide"><dt>Applied after bounds</dt><dd>{designerView.appliedStateEffect}</dd></div>
                  </dl>

                  <div className="npc-designer-details">
                    <section>
                      <h2>Selected choice IDs</h2>
                      {designerView.selectedChoiceIds.length ? (
                        <ol>{designerView.selectedChoiceIds.map((id) => <li key={id}>{id}</li>)}</ol>
                      ) : <p>No choices selected.</p>}
                    </section>
                    <section>
                      <h2>Intent path</h2>
                      {designerView.intentPath.length ? (
                        <ol>{designerView.intentPath.map((intent, index) => <li key={`${index}-${intent}`}>{intent}</li>)}</ol>
                      ) : <p>No choices selected.</p>}
                    </section>
                    <section>
                      <h2>Ending precedence</h2>
                      <ol>{designerView.endingRulePrecedence.map((rule) => <li key={rule}>{rule}</li>)}</ol>
                    </section>
                    <section>
                      <h2>Matched rule or fallback</h2>
                      <p>{designerView.matchedEndingRule}</p>
                    </section>
                  </div>
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

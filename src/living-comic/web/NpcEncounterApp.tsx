"use client";

import { useState } from "react";
import {
  buildEncounterDesignerView,
  buildEncounterPlayerView,
} from "../encounters/presentation";
import {
  applyEncounterChoice,
  createInitialEncounterState,
} from "../encounters/runtime";
import type { EncounterMood } from "../encounters/schema";
import { trapstarPaymentEncounter } from "../encounters/trapstarPaymentEncounter";

const moodPresentation: Record<EncounterMood, { label: string; image: string }> = {
  neutral: {
    label: "Neutral",
    image: "/scene-maker/characters/2d/broker/idle.png",
  },
  guarded: {
    label: "Guarded",
    image: "/scene-maker/characters/2d/broker/arms_crossed.png",
  },
  angry: {
    label: "Angry",
    image: "/scene-maker/characters/2d/broker/pointing.png",
  },
  agreement: {
    label: "Agreement",
    image: "/scene-maker/characters/2d/broker/open_hand_negotiating.png",
  },
};

export default function NpcEncounterApp() {
  const [state, setState] = useState(() => createInitialEncounterState(trapstarPaymentEncounter));
  const [designerOpen, setDesignerOpen] = useState(false);
  const playerView = buildEncounterPlayerView(trapstarPaymentEncounter, state);
  const designerView = buildEncounterDesignerView(trapstarPaymentEncounter, state);
  const mood = moodPresentation[playerView.npc.mood];

  const restart = () => {
    setState(createInitialEncounterState(trapstarPaymentEncounter));
    setDesignerOpen(false);
  };

  return (
    <main className="npc-encounter" data-mood={playerView.npc.mood}>
      <div className="npc-encounter-shell">
        <header className="npc-encounter-header">
          <div>
            <span className="npc-encounter-kicker">TRAPSTAR / CAPSTONE REFERENCE</span>
            <h1>{playerView.title}</h1>
            <p>{playerView.subtitle}</p>
          </div>
          <button className="npc-restart npc-restart-quiet" type="button" onClick={restart}>
            Restart encounter
          </button>
        </header>

        <section className="npc-encounter-stage" aria-label="Disputed payment negotiation">
          <div className="npc-scene-frame">
            {/* Native images preserve the tracked transparent cutout and fixed presentation frame. */}
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
              key={playerView.npc.mood}
              className="npc-character-art"
              src={mood.image}
              alt={`${playerView.npc.name}, ${mood.label.toLowerCase()} mood`}
              draggable={false}
            />
            <div className="npc-mood-badge" aria-live="polite">
              <span>Current expression</span>
              <strong>{mood.label}</strong>
            </div>
            <div className="npc-location-stamp">APT. 305 / AFTER HOURS</div>
          </div>

          <article className="npc-dialogue-panel" aria-live="polite">
            <div className="npc-dialogue-meta">
              <span>{playerView.progressLabel}</span>
              <span>Disputed payment</span>
            </div>
            <div className="npc-speaker-line">
              <span>NPC</span>
              <h2>{playerView.npc.name}</h2>
            </div>
            {playerView.ending ? (
              <p className="npc-ending-title">{playerView.ending.title}</p>
            ) : null}
            <blockquote key={playerView.nodeId}>“{playerView.dialogue}”</blockquote>

            {playerView.ending ? (
              <div className="npc-ending-actions">
                <p>The negotiation is over. Restart to test another route through the encounter.</p>
                <button className="npc-restart npc-restart-primary" type="button" onClick={restart}>
                  Restart encounter
                </button>
              </div>
            ) : (
              <div className="npc-choice-list" role="group" aria-label={`Player responses for ${playerView.progressLabel}`}>
                {playerView.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setState((current) => applyEncounterChoice(trapstarPaymentEncounter, current, choice.id))}
                  >
                    <span>{String(choice.ordinal).padStart(2, "0")}</span>
                    <strong>{choice.text}</strong>
                    <i aria-hidden="true">→</i>
                  </button>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="npc-designer-tools" aria-label="Encounter designer tools">
          <label htmlFor="npc-designer-toggle">
            <input
              id="npc-designer-toggle"
              type="checkbox"
              checked={designerOpen}
              onChange={(event) => setDesignerOpen(event.target.checked)}
            />
            <span>Show Designer View</span>
          </label>
          {designerOpen ? (
            <div className="npc-designer-view">
              <div className="npc-designer-heading">
                <span>READ-ONLY AUTHORITATIVE ENCOUNTER STATE</span>
                <small>Encounter-local metrics; not Living Comic Belief or Scene Pressure</small>
              </div>
              <dl>
                <div><dt>Trust</dt><dd>{designerView.trust}</dd></div>
                <div><dt>Tension</dt><dd>{designerView.tension}</dd></div>
                <div><dt>Mood</dt><dd>{designerView.mood}</dd></div>
                <div><dt>Round</dt><dd>{designerView.currentRound}</dd></div>
                <div className="npc-designer-wide"><dt>Node</dt><dd>{designerView.currentNodeId}</dd></div>
                <div className="npc-designer-wide"><dt>Latest state effect</dt><dd>{designerView.latestStateEffect}</dd></div>
                <div className="npc-designer-wide"><dt>Applied after bounds</dt><dd>{designerView.appliedStateEffect}</dd></div>
              </dl>
            </div>
          ) : null}
        </section>

        <p className="npc-reference-note">
          Deterministic scripted reference encounter. No free-text AI, backend, or network service is used.
        </p>
      </div>
    </main>
  );
}

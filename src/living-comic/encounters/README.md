# Trapstar NPC Encounter v0.1

This directory contains the bounded disputed-payment encounter used by the Trapstar capstone browser reference. It demonstrates one NPC, three scripted rounds, three choices per round, persistent encounter-local Trust and Tension, conditional reactions, four moods, three endings, and a full restart.

It is an adjacent Living Comic encounter demonstrator, not a replacement for the canonical three-actor Living Comic runtime. In particular:

- Trust is an encounter-local disposition signal, not a canonical Relationship, Belief, or world fact.
- Tension is an encounter-local escalation signal, not Scene Pressure or the social Pressure action.
- `DEAL REACHED` is a scripted negotiation outcome. It does not assert the canonical Deal/term/obligation lifecycle or a payment transfer.
- The three response transitions are rounds, not Living Comic Beats.

## Model and behavior

The dependency direction is deliberately small:

```text
trapstarPaymentEncounter.ts (validated serializable data)
  -> runtime.ts (pure deterministic state transitions)
  -> presentation.ts (player-safe and Designer View projections)
  -> NpcEncounterApp.tsx (browser rendering and choice dispatch)
```

Trust is clamped to `-2..4`; Tension is clamped to `0..4`. Dialogue, mood, and ending rules are evaluated in authored order:

- Mood: Tension `>= 2` is angry; otherwise Trust `>= 2` is agreement; otherwise Trust `<= 0` is guarded; otherwise neutral. The deal and argument endings force agreement and angry, respectively.
- Ending after round three: Tension `>= 3` selects argument; otherwise Trust `>= 2` selects deal; otherwise walk-away.

The player projection omits Trust, Tension, and state effects. `Show Designer View` is off by default and reveals a separate read-only projection of the authoritative encounter state.

## Creating a future bounded encounter

Replace the exported definition in `trapstarPaymentEncounter.ts` with another object accepted by `encounterDefinitionSchema`. Keep stable snake-case IDs, three ordered rounds with three choices each, ordered conditional variants, state effects, mood rules, and ordered endings. No browser callbacks, React components, DOM references, CSS classes, or artwork paths belong in encounter data. Visual mood-to-art mapping stays in the browser renderer.

This intentionally narrow schema serves the v0.1 acceptance slice; it is not a generic encounter editor or plugin system.

## Launch and validation

From the repository root, with the existing project dependencies available:

```powershell
npm run dev
```

Open `http://localhost:3000/npc-encounter`.

Run automated validation with:

```powershell
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
npm run test:rendered
```

## Known limitations

- One fixed NPC and one fixed disputed-payment scenario.
- Exactly three rounds and three choices per round.
- Payment amounts remain authored dialogue; no economy or balance state is simulated.
- No backend, database, save system, external API, free-text input, runtime AI/LLM, audio, or animation system.
- The browser version is the reference behavior for a later Unity/C# reimplementation. This pass contains no Unity or Adventure Creator code.

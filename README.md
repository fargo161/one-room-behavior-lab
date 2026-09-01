# Living Comic Engine v0.1

This repository now contains two deliberately separated executable design lineages:

1. **Living Comic Engine v0.1** — the active product implementation under `src/living-comic/` and `content/`.
2. **One-Room Behavior Lab v0.3.1** — the preserved earlier reference/regression oracle under the existing `src/v3`, legacy app, tests, reports, and tags.

And a third, self-contained design package lineage:

3. **Trapstar Room 01 portable design package** — the canonical design-and-metadata package for Room 01 is maintained under `trapstar/packages/room-01/v0.1/`.

Living Comic is additive. It does not mutate the Mara/Drew/Envelope assumptions of One-Room into a generic system. The older prototype remains useful evidence for deterministic collision, attention, communication, provenance, and regression behavior.

## Living Comic v0.1

Living Comic is a deterministic, inspectable social simulation presented as a comic. Narrative LEGO composes a valid starting problem from reusable structured content, then simulation takes over. Player and NPCs share one semantic action grammar; actors reason from beliefs rather than privileged world truth; communication occurrence, content access, perception, interpretation, and belief update remain separate records.

The fixed v0.1 slice is intentionally small:

```text
PLAYER + NPC A + NPC B
ONE MODULAR ROOM
1–3 ACTIVE OBJECTS
ONE PRINCIPAL ACTION / ACTOR / BEAT
10-BEAT HARD CAP
ASK / PRESSURE / DEAL / DEAL RESPONSE / DIRECT / WAIT
ESCAPE / ATTENTION / ACCESS / SENSORY
8 BASED VIBES
NO RUNTIME AI
```

The browser implementation lives at `src/living-comic/`. Reusable definitions live at repository-root `content/`. The semantic core does not import React or DOM APIs.

## Run and validate

Node `>=22.13.0` is required.

```powershell
npm install
npm run dev
```

Validation commands:

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run test:rendered
```

The dedicated Phase 9 canonical acceptance fixture can also be loaded from the Living Comic setup screen and played manually. Its automated counterpart is `src/living-comic/fixtures/phase9Acceptance.test.ts`.

## Semantic authority

Hard distinctions include:

```text
Goal ≠ Reason
World Truth ≠ Belief
Action ≠ Result
Event ≠ Perception
Perception ≠ Interpretation
Tactic ≠ Message
Social Pressure ≠ Scene Pressure
True Function ≠ Inferred Function
True Goal ≠ Believed Goal
HELD_BY ≠ OWNED_BY
```

`End Beat & Observe` is the only Play control that advances simulation. Draft editing, comic inspection, panel navigation, setup controls, Play/Debug switching, local snapshot save/restore, and fixture loading do not resolve a Beat.

## Documentation

Start with [`docs/README.md`](docs/README.md) for the documentation authority map.

- [`docs/current/ARCHITECTURE.md`](docs/current/ARCHITECTURE.md) — package boundaries and causal flow.
- [`docs/current/CONTENT_AUTHORING.md`](docs/current/CONTENT_AUTHORING.md) — portable definitions and validation rules.
- [`docs/current/SEMANTIC_INVARIANTS.md`](docs/current/SEMANTIC_INVARIANTS.md) — non-negotiable meaning boundaries.
- [`docs/current/ENGINE_CONTRACTS.md`](docs/current/ENGINE_CONTRACTS.md) — deterministic runtime/replay contracts.
- [`docs/current/UNITY_ADVENTURE_CREATOR_HANDOFF.md`](docs/current/UNITY_ADVENTURE_CREATOR_HANDOFF.md) — future Unity/Adventure Creator ownership boundary.
- [`content/manifest.json`](content/manifest.json) — machine-readable portable content manifest.
- [`src/living-comic/README.md`](src/living-comic/README.md) — implementation checkpoint orientation.

## Preserved One-Room reference

One-Room Behavior Lab v0.3.1 remains intact as the earlier bounded executable reference. Its original root orientation is preserved verbatim at [`docs/reference/ONE_ROOM_BEHAVIOR_LAB_V0_3_1_REFERENCE.md`](docs/reference/ONE_ROOM_BEHAVIOR_LAB_V0_3_1_REFERENCE.md), along with its existing reports, tests, branches, and `v0.3.1` tag.

The earlier [`ADVENTURE_CREATOR_DESIGN_PATH.md`](docs/history/one-room/ADVENTURE_CREATOR_DESIGN_PATH.md) is preserved as a historical precursor. The current portability/handoff contract is [`docs/current/UNITY_ADVENTURE_CREATOR_HANDOFF.md`](docs/current/UNITY_ADVENTURE_CREATOR_HANDOFF.md).

The repository and npm package names intentionally remain unchanged during the v0.1 reconciliation pass so repository history, hosting, and deployment identity are not rewritten as an unrelated migration.

# One Room Behavior Lab v0.2.1

One Room Behavior Lab is a standalone deterministic browser prototype about indirect social influence. The player constructs at most one bounded message per Beat, then explicitly chooses **End Beat & Observe**. Mara and Drew perceive communication, update beliefs or bounded inferences, interpret its social structure, select autonomous behavior from the same snapshot, and perform the result.

v0.2.1 is intended to be frozen as an **executable behavioral reference and validation harness**. It is evidence for a design direction, not the canonical PSG or BASED implementation. There is zero code-level PSG integration in this version. Its gameplay, simulation, tests, and interface may remain durable; its local semantic-definition scaffolding is expected to be replaced or adapted to PSG-native structures in a later phase.

There is no runtime LLM, backend, free-form parser, random seed, or player-facing environmental intervention.

## Run and validate

Node.js 22.13 or later is required.

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run test:rendered
```

## Builder integrity

| Field | v0.2.1 role |
|---|---|
| Recipient | Mechanical: full-content access, acceptance authority, reception profile. |
| Subject | Semantic metadata and validation context; no independent numeric modifier. |
| DPA | Mechanical, provisional Ask/Deal/Pressure interpretation. |
| Function | Operational or partial scenario-local Functional Application; status is shown in Player View. |
| Visibility | Mechanical event salience, content access, and bounded inference. |
| Delivery Vibe | Mechanical provisional reception plus presentation; canonical name and room alias are separate. |
| Proposition | Mechanical semantic request/claim, requested action, belief, and commitment specificity. |
| Ask reason | Wording and provenance only. |
| Deal offer | Mechanical exchange value. |
| Pressure consequence | Mechanical severity and enforceability. |

Generated wording never controls mechanics. Each complete normalized payload receives a stable 64-bit-style dual fingerprint for provenance; message identity never controls behavior.

## Beat and privacy contracts

Queueing, editing, removing, and switching views do not advance time. **End Beat & Observe** is the only clock; an empty queue resolves a true Wait Beat.

Private recipients receive full content. An attentive nonrecipient may notice contact without receiving subject, proposition, DPA, Function, Vibe, or wording, and may form only a bounded inference. Public content remains directly addressed to one recipient.

## Transfer and causality contracts

An accepted Deal is not automatically a transfer Deal. `OFFER_TRANSFER` requires an active accepted commitment whose explicit `requestedAction` is `OFFER_TRANSFER`. Later ownership changes only when Mara's `ACCEPT_TRANSFER` and Drew's `COMPLETE_TRANSFER` match in one joint-resolution frame. Completion wording is generated after that match.

Every final state diff is linked to mutation-time rule and source provenance. Observation-driven opportunity changes remain observation effects; later taking effects remain taking effects.

See `MANUAL_ACCEPTANCE_v0_2_1.md`, `STABILIZATION_REPORT_v0_2_1.md`, and `TEST_MATRIX.md` for the freeze evidence.

# Living Comic Engine v0.1 — Semantic Invariants

These are implementation boundaries, not presentation preferences.

## Distinct record meanings

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

## Epistemic boundary

An actor may act only from its own allowed state: own Goal/Reason, own beliefs, known history, relationship context, obligations, Scene Pressure, and legitimately available observations. NPC decision and interpretation views must never read another actor's private Goal, Reason, belief, or intention as evidence.

The human player supplies the player's interpretive mind. The engine may store player factual beliefs/perceptions but may not silently author an interpretive claim such as “they are manipulating you” as authoritative player belief.

## Communication boundary

Communication occurrence and communication content are separate perceptual facts. A private Message may be noticed by a non-recipient without giving that observer `COMMUNICATION_CONTENT`.

Social tactic identity belongs to the actor-side action. The recipient forms an interpretation from observable cues and legitimately received content; the interpretation must not simply mirror the hidden tactic field.

## Offer and transfer

`OFFER_OBJECT` can assert availability/offer state. It does not automatically transfer `HELD_BY` and never silently changes `OWNED_BY`. Possession transfer requires a mechanically valid acceptance/transfer condition; ownership requires its own valid rule.

## Commitment boundary

`End Beat & Observe` is the sole Play control that advances simulation. Player draft edits, target selection, semantic-term selection, delivery selection, preview, comic navigation, inspection, Play/Debug switching, fixture loading, and local snapshot save/restore are non-causal.

Both NPCs select from the same immutable pre-Beat snapshot. Committed actors do not replan after observing an earlier action in the same Beat.

## Presentation boundary

Play consumes a player-safe adapter. Debug may expose authoritative truth but is read-only. UI components should not receive privileged state merely because they promise not to render it.

## Realization boundary

BASED and paralanguage can alter how a semantic Message appears and how it is interpreted. They cannot silently add authoritative semantic propositions that the receiver's interpretation system never received.

## History boundary

Runtime history promotion uses controlled grounded history-action IDs carried by Observable Events. Presentation cue names are not authoritative history verbs.

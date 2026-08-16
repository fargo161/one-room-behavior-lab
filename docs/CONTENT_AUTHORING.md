# Living Comic Engine v0.1 — Content Authoring

## Principle

Authored content supplies reusable semantic pieces. It must not supply complete authored scenes, tactic sequences, winners, fixed endings, or NPC-specific reaction scripts.

The runtime boundary is:

```text
structured reusable definitions
→ schema validation
→ reference validation
→ Narrative LEGO assembly
→ playability validation
→ runtime snapshot
→ simulation
```

## Definition pools

Repository-root `content/` contains independent pools for characters, Goals, Reasons, secondary Goals, conflict skeletons, object categories/instances, room categories/presets, relationships, grounded history actions, Scene Pressures, direct actions, eight BASED Vibes, message fragments, presentation cues, and predicate semantics.

Every reusable definition uses a stable semantic ID independent of its display label.

## Goal, Reason, Obstacle

A Goal is a desired world state expressed as a Proposition. A Reason is a separate record explaining why that Goal matters and must be grounded in valid history. An Obstacle is a current state-backed condition preventing immediate Goal satisfaction.

Do not collapse them into prose biography or one combined motivation field.

## Information asymmetry

A valid generated scene must contain at least one conflicting belief pair whose proposition is mechanically relevant to an active Goal or its state-backed Obstacle. Merely creating disagreement about an unrelated fact does not satisfy the playability requirement.

## History

Authoritative history uses grounded actions such as `TOOK`, `TRANSFERRED`, `HID`, `FOUND`, `OPENED`, `CLOSED`, `LEFT`, `SAID`, `ACCEPTED_DEAL`, `BROKE_DEAL`, or `FULFILLED_DEAL`.

Interpretive labels such as betrayed, manipulated, protected, or disrespected belong primarily in belief/interpretation, not authoritative event identity.

## Predicate semantics

Portable predicate cardinality and overwrite behavior live in `content/semantic/predicate-semantics.json`. New predicates must define their semantic cardinality and should be routable through existing v0.1 Functions before becoming action-authoritative.

`PROTECTED` is currently a context-level Goal predicate, not a Direct operation. For NPC candidate generation, `PROTECTED true` narrows to the executable immediate condition `EXPOSED false`; this is an explicit v0.1 bridge rather than a new Function or world verb.

## Deals

Deal terms contain desired state changes and a responsible actor. Proposal does not itself cause those changes. Acceptance creates obligations. Fulfillment/breakage is evaluated against world state and grounded action results, and meaningful lifecycle transitions may emit derived events/history.

Authored Deal terms should remain semantic state changes; mechanically meaningful free text is outside v0.1.

## BASED and wording

The eight v0.1 Vibes are AB, AS, SD, SE, EB, AD, DB, and DE. BASED may change lexical cadence, directness, intensity, paralanguage, pose, face, balloon treatment, and interpretation cues. Pure realization must not invent an additional claim, motive, threat, or promise absent from the authoritative semantic Message.

## Validation

Use both layers:

1. schema/reference validation;
2. narrative/playability validation with explicit rejection reasons.

Candidate content—human- or AI-authored—must pass both before entering the approved runtime library.

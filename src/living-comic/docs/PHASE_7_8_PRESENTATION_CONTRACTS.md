# Phase 7–8 realization and presentation contracts

## RealizeMessage

Input is one semantic `Message`, the portable content manifest, scene seed, and deterministic wording variant index. Output is a `RealizedMessage` containing wording, a plain-language delivery label, BASED Vibe ID, structured paralanguage, pose, face, balloon, and interpretation cues.

The semantic Message remains authoritative. Realization must not modify sender, recipient, tactic, desired state change, claims, disclosure, claimed Reason, Deal link, or open/private delivery. The wording fragment is chosen through the explicit scene seed plus stable Message identity and variant ordinal. Runtime AI and free-text semantic input are forbidden.

BASED is evidence, not truth. Its interpretation cues are added to the public Observable Event and may alter finite interpretation candidate scores. They never reveal the sender's private true Goal, Reason, Function, or intention.

Normal Play selects among context-valid labels such as “Invite their cooperation” or “Set a calm boundary.” Raw codes (`AB`, `AS`, `SD`, `SE`, `EB`, `AD`, `DB`, `DE`) remain Debug data.

## NPC scoring extension seam

v0.1 uses `defaultNpcScoringProfile`. `selectNpcAction` accepts an explicit `NpcScoringProfile` while preserving the same candidate model, belief constraints, component trace, and deterministic tie-break. Future character/profile modifiers may derive a profile and pass it through this seam; they must not create route-specific hidden bonuses or bypass the trace.

## BuildPlayerSafeView

Input is authoritative engine state and portable display content. Output contains only:

- the player's own Goal and Reason;
- the player's factual beliefs and certainty;
- relationship/history records known through player relationships;
- the player's own obligations and Deals;
- records directly registered in player Perceptions;
- result panels derived exclusively from those Perceptions;
- message wording only when `COMMUNICATION_CONTENT` was received.

It excludes conflict skeleton identity, World Truth not known by the player, NPC Goals, NPC Reasons, NPC beliefs, NPC interpretation hypotheses, NPC score traces, and unperceived events.

## BuildDebugView

Debug receives a deep-cloned complete runtime snapshot, generation and validation traces, and all Beat reports. It is read-only. It may export JSON and copy a replay specification, but it cannot mutate or advance simulation.

## Browser control contract

`End Beat & Observe` is the sole advancing control. Scene inspection, builder changes, delivery changes, previews, result micro-panel navigation, What I Know/Noticed navigation, and Play/Debug switching do not call `ResolveBeat`.

The web layer may construct action commands and render adapters. Simulation, cognition, generation, and realization do not import React or browser modules.

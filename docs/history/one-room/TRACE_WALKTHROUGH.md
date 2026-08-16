# Trace Walkthrough — v0.2.1

## Opportunity route

**Beat 1:** a private Ask to Mara applies `CREATE_OPPORTUNITY`. Mara receives content; Drew may notice contact but content stays unavailable. Acceptance creates `PLAN_B1_MARA_MONITOR`, not opportunity points. Mara selects `MONITOR_DREW`.

**Beat 2:** a message asks Drew to verify with the player using `VERIFY_INFORMATION`. Drew selects `QUESTION_PLAYER` and enacts attention to `PLAYER_CHANNEL`. Mara uses the same pre-action snapshot and cannot exploit that new action yet.

**Beat 3:** the active plan observes Drew's already-enacted attention. A mutation-time recorder assigns the observed belief, stale-belief refutation, opportunity change, nerve change, and plan satisfaction to `RULE_SCENARIO_MONITOR_OBSERVES_DIVERSION` with the plan and attention-effect sources. Mara can now select `TAKE_ENVELOPE`. Envelope/possession/risk changes from taking retain `RULE_EFFECT_TAKE_ENVELOPE`; the later behavior cannot relabel the earlier observation.

**Beat 4:** possession activates exit pressure and Mara leaves. Terminal result is `SUCCESS / OPPORTUNITY`.

## Negotiated route

A Deal for `DREW_RELEASE_ENVELOPE_TO_MARA` records `requestedAction: OFFER_TRANSFER`. Acceptance creates an exchange and action-specific commitment. Only that active commitment makes `OFFER_TRANSFER` eligible. Drew's offer alone does not move the envelope. On a later Beat, Mara's acceptance and Drew's completion match; `RULE_JOINT_TRANSFER_MATCH` changes ownership exactly once and fulfills only the related exchange/commitment. Completion wording is selected after the match.

An accepted protective or reciprocity Deal without a requested transfer action can affect value and exchange state but creates no transfer commitment and cannot open the route.

## Trace contract

Each mutation is wrapped at its causal site. The recorder snapshots the immediate before/after primitives and stores `ruleId`, explanation, and semantic `sourceRefs`. Final diffs must find exact recorded provenance or resolution throws. Trace assembly copies this provenance; it does not infer a rule from path or selected behavior afterward. Deterministic replay reproduces message identity, diffs, sources, and trace.

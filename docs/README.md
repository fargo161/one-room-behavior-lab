# Documentation Map

This directory separates **current authority**, **preserved reference material**, and **historical process records** so readers and agents can tell what governs the project now.

## Authority order

1. [`../README.md`](../README.md) — repository entry point and current product orientation.
2. [`trapstar/README.md`](../trapstar/README.md) — authoritative Trapstar package contract, with the portable Room 01 package under `trapstar/packages/room-01/v0.1/`.
3. [`current/`](current/) — authoritative Living Comic Engine v0.1 architecture and contracts.
4. [`reference/`](reference/) — preserved predecessor/reference-system documentation that remains useful for regression and comparison.
5. [`history/`](history/) — superseded migration, stabilization, maintenance, acceptance, and design-path records retained as an audit trail.

Trapstar authority is now authoritative only from the `trapstar/` namespace; it is not governed by `docs/current/`.

## Current

Use these documents when implementing or reviewing Living Comic v0.1:

- [`current/ARCHITECTURE.md`](current/ARCHITECTURE.md)
- [`current/ENGINE_CONTRACTS.md`](current/ENGINE_CONTRACTS.md)
- [`current/SEMANTIC_INVARIANTS.md`](current/SEMANTIC_INVARIANTS.md)
- [`current/CONTENT_AUTHORING.md`](current/CONTENT_AUTHORING.md)
- [`current/UNITY_ADVENTURE_CREATOR_HANDOFF.md`](current/UNITY_ADVENTURE_CREATOR_HANDOFF.md)
- [`current/QUICK_SCENE_MAKER_V0_1.md`](current/QUICK_SCENE_MAKER_V0_1.md) — adjacent visual-authoring tool contract
- [`current/TRAPSTAR_EXPRESSION_MAKER_V0_2.md`](current/TRAPSTAR_EXPRESSION_MAKER_V0_2.md) — multi-character Marcus + Goose facial-expression authoring contract

## Reference

[`reference/ONE_ROOM_BEHAVIOR_LAB_V0_3_1_REFERENCE.md`](reference/ONE_ROOM_BEHAVIOR_LAB_V0_3_1_REFERENCE.md) documents the preserved One-Room Behavior Lab v0.3.1 lineage. It remains a regression/reference oracle, not the current Living Comic product authority.

## History

[`history/one-room/`](history/one-room/) contains the One-Room migration, repair, stabilization, dependency-maintenance, acceptance, provisional-mapping, and earlier Adventure Creator design-path records.

**Files under `history/` must not be treated as current implementation authority unless a current document explicitly cites them as historical evidence.**

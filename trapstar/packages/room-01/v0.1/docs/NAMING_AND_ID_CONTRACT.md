# Naming and ID contract

- IDs are uppercase semantic tokens; filenames are lowercase filesystem-safe derivatives of those IDs.
- Room: `ROOM_01_APT_305`; views: `VIEW_ISO`, `VIEW_FP2D`; state: `STATE_NEUTRAL_NEON`.
- Characters: `CHAR_MARCUS_BROKER`, `CHAR_EMILIO_CONTACT`, `CHAR_GOOSE_TRACKSUIT`; original role labels remain aliases.
- Pose IDs follow `<character_id>__POSE__<family>__<orientation>__<variant>`. Source suffixes `(2)`–`(6)` and `generated` never appear in canonical filenames.
- Orientation vocabulary is controlled (`FRONT`, `REAR`, `FRONT_3Q_VIEWER_LEFT/RIGHT`, `REAR_3Q_VIEWER_RIGHT`, `PROFILE_3Q_VIEWER_RIGHT`). Confidence is stored per pose. Anatomical left/right is reserved for body semantics; canvas placement uses explicit viewer-left/viewer-right fields.
- Nodes follow `NODE__<ROLE>__<NAME>`. A schema capability may exist while its room instance is `BLOCKED_MISSING` or unassigned.
- `interaction_command_id` / `hotspot_function_id` are separate from Living Comic `Function`. `visual_action_id` is separate from `semantic_action`.
- Package primary status is separate from repository readiness and from implementation/test/visual-validation axes in advisory compatibility contracts.

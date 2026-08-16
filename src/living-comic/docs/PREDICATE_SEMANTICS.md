# Portable predicate cardinality contract

The proposition model separates a proposition's identity from the semantic slot in which values can contradict one another. This distinction must be reproduced by the future Unity/C# implementation.

The authoritative portable classification is `content/semantic/predicate-semantics.json`. TypeScript parses that file at module load through `predicateSemanticContractSchema`; consumers must not carry private predicate lists.

## Cardinalities

`FUNCTIONAL` means one value occupies the subject/predicate slot. Two different values conflict:

```text
primary_object HELD_BY actor_player
primary_object HELD_BY actor_counterpart
```

Current object-valued functional predicates are:

- `HELD_BY`
- `OWNED_BY`
- `LOCATED_AT`
- `LOCATED_IN`
- `CONTROLLED_BY`
- `ATTENDING_TO`

Boolean and scalar-valued propositions are also functional by construction.

`MULTI_VALUED` means each subject/predicate/object tuple has its own slot. Different objects can coexist:

```text
scene_room ACCESSIBLE_TO actor_player
scene_room ACCESSIBLE_TO actor_counterpart
```

Current explicitly classified multi-valued predicates are:

- `ACCESSIBLE_TO`
- `ACCESS_DENIED_TO`
- `DISCLOSED_TO`
- `VISIBLE_TO`
- `OFFERED_TO`
- `AVAILABLE_TO`

Unknown object-valued predicates default to `MULTI_VALUED`. Authors should add any new functional predicate to the portable contract rather than relying on that safe default.

## Conformance algorithm

For a functional proposition, contradiction key is:

```text
subjectId | predicate
```

For a multi-valued proposition, contradiction key is:

```text
subjectId | predicate | objectId
```

Two propositions contradict when they share a contradiction key but have different identities. This algorithm is used by content validation, Narrative LEGO assembly, runtime fact mutation, and belief revision.

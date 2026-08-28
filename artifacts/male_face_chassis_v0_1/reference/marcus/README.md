# Marcus reference evidence

This directory records evidence from the pinned Marcus PXZ without copying its identity-bound pixels into the generic chassis.

- `reference_provenance.json` pins hashes, dimensions, authority, and the derivative-export warning set.
- `marcus_layer_mapping.csv` inventories all 62 PXZ layers, their source and face-space rectangles, semantic disposition, and reuse prohibition.
- `scripts/face-chassis/validate_marcus_reference.py` verifies the CSV directly against the pinned PXZ and cross-checks the companion ZIP. It is strictly read-only.

The PXZ is authoritative reference evidence. The companion ZIP is a convenience export only. Every row is marked `direct_generic_reuse=PROHIBITED`; the source may guide semantics and later authored assets but does not populate the generic identity pack.

The checked mapping is reproduced with:

```powershell
python scripts/face-chassis/validate_marcus_reference.py `
  --pxz "C:\Users\mcdon\Downloads\trapface_slot_labeled_anatomical_eye_split.pxz" `
  --derivative-zip "C:\Users\mcdon\Downloads\trapface_slot_labeled_anatomical_eye_split_layers.zip"
```

Expected result: `PASS_WITH_WARNINGS`, solely because the non-authoritative ZIP CSV records three visibility flags differently from the PXZ manifest.

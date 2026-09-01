# Character size bible v0.1

This bible is built from direct pixel measurements of the supplied room plates and 48 systematic transparent pose images. The supplied validation sheets are qualitative QA evidence, not a measured size bible. Inferred assembler targets are labeled as such; identity or proportion drift was not painted over.

## VIEW_FP2D

| Field | Value | Basis |
|---|---:|---|
| Room canvas | 1448 × 1086 px | direct plate measurement |
| Source alpha-bounded height | 1135–1526 px; median 1323.5 | direct, 24 pose bboxes |
| Nominal normalized content height | 720 px | inferred from direct example-scene/validation comparison; medium confidence |
| Permitted range | 684–756 px | inferred ±5% QA tolerance |
| Foot baseline | y=1040 | inferred neutral stage baseline; medium confidence |
| Safe character region | x=220–1280, y=280–1000 | specialist manual trace/inference from plate and QA composite |
| Head anchor | approx. (724, 414) | proportional estimate; low confidence |
| Pelvis anchor | approx. (724, 716) | proportional estimate; low confidence |
| Depth behavior | fixed nominal scale | no defensible depth curve found |

## VIEW_ISO

| Field | Value | Basis |
|---|---:|---|
| Room canvas | 1448 × 1086 px | direct plate measurement |
| Source alpha-bounded height | 1214–1513 px; median 1351.5 | direct, 24 pose bboxes |
| Nominal normalized content height | 330 px | inferred from direct example-scene/validation comparison; medium confidence |
| Permitted range | 297–363 px | inferred ±10% depth/QA tolerance |
| Neutral foot baseline | y=850 | inferred center-depth anchor; medium confidence |
| Safe character region | x=410–1265, y=410–928 | bounding box of specialist-traced safe polygon |
| Head anchor | approx. (724, 607) | proportional estimate; low confidence |
| Pelvis anchor | approx. (724, 702) | proportional estimate; low confidence |
| Depth behavior | suggested 0.90–1.10 display multiplier | inferred only; calibrate manually |

## Contact and padding contract

- Source alpha bounding boxes and source foot-baseline rows are direct measurements in every pose record.
- Viewer-left/viewer-right foot contact estimates come from thresholded pixels in the bottom 6% of each sprite. Anatomical left/right remains unresolved rather than guessed.
- Head boxes, pelvis points, and hand-reach bands are proportional estimates and must be manually registered before a replaceable-head or interaction rig is declared.
- Fixed canvases preserve gesture reach: 1448 × 1086, transparent, horizontal centering, documented translation, LANCZOS resampling.
- FP2D assets use 96 px nominal side padding; ISO uses 64 px. No normalized image clips its alpha-bounded content.

## Room comparisons

- The door is baked into each flattened plate; comparison is visual/inferred, not based on a separable door asset.
- ISO table target alpha≥128 bbox hint: 342 × 287 px at 0.295 scale, low confidence from the flattened example composite.
- ISO chair target alpha≥128 bbox hint: 142 × 205 px at 0.17 scale, low confidence from the flattened example composite.
- FP2D table, couch, chair, cash, and package art is `BLOCKED_MISSING`; ISO assets were not stretched or perspective-converted.

Repository defaults of 700 px ISO and 760 px 2D are recorded only as advisory legacy context. They are not treated as measured truth and were not used as the two-view size bible.

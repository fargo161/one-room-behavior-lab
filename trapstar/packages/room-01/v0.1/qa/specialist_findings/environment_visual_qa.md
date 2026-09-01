> Integration note: this is a preserved specialist-stage QA report. Its draft/no-promotion wording describes the specialist's bounded scratch phase; the root package manifests and final status taxonomy govern delivery.

# Room 01 environment visual QA — draft

Status: analysis-only candidate work. Nothing here is promoted, copied into final, or marked `READY`.

## Outcome

The two 1448×1086 RGB bare-room images are truthful source candidates for Room 01:

- `apt_305_iso_bare_room_generated.png` is a character-free isometric/cutaway plate (SHA-256 `47d0c281…8b54db39`).
- `apt_305_2d_bare_room_generated.png` is a character-free eye-level plate (SHA-256 `983363ac…8de27d6`).

Both contain static architecture and lighting baked into the pixels. Neither contains a character, player weapon, HUD, dialogue, crosshair, or menu. They are candidates, not runtime-ready plates: separate occlusion masks and state layers were not supplied.

## Direct pixel evidence

Alpha bounds below use `alpha >= 128`. The pivot is the derived bottom-center of that bound; it is a registration value, not necessarily a physical foot.

| ISO candidate | Source canvas | Alpha≥128 bbox `(x,y,w,h)` | Derived pivot | Alpha max | Visual blocker |
|---|---:|---:|---:|---:|---|
| Deal table | 1313×1004 | 128, 12, 1160, 972 | 707.5, 983 | 254 | Broad brown halo/glow; no fully opaque pixels |
| Couch | 1518×1024 | 48, 17, 1451, 996 | 773, 1012 | 254 | Magenta halo/glow; 11 px bottom and 19 px right margin |
| Folding chair | 1072×1264 | 118, 36, 833, 1206 | 534, 1241 | 255 | Edge glow; tight 22 px bottom margin |
| Cash stacks | 1364×1024 | 191, 19, 1154, 964 | 767.5, 982 | 254 | Brown halo/glow; 19 px right margin |
| Wrapped packages | 1474×1011 | 171, 29, 1204, 937 | 772.5, 965 | 254 | Brown halo/glow |

Four of five sources peak at alpha 254 and contain zero alpha-255 pixels. The couch, cash, and packages also have soft alpha>0 glow touching the left and bottom canvas edges, so that low-alpha glow is already clipped by the source canvas. The chair has 1,574 alpha-255 pixels and its alpha≥128 content is not clipped; the source only has a tight lower margin. A normalized derivative must be checked before anyone labels the chair's solid content clipped.

Low-alpha glow reaches or nearly reaches the canvas boundary on several assets, so `alpha > 0` is not a safe trim rule. The draft anchors therefore preserve measured alpha≥128 geometry and keep glow cleanup as an explicit blocker.

## Plate geometry

The ISO plate supports a broad center/lower floor polygon, a smaller character-safe polygon, and a central fixture-placement polygon. All three are hand traces against the 1448×1086 plate and carry medium confidence. The main visible door is baked at the far right and partially clipped by the canvas; the main window is baked in the upper-right wall. A second open door appears only at the foreground-left ISO cutaway. It has no FP2D counterpart or supplied semantic role, so it is registered disabled as unresolved architecture—not as a secret route or active exit.

ISO depth should be rooted by screen `y` with explicit parent/child overrides, but that alone is insufficient around the L-shaped counter. Separate masks are needed for the counter front and foreground cutaway walls. None were supplied. Tabletop items must remain children of the table surface, not ordinary floor-sort peers.

The FP2D plate’s wall/floor boundary runs approximately from `(0,694)` through `(660,650)` to `(1447,716)`. A conservative full-body region is `x=220..1280, y=280..1000`, with a provisional foot/root corridor of `x=260..1235, y=900..1015`. Those values combine direct plate tracing with flattened QA evidence and are not engine-authoritative. The main door and window are visible, but only static baked states exist.

## Element classification and anchor QA

Table, couch, folding chair, cash stacks, and wrapped packages are all visually consistent with the ISO/3Q plate and are cataloged as `PRODUCTION_CANDIDATE`, never `READY`. Each draft record has:

- a direct alpha≥128 bbox;
- a derived registration pivot and measured final-row support interval;
- inferred contact points and projected footprint;
- an inferred tabletop, seat, or top-item surface anchor;
- explicit normalization and in-engine QA blockers.

The table and seating surfaces are planar enough for provisional surface polygons. Cash and packages are irregular stacks, so their top “surface” is a low-confidence reference point rather than a reliable child-placement plane.

The flattened ISO composite supports only low-confidence staging estimates: table scale about `0.295` at plate pivot `(714,790)`, couch scale about `0.21` at `(1046,575)`, and chair scale about `0.17` at `(623,786)`. These transforms were reverse-estimated from a flattened reference and must not become authoritative without an actual layered composite pass.

No compatible eye-level variants exist for the five element families. The catalog therefore contains five explicit FP2D records with `BLOCKED_MISSING`, null bbox/pivot/contact/surface/footprint, and blocker `NO_EYE_LEVEL_VARIANT_SUPPLIED`. Stretching or reprojecting the ISO sources is prohibited because their 3/4 perspective conflicts with the eye-level plate.

## Node and interaction QA

The draft node file distinguishes visual evidence from implementation:

- Main door: visible in both views; disabled interaction candidate; no open state or runtime binding proven.
- Main window: visible in both views; inspect candidate only; no traversal or state behavior inferred.
- ISO foreground-left door: visible only in ISO; disabled and semantically unassigned.
- Table, couch, chair, cash, and packages: provisional ISO instances; FP2D bindings remain blocked.
- Character root sockets: provisional view-specific staging anchors only.
- Counter/cutaway/cabinet occluders: requirements recorded, but masks are missing.

Cash and packages may be children of table-top sockets. Couch/chair seat anchors are geometric candidates only; they do not prove `SIT` wiring. Likewise, a flattened scene containing a table or couch does not prove deal or seating code.

## Reference-only material

`example_scene_iso.jpg`, `example_scene_2d.jpg`, the six 1600×560 room-validation sheets, and the semantic-zone board remain reference/QA only. They are flattened and cannot supply separable runtime layers.

The zone board names eight labels—`TABLE_CENTER`, `DOOR_ENTRY`, `KITCHEN_NOOK`, `WALL_LEFT`, `WALL_RIGHT`, `WINDOW`, `COUCH_AREA`, and `OPEN_FLOOR`—and depicts geometry that does not match either bare plate. The labels are retained as design vocabulary only; its pixel coordinates are not reused.

## Claims not established by this archive

- A repository having 53 byte-identical Room 01 images: not verifiable without inspecting that repository.
- Legacy IDs or `READY` labels in a repository: not verifiable from these images.
- 700 px ISO / 760 px FP2D defaults: no archive image has either dimension; these may be runtime targets, not source evidence.
- Six placement zones: not verifiable without the repository. The archive's only explicit board names eight labels—and is itself non-authoritative.
- Partial table/couch wiring: not verifiable; the archive proves staging imagery, not code or bindings.

## Required follow-up before promotion

1. Produce normalized, tightly trimmed ISO derivatives with halo cleanup and alpha-edge QA; retain source provenance.
2. Author true FP2D element variants rather than reprojecting ISO art.
3. Create and test separate occlusion masks for the ISO counter/cutaway and any FP2D behind-cabinet paths.
4. Resolve the ISO-only foreground-left door’s architectural role; keep it disabled until then.
5. Confirm view-specific scale, pivots, footprints, surface sockets, and character baselines in-engine.
6. Supply explicit door/window states and interaction bindings if those capabilities are required.

No secret route was fabricated, and no source or QA sheet was promoted by this work.

#!/usr/bin/env python3
"""Promote a validated Goose batch into the repository character-pack boundary.

The source batch is intentionally external to Git because it may contain licensed
references, generated previews, and machine-local build records. This importer
copies only the reusable base, registered slot pixels, and masks. Slot images are
losslessly cropped to their registered rectangles so the shared compositor uses
the correct feature-local transform pivot.
"""

from __future__ import annotations

import argparse
import atexit
import hashlib
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image


SLOT_LABELS = {
    "LEFT_BROW": "Left Brow",
    "RIGHT_BROW": "Right Brow",
    "LEFT_EYE": "Left Eye",
    "RIGHT_EYE": "Right Eye",
    "LOWER_FACE": "Lower Face",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def json_bytes(value: Any) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def composite_sha256(image: Image.Image) -> str:
    digest = hashlib.sha256()
    digest.update(image.mode.encode("ascii"))
    digest.update(f"{image.width}x{image.height}".encode("ascii"))
    digest.update(image.tobytes())
    return digest.hexdigest()


def promote_validated_pack(
    staged_public: Path,
    staged_metadata: Path,
    target_public: Path,
    target_metadata: Path,
    staging_root: Path,
) -> None:
    """Promote a complete staged pack, rolling back the live files on failure."""
    backup_public = staging_root / "backup-public"
    backup_metadata = staging_root / "backup-metadata"
    backup_metadata.mkdir(parents=True, exist_ok=True)
    target_public.parent.mkdir(parents=True, exist_ok=True)
    target_metadata.mkdir(parents=True, exist_ok=True)
    metadata_names = ("manifest.json", "validation.json")

    try:
        if target_public.exists():
            os.replace(target_public, backup_public)
        for name in metadata_names:
            target = target_metadata / name
            if target.exists():
                shutil.copy2(target, backup_metadata / name)

        os.replace(staged_public, target_public)
        for name in metadata_names:
            os.replace(staged_metadata / name, target_metadata / name)
    except Exception:
        if target_public.exists():
            shutil.rmtree(target_public)
        if backup_public.exists():
            os.replace(backup_public, target_public)
        for name in metadata_names:
            backup = backup_metadata / name
            if backup.exists():
                os.replace(backup, target_metadata / name)
        raise


def import_pack(source: Path, repository: Path) -> None:
    source_manifest_path = source / "manifest" / "goose_expression_manifest.json"
    source_validation_path = source / "technical" / "validation_results.json"
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    source_validation = json.loads(source_validation_path.read_text(encoding="utf-8"))

    if source_manifest.get("schema") != "trapstar-goose-five-slot-expression-batch":
        raise ValueError("Unsupported Goose source manifest")
    if source_manifest.get("identity") != "GOOSE":
        raise ValueError("Source batch is not identity-bound to Goose")
    if source_validation.get("allExactRecompositions") is not True:
        raise ValueError("Source batch did not pass exact recomposition validation")

    canvas = source_manifest["canonicalFaceSpace"]
    canvas_size = (canvas["width"], canvas["height"])
    slot_definitions = {entry["slotId"]: entry for entry in source_manifest["slotDefinitions"]}
    slot_ids = list(slot_definitions)
    if slot_ids != ["LEFT_BROW", "RIGHT_BROW", "LEFT_EYE", "RIGHT_EYE", "LOWER_FACE"]:
        raise ValueError("Goose source must preserve the canonical five-slot order")

    target_public_root = repository / "public" / "expression-maker" / "goose"
    target_metadata_root = repository / "src" / "expression-maker" / "character-packs" / "goose"
    staging_root = Path(tempfile.mkdtemp(prefix=".goose-pack-import-", dir=repository))
    atexit.register(shutil.rmtree, staging_root, ignore_errors=True)
    public_root = staging_root / "public"
    layers_root = public_root / "layers"
    masks_root = public_root / "masks"
    metadata_root = staging_root / "metadata"
    layers_root.mkdir(parents=True, exist_ok=True)
    masks_root.mkdir(parents=True, exist_ok=True)
    metadata_root.mkdir(parents=True, exist_ok=True)

    base_source = source / source_manifest["baseHead"]
    base_target = layers_root / "goose__base_head.png"
    shutil.copyfile(base_source, base_target)
    with Image.open(base_target) as base_image:
        if base_image.size != canvas_size or base_image.mode != "RGBA":
            raise ValueError("Goose base must be an RGBA canonical-canvas PNG")

    slots: list[dict[str, Any]] = []
    for slot_id in slot_ids:
        definition = slot_definitions[slot_id]
        rect = definition["maskRect"]
        mask_source = source / definition["mask"]
        mask_target = masks_root / mask_source.name
        shutil.copyfile(mask_source, mask_target)
        slots.append(
            {
                "id": slot_id,
                "label": SLOT_LABELS[slot_id],
                "anatomicalSide": definition["anatomicalSide"],
                "faceRect": rect,
                "mask": {
                    "src": f"/expression-maker/goose/masks/{mask_target.name}",
                    "sha256": sha256(mask_target),
                    "featherPixels": definition["featherPixels"],
                },
            }
        )

    assets: list[dict[str, Any]] = [
        {
            "id": "goose__base_head",
            "label": "Neutral Base Head",
            "role": "BASE",
            "slotId": None,
            "sourceStackIndex": 0,
            "src": "/expression-maker/goose/layers/goose__base_head.png",
            "sha256": sha256(base_target),
            "faceRect": {"x": 0, "y": 0, "width": canvas_size[0], "height": canvas_size[1]},
            "defaultVisible": True,
            "defaultLocked": True,
            "opacity": 1,
            "anatomicalSide": None,
            "semanticState": "neutral_deadpan",
        }
    ]
    expressions: list[dict[str, Any]] = []
    validation_expressions: list[dict[str, Any]] = []

    for expression in source_manifest["expressions"]:
        expression_id = expression["expressionId"]
        expression_name = expression["expressionName"]
        expression_assets: dict[str, str] = {}

        with Image.open(base_target) as base_image:
            composite = base_image.convert("RGBA").copy()

        for stack_index, slot_id in enumerate(slot_ids, start=1):
            definition = slot_definitions[slot_id]
            rect = definition["maskRect"]
            source_path = source / expression["slots"][slot_id]
            target_name = source_path.name
            target_path = layers_root / target_name
            crop_box = (
                rect["x"],
                rect["y"],
                rect["x"] + rect["width"],
                rect["y"] + rect["height"],
            )
            with Image.open(source_path) as source_image:
                if source_image.size != canvas_size or source_image.mode != "RGBA":
                    raise ValueError(f"Unexpected slot source format: {source_path}")
                cropped = source_image.crop(crop_box)
                # PNGs can retain full-image RGB behind fully transparent pixels.
                # Clear only alpha-zero pixels; all visible and feathered pixels
                # remain byte-for-byte unchanged.
                alpha = cropped.getchannel("A")
                nonzero_alpha = alpha.point(lambda value: 255 if value else 0)
                cropped = Image.composite(cropped, Image.new("RGBA", cropped.size), nonzero_alpha)
                cropped.save(target_path, format="PNG", optimize=True)
                composite.alpha_composite(cropped, dest=(rect["x"], rect["y"]))

            asset_id = target_path.stem
            expression_assets[slot_id] = asset_id
            assets.append(
                {
                    "id": asset_id,
                    "label": f"{expression_name.replace('_', ' ').title()} · {SLOT_LABELS[slot_id]}",
                    "role": "SLOT",
                    "slotId": slot_id,
                    "sourceStackIndex": stack_index,
                    "src": f"/expression-maker/goose/layers/{target_name}",
                    "sha256": sha256(target_path),
                    "faceRect": rect,
                    "defaultVisible": False,
                    "defaultLocked": False,
                    "opacity": 1,
                    "anatomicalSide": definition["anatomicalSide"],
                    "semanticState": expression_name,
                }
            )

        with Image.open(source / expression["preview"]) as preview:
            exact = preview.convert("RGBA").tobytes() == composite.tobytes()
        if not exact:
            raise ValueError(f"Cropped layers do not exactly recompose {expression_id}")

        expressions.append(
            {
                "id": expression_id,
                "name": expression_name,
                "assetIds": expression_assets,
            }
        )
        validation_expressions.append(
            {
                "expressionId": expression_id,
                "assetIds": [expression_assets[slot_id] for slot_id in slot_ids],
                "exactRecomposition": True,
                "compositeRgbaSha256": composite_sha256(composite),
            }
        )

    tracked_pixel_paths = [base_target, *sorted(layers_root.glob("goose_expr_*.png")), *sorted(masks_root.glob("*.png"))]
    fingerprint = hashlib.sha256()
    for path in tracked_pixel_paths:
        relative = (Path("public/expression-maker/goose") / path.relative_to(public_root)).as_posix()
        fingerprint.update(relative.encode("utf-8"))
        fingerprint.update(b"\0")
        fingerprint.update(sha256(path).encode("ascii"))
        fingerprint.update(b"\n")

    manifest = {
        "schema": "trapstar-expression-character-pack",
        "version": 1,
        "characterPackId": "goose",
        "identity": "GOOSE",
        "displayName": "Goose",
        "assetSetSha256": fingerprint.hexdigest(),
        "canonicalFaceSpace": {
            "width": canvas_size[0],
            "height": canvas_size[1],
            "unit": "pixel",
            "origin": "TOP_LEFT",
            "xPositive": "RIGHT_ON_IMAGE",
            "yPositive": "DOWN",
            "rectangleConvention": "HALF_OPEN_PIXEL_EDGE",
        },
        "renderOrderPolicy": "PRESET_LAYER_ARRAY_BACK_TO_FRONT",
        "baseAssetId": "goose__base_head",
        "slotDrawOrder": slot_ids,
        "slots": slots,
        "assets": assets,
        "expressions": expressions,
        "initialExpressionId": "goose_expr_09",
    }
    manifest_path = metadata_root / "manifest.json"
    manifest_path.write_bytes(json_bytes(manifest))

    validation = {
        "schema": "trapstar-expression-character-pack-validation",
        "version": 1,
        "characterPackId": "goose",
        "manifestSha256": sha256(manifest_path),
        "assetSetSha256": manifest["assetSetSha256"],
        "canonicalCanvas": {"width": canvas_size[0], "height": canvas_size[1]},
        "baseAssetCount": 1,
        "slotCount": len(slot_ids),
        "expressionCount": len(expressions),
        "slotAssetCount": len(expressions) * len(slot_ids),
        "maskCount": len(slot_ids),
        "allExactRecompositions": all(entry["exactRecomposition"] for entry in validation_expressions),
        "storage": "LOSSLESS_CROPPED_REGISTERED_RECT",
        "expressions": validation_expressions,
    }
    (metadata_root / "validation.json").write_bytes(json_bytes(validation))

    promote_validated_pack(public_root, metadata_root, target_public_root, target_metadata_root, staging_root)

    print(f"Imported {len(assets)} assets and {len(slots)} masks")
    print(f"Asset-set SHA-256: {manifest['assetSetSha256']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True, help="Path to the validated Goose batch directory")
    parser.add_argument("--repository", type=Path, required=True, help="Repository root")
    arguments = parser.parse_args()
    import_pack(arguments.source.resolve(), arguments.repository.resolve())


if __name__ == "__main__":
    main()

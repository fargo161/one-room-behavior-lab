#!/usr/bin/env python3
"""Extract the pinned Marcus PXZ into the Expression Maker runtime library.

The source archive remains untouched. Content PNGs are copied byte-for-byte,
including hidden layers. The one mask whose filename says WebP but whose bytes
are PNG is copied under a correct runtime extension while its source name is
retained in the generated manifest.
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import shutil
import struct
import sys
import uuid
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

SOURCE_SHA256 = "D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7"
MAPPING_SHA256 = "320917B3526DFCF20164F99B3BEED38CD1320491AF366CC5CE3CEB8D498C3F8C"
SOURCE_FILE_NAME = "trapface_slot_labeled_anatomical_eye_split.pxz"
DOCUMENT_SIZE = (3264, 2448)
FACE_RECT = (1019, 499, 1187, 1484)
EXPECTED_LAYER_COUNT = 62
EXPECTED_ENTRY_COUNT = 65
EXPECTED_MASK_SOURCE = "fa41b4d648f0.webp"
EXPECTED_MASK_RUNTIME = "fa41b4d648f0.png"

SLOT_ORDER = [
    "BASE_HEAD",
    "BROW_L",
    "BROW_R",
    "EYE_L",
    "EYE_R",
    "GAZE_L",
    "GAZE_R",
    "LOWER_FACE",
    "MACRO_OVERRIDE",
]

SLOT_LABELS = {
    "BASE_HEAD": "Base Head",
    "BROW_L": "Left Brow",
    "BROW_R": "Right Brow",
    "EYE_L": "Left Eye",
    "EYE_R": "Right Eye",
    "GAZE_L": "Left Eye / Gaze",
    "GAZE_R": "Right Eye / Gaze",
    "LOWER_FACE": "Lower Face",
    "MACRO_OVERRIDE": "Macro / Full Face",
}

EXPECTED_SLOT_COUNTS = {
    "BASE_HEAD": 1,
    "BROW_L": 13,
    "BROW_R": 13,
    "EYE_L": 6,
    "EYE_R": 6,
    "GAZE_L": 4,
    "GAZE_R": 4,
    "LOWER_FACE": 14,
    "MACRO_OVERRIDE": 1,
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def png_metadata(data: bytes) -> tuple[int, int, int, int] | None:
    if len(data) < 26 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return width, height, data[24], data[25]


def assert_safe_entry(name: str) -> None:
    parts = PurePosixPath(name.replace("\\", "/")).parts
    if not name or name.startswith(("/", "\\")) or ".." in parts or (parts and ":" in parts[0]):
        raise ValueError(f"Unsafe archive entry: {name!r}")


def display_label(layer_name: str) -> str:
    pieces = layer_name.split("_")
    while pieces and pieces[0].isdigit():
        pieces.pop(0)
    return " ".join(piece.title() if not piece.isdigit() else piece for piece in pieces)


def load_mapping(mapping_path: Path) -> dict[str, dict[str, str]]:
    with mapping_path.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != EXPECTED_LAYER_COUNT:
        raise ValueError(f"Marcus mapping has {len(rows)} rows; expected {EXPECTED_LAYER_COUNT}")
    mapping = {row["layer_name"]: row for row in rows}
    if len(mapping) != EXPECTED_LAYER_COUNT:
        raise ValueError("Marcus mapping layer names are not unique")
    return mapping


def build_manifest(
    source_bytes: bytes,
    archive: zipfile.ZipFile,
    source_manifest: dict[str, Any],
    mapping: dict[str, dict[str, str]],
    mapping_provenance: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, bytes], dict[str, bytes]]:
    layers = source_manifest.get("stack")
    if not isinstance(layers, list) or len(layers) != EXPECTED_LAYER_COUNT:
        raise ValueError("PXZ layer count is not the pinned 62-layer Marcus source")

    base_x, base_y, face_width, face_height = FACE_RECT
    manifest_assets: list[dict[str, Any]] = []
    seen_content: set[str] = set()
    layer_files: dict[str, bytes] = {}
    mask_files: dict[str, bytes] = {}

    for stack_index, layer in enumerate(layers):
        name = layer["name"]
        row = mapping.get(name)
        if row is None:
            raise ValueError(f"Layer is missing from the tracked Marcus mapping: {name}")
        if row["stack_index"] != str(stack_index):
            raise ValueError(f"Tracked stack index differs for {name}")

        content_key = layer["content"]
        if PurePosixPath(content_key).name != content_key:
            raise ValueError(f"Layer content is not a root-level runtime resource: {content_key}")
        if content_key in seen_content:
            raise ValueError(f"Repeated content resource: {content_key}")
        seen_content.add(content_key)
        content = archive.read(content_key)
        metadata = png_metadata(content)
        if metadata is None:
            raise ValueError(f"Layer content is not PNG: {name}")
        width, height, bit_depth, color_type = metadata
        rect = layer["rect"]
        if (width, height) != (rect["w"], rect["h"]):
            raise ValueError(f"PNG dimensions differ from manifest rect: {name}")
        if bit_depth != 8 or color_type != 6:
            raise ValueError(f"Expected 8-bit RGBA PNG for {name}")
        if not (
            base_x <= rect["x"]
            and base_y <= rect["y"]
            and rect["x"] + rect["w"] <= base_x + face_width
            and rect["y"] + rect["h"] <= base_y + face_height
        ):
            raise ValueError(f"Layer escapes canonical Marcus face space: {name}")

        mask_definition: dict[str, Any] | None = None
        source_mask = layer.get("mask")
        if source_mask:
            if source_mask != EXPECTED_MASK_SOURCE:
                raise ValueError(f"Unexpected mask resource: {source_mask}")
            mask_data = archive.read(source_mask)
            mask_metadata = png_metadata(mask_data)
            if mask_metadata is None or mask_metadata[:2] != (width, height):
                raise ValueError("Marcus macro mask is not the expected matching PNG")
            mask_files[EXPECTED_MASK_RUNTIME] = mask_data
            mask_definition = {
                "src": f"/expression-maker/marcus/masks/{EXPECTED_MASK_RUNTIME}",
                "sourceResource": source_mask,
                "sourceFormat": "PNG",
                "apply": "ALPHA_MULTIPLY",
                "sha256": sha256_bytes(mask_data),
            }

        expected_mapping = {
            "content_resource": content_key,
            "mask_resource": source_mask or "",
            "source_x": str(rect["x"]),
            "source_y": str(rect["y"]),
            "source_width": str(rect["w"]),
            "source_height": str(rect["h"]),
            "face_x": str(rect["x"] - base_x),
            "face_y": str(rect["y"] - base_y),
            "face_width": str(rect["w"]),
            "face_height": str(rect["h"]),
            "visible": str(bool(layer["visible"])).lower(),
            "locked": str(bool(layer["locked"])).lower(),
            "direct_generic_reuse": "PROHIBITED",
        }
        for field, expected in expected_mapping.items():
            if row.get(field) != expected:
                raise ValueError(f"Tracked Marcus mapping drift for {name}: {field}")

        slot_id = row["canonical_slot"]
        if slot_id not in SLOT_ORDER:
            raise ValueError(f"Unexpected Marcus slot for {name}: {slot_id}")

        layer_files[content_key] = content

        manifest_assets.append(
            {
                "id": name,
                "label": display_label(name),
                "slotId": slot_id,
                "sourceBand": name.split("_", 1)[0],
                "sourceStackIndex": stack_index,
                "src": f"/expression-maker/marcus/layers/{content_key}",
                "sourceResource": content_key,
                "sourceResourceSha256": sha256_bytes(content),
                "sourceRect": {
                    "x": rect["x"],
                    "y": rect["y"],
                    "width": rect["w"],
                    "height": rect["h"],
                    "rotation": rect["r"],
                },
                "faceRect": {
                    "x": rect["x"] - base_x,
                    "y": rect["y"] - base_y,
                    "width": rect["w"],
                    "height": rect["h"],
                },
                "defaultVisible": bool(layer["visible"]),
                "defaultLocked": bool(layer["locked"]),
                "opacity": layer["opacity"],
                "anatomicalSide": row["anatomical_side"] or None,
                "canonicalSemanticState": row["canonical_semantic_state"] or None,
                "sourceCandidate": row["source_candidate"] or None,
                "classification": row["classification"],
                "confidence": row["confidence"],
                "identityBinding": "MARCUS_ONLY",
                "mask": mask_definition,
            }
        )

    if len(seen_content) != EXPECTED_LAYER_COUNT:
        raise ValueError("Marcus content resources are not unique")
    if set(mask_files) != {EXPECTED_MASK_RUNTIME}:
        raise ValueError("Marcus runtime must contain exactly the pinned macro mask")

    slots = []
    for slot_id in SLOT_ORDER:
        count = sum(asset["slotId"] == slot_id for asset in manifest_assets)
        if count != EXPECTED_SLOT_COUNTS[slot_id]:
            raise ValueError(f"Marcus slot count differs for {slot_id}: {count}")
        if count:
            slots.append({"id": slot_id, "label": SLOT_LABELS[slot_id], "assetCount": count})

    return {
        "schema": "trapstar-marcus-expression-assets",
        "version": 1,
        "identity": "MARCUS",
        "source": {
            "fileName": SOURCE_FILE_NAME,
            "sha256": sha256_bytes(source_bytes),
            "byteLength": len(source_bytes),
            "documentId": source_manifest["id"],
            "documentName": source_manifest["name"],
            "documentCanvas": {"width": source_manifest["width"], "height": source_manifest["height"]},
            "stackOrder": "BACK_TO_FRONT",
            "mapping": mapping_provenance,
        },
        "canonicalFaceSpace": {
            "width": face_width,
            "height": face_height,
            "unit": "pixel",
            "origin": "TOP_LEFT",
            "xPositive": "RIGHT_ON_IMAGE",
            "yPositive": "DOWN",
            "rectangleConvention": "HALF_OPEN_PIXEL_EDGE",
            "sourceOffset": {"x": base_x, "y": base_y},
        },
        "assetIdPolicy": "EXACT_PXZ_LAYER_NAME",
        "renderOrderPolicy": "PRESET_LAYER_ARRAY_BACK_TO_FRONT",
        "slots": slots,
        "assets": manifest_assets,
    }, layer_files, mask_files


def directory_matches(target: Path, expected_files: dict[str, bytes]) -> bool:
    if not target.is_dir() or target.is_symlink():
        return False
    entries = list(target.iterdir())
    if any(not entry.is_file() or entry.is_symlink() for entry in entries):
        return False
    if {entry.name for entry in entries} != set(expected_files):
        return False
    return all((target / name).read_bytes() == data for name, data in expected_files.items())


def runtime_matches(runtime_root: Path, layer_files: dict[str, bytes], mask_files: dict[str, bytes]) -> bool:
    if not runtime_root.is_dir() or runtime_root.is_symlink():
        return False
    if {entry.name for entry in runtime_root.iterdir()} != {"layers", "masks"}:
        return False
    return directory_matches(runtime_root / "layers", layer_files) and directory_matches(runtime_root / "masks", mask_files)


def remove_generated_tree(path: Path, allowed_parent: Path) -> None:
    resolved_path = path.resolve(strict=False)
    resolved_parent = allowed_parent.resolve(strict=True)
    if resolved_path == resolved_parent or not resolved_path.is_relative_to(resolved_parent):
        raise ValueError(f"Refusing to remove generated path outside {resolved_parent}: {resolved_path}")
    if path.is_symlink() or path.is_file():
        path.unlink()
    elif path.exists():
        shutil.rmtree(path)


def write_atomic(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_bytes(data)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def commit_outputs(
    runtime_root: Path,
    layer_files: dict[str, bytes],
    mask_files: dict[str, bytes],
    manifest_output: Path,
    manifest_data: bytes,
    repository_root: Path,
) -> None:
    if not runtime_root.resolve(strict=False).is_relative_to(repository_root.resolve(strict=True)):
        raise ValueError("Runtime output is outside the repository")
    if not manifest_output.resolve(strict=False).is_relative_to(repository_root.resolve(strict=True)):
        raise ValueError("Manifest output is outside the repository")

    if runtime_matches(runtime_root, layer_files, mask_files):
        if not manifest_output.exists() or manifest_output.read_bytes() != manifest_data:
            write_atomic(manifest_output, manifest_data)
        return

    runtime_parent = runtime_root.parent
    runtime_parent.mkdir(parents=True, exist_ok=True)
    if runtime_root.exists() and (not runtime_root.is_dir() or runtime_root.is_symlink()):
        raise ValueError(f"Runtime output is not a regular directory: {runtime_root}")

    token = uuid.uuid4().hex
    stage_root = runtime_parent / f".{runtime_root.name}-stage-{token}"
    backup_root = runtime_parent / f".{runtime_root.name}-backup-{token}"
    manifest_temporary = manifest_output.with_name(f".{manifest_output.name}.{token}.tmp")
    moved_existing = False
    installed_stage = False
    try:
        (stage_root / "layers").mkdir(parents=True)
        (stage_root / "masks").mkdir()
        for name, data in layer_files.items():
            (stage_root / "layers" / name).write_bytes(data)
        for name, data in mask_files.items():
            (stage_root / "masks" / name).write_bytes(data)
        if not runtime_matches(stage_root, layer_files, mask_files):
            raise ValueError("Staged Marcus runtime library failed byte verification")

        manifest_output.parent.mkdir(parents=True, exist_ok=True)
        manifest_temporary.write_bytes(manifest_data)
        if runtime_root.exists():
            os.replace(runtime_root, backup_root)
            moved_existing = True
        try:
            os.replace(stage_root, runtime_root)
            installed_stage = True
            os.replace(manifest_temporary, manifest_output)
        except Exception:
            if installed_stage and runtime_root.exists():
                os.replace(runtime_root, stage_root)
            if moved_existing and backup_root.exists():
                os.replace(backup_root, runtime_root)
            raise
        if backup_root.exists():
            remove_generated_tree(backup_root, runtime_parent)
    finally:
        if stage_root.exists():
            remove_generated_tree(stage_root, runtime_parent)
        manifest_temporary.unlink(missing_ok=True)


def main() -> int:
    repository_root = Path(__file__).resolve().parents[2]
    source_path = Path.home() / "Downloads" / SOURCE_FILE_NAME
    if len(sys.argv) == 2:
        source_path = Path(sys.argv[1]).expanduser().resolve()
    elif len(sys.argv) > 2:
        raise SystemExit(f"Usage: {Path(sys.argv[0]).name} [path-to-pxz]")

    mapping_path = (
        repository_root
        / "artifacts"
        / "male_face_chassis_v0_1"
        / "reference"
        / "marcus"
        / "marcus_layer_mapping.csv"
    )
    manifest_output = repository_root / "src" / "expression-maker" / "assets" / "marcus_asset_manifest.json"
    runtime_root = repository_root / "public" / "expression-maker" / "marcus"
    layers_output = runtime_root / "layers"

    source_bytes = source_path.read_bytes()
    observed_sha = sha256_bytes(source_bytes)
    if observed_sha != SOURCE_SHA256:
        raise ValueError(f"PXZ SHA-256 is {observed_sha}; expected {SOURCE_SHA256}")

    mapping_bytes = mapping_path.read_bytes()
    observed_mapping_sha = sha256_bytes(mapping_bytes)
    if observed_mapping_sha != MAPPING_SHA256:
        raise ValueError(f"Marcus mapping SHA-256 is {observed_mapping_sha}; expected {MAPPING_SHA256}")
    mapping = load_mapping(mapping_path)
    mapping_provenance = {
        "repositoryPath": mapping_path.relative_to(repository_root).as_posix(),
        "sha256": observed_mapping_sha,
        "rowCount": len(mapping),
    }
    with zipfile.ZipFile(source_path) as archive:
        if archive.testzip() is not None:
            raise ValueError("PXZ failed ZIP CRC validation")
        entries = archive.infolist()
        if len(entries) != EXPECTED_ENTRY_COUNT:
            raise ValueError(f"PXZ has {len(entries)} entries; expected {EXPECTED_ENTRY_COUNT}")
        if len({entry.filename for entry in entries}) != len(entries):
            raise ValueError("PXZ contains duplicate archive entry names")
        for entry in entries:
            assert_safe_entry(entry.filename)
        source_manifest = json.loads(archive.read("manifest.json"))
        if (source_manifest.get("width"), source_manifest.get("height")) != DOCUMENT_SIZE:
            raise ValueError("PXZ document canvas differs from the pinned Marcus source")
        runtime_manifest, layer_files, mask_files = build_manifest(
            source_bytes,
            archive,
            source_manifest,
            mapping,
            mapping_provenance,
        )

    manifest_data = (json.dumps(runtime_manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    commit_outputs(
        runtime_root,
        layer_files,
        mask_files,
        manifest_output,
        manifest_data,
        repository_root,
    )
    print(f"Extracted {len(runtime_manifest['assets'])} Marcus assets")
    print(f"Manifest: {manifest_output.relative_to(repository_root)}")
    print(f"Layers: {layers_output.relative_to(repository_root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

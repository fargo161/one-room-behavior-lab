#!/usr/bin/env python3
"""Read-only validator for the pinned Marcus PXZ and its non-authoritative export ZIP."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import struct
import sys
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath
from typing import Any

PXZ_SHA256 = "D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7"
DERIVATIVE_ZIP_SHA256 = "FB65AF146631BE0518D4AD36A7BD9438C31D444DED6D9A23A3A574E4407097CF"
DOCUMENT_SIZE = (3264, 2448)
FACE_RECT = (1019, 499, 1187, 1484)
EXPECTED_CLASSIFICATION_COUNTS = {
    "reference_only": 11,
    "semantic_exemplar": 33,
    "semantic_alternate": 10,
    "future_variant": 8,
}
EXPECTED_DERIVATIVE_VISIBILITY_MISMATCHES = {
    "60_EYE_LEFT_SIDE_LOOK_02",
    "65_EYE_RIGHT_SIDE_LOOK_04",
    "70_LOWER_FACE_SMILE_CLOSED_03",
}
ALTERNATE_STACK_INDICES = {7, 8, 11, 14, 21, 25, 51, 57, 58, 60}
INVENTORY_FIELDS = [
    "stack_index", "layer_name", "content_resource", "mask_resource",
    "source_x", "source_y", "source_width", "source_height",
    "face_x", "face_y", "face_width", "face_height", "visible", "locked",
    "anatomical_side", "canonical_slot", "canonical_semantic_state", "source_candidate",
    "classification", "confidence", "direct_generic_reuse", "reason",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def safe_archive_names(archive: zipfile.ZipFile) -> list[str]:
    unsafe: list[str] = []
    for info in archive.infolist():
        name = info.filename
        parts = PurePosixPath(name.replace("\\", "/")).parts
        if not name or name.startswith(("/", "\\")) or ".." in parts or (parts and ":" in parts[0]):
            unsafe.append(name)
    return unsafe


def png_size(data: bytes) -> tuple[int, int] | None:
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    return None


def bool_text(value: Any) -> str:
    return "true" if bool(value) else "false"


def derive_mapping(index: int, name: str) -> dict[str, str]:
    result = {
        "anatomical_side": "",
        "canonical_slot": "",
        "canonical_semantic_state": "",
        "source_candidate": "",
        "classification": "semantic_exemplar",
        "confidence": "high",
        "direct_generic_reuse": "PROHIBITED",
        "reason": "Identity-bound Marcus reference; semantic evidence only.",
    }
    if index == 0:
        result.update(
            canonical_slot="BASE_HEAD",
            canonical_semantic_state="NEUTRAL",
            classification="reference_only",
            reason="Pinned Marcus identity/base reference; never generic runtime art.",
        )
        return result
    if "FULL_FACE_PUFFED_CHEEKS" in name:
        result.update(
            canonical_slot="MACRO_OVERRIDE",
            canonical_semantic_state="PUFFED_CHEEKS",
            reason="Semantic exemplar for the macro concept; pixels remain identity-bound.",
        )
        return result

    side = "LEFT" if "_LEFT_" in name else "RIGHT" if "_RIGHT_" in name else ""
    result["anatomical_side"] = side
    if "_BROW_" in name:
        result["canonical_slot"] = f"BROW_{side[0]}"
        if "FURROW_CENTER_DEEP" in name:
            result["canonical_semantic_state"] = "FURROW_CENTER_DEEP"
        elif "FURROW_ANGLED" in name:
            result.update(
                source_candidate="FURROW_ANGLED",
                classification="future_variant",
                confidence="unresolved",
                reason="Source-only brow candidate outside the frozen v0.1 catalog.",
            )
        elif "FURROW_OUTER_WRINKLE" in name:
            result.update(
                source_candidate="FURROW_OUTER_WRINKLE",
                classification="future_variant",
                confidence="unresolved",
                reason="Source-only brow candidate outside the frozen v0.1 catalog.",
            )
        elif "ANGRY_ARCHED" in name:
            result["canonical_semantic_state"] = "ANGRY_ARCHED"
        elif "ARCHED_TALL" in name:
            result["canonical_semantic_state"] = "ARCHED_TALL"
        elif "LOW_FLAT" in name:
            result["canonical_semantic_state"] = "LOW_FLAT"
        elif "LOW_HEAVY" in name:
            result["canonical_semantic_state"] = "LOW_HEAVY"
        elif "NEUTRAL_WRINKLED" in name:
            result.update(canonical_semantic_state="NEUTRAL", confidence="low")
        if index in ALTERNATE_STACK_INDICES:
            result["classification"] = "semantic_alternate"
        return result

    if "_EYE_" in name:
        if "SIDE_LOOK" in name:
            suffix = name.rsplit("_", 1)[-1]
            result.update(
                canonical_slot=f"GAZE_{side[0]}",
                source_candidate=f"SIDE_LOOK_{suffix}",
                classification="reference_only",
                confidence="unresolved",
                reason="Baked eye/gaze composite has no proven direction; transform gaze is canonical.",
            )
            return result
        result["canonical_slot"] = f"EYE_{side[0]}"
        if "SHUT_TIGHT" in name:
            result.update(
                source_candidate="SPECIAL_SHUT_TIGHT",
                classification="reference_only",
                confidence="unresolved",
                reason="SHUT_TIGHT is reference-only; CLOSED_TIGHT is the frozen canonical state.",
            )
            return result
        for state in ("CLOSED_TIGHT", "SQUINT_TIGHT", "WIDE_OPEN_ALERT", "OPEN_NEUTRAL", "HALF_LID"):
            if state in name:
                result["canonical_semantic_state"] = state
                break
        return result

    if "LOWER_FACE" in name:
        result["canonical_slot"] = "LOWER_FACE"
        for state in (
            "LAUGH_WIDE_OPEN", "SMILE_CLOSED", "GRIMACE_FEAR", "SMILE_TEETH", "FROWN_POUT",
            "FROWN_TENSE", "SHOUT_OPEN", "MOUTH_OPEN_SMALL", "MOUTH_OPEN_SOFT", "NEUTRAL_CLOSED",
        ):
            if state in name:
                result["canonical_semantic_state"] = state
                break
        if index in ALTERNATE_STACK_INDICES:
            result["classification"] = "semantic_alternate"
        return result

    result.update(classification="reference_only", confidence="unresolved", reason="Unclassified source evidence.")
    return result


def inventory_rows(manifest: dict[str, Any]) -> list[dict[str, str]]:
    offset_x, offset_y, _, _ = FACE_RECT
    rows: list[dict[str, str]] = []
    for index, layer in enumerate(manifest["stack"]):
        rect = layer["rect"]
        row = {
            "stack_index": str(index),
            "layer_name": layer["name"],
            "content_resource": layer["content"],
            "mask_resource": layer.get("mask", ""),
            "source_x": str(rect["x"]),
            "source_y": str(rect["y"]),
            "source_width": str(rect["w"]),
            "source_height": str(rect["h"]),
            "face_x": str(rect["x"] - offset_x),
            "face_y": str(rect["y"] - offset_y),
            "face_width": str(rect["w"]),
            "face_height": str(rect["h"]),
            "visible": bool_text(layer["visible"]),
            "locked": bool_text(layer["locked"]),
            **derive_mapping(index, layer["name"]),
        }
        rows.append(row)
    return rows


def csv_text(rows: list[dict[str, str]]) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=INVENTORY_FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def validate(args: argparse.Namespace) -> tuple[list[str], list[str], list[dict[str, str]]]:
    errors: list[str] = []
    warnings: list[str] = []
    if sha256(args.pxz) != PXZ_SHA256:
        errors.append("PXZ hash does not match the pinned authority")
    if sha256(args.derivative_zip) != DERIVATIVE_ZIP_SHA256:
        errors.append("derivative ZIP hash does not match the ingested companion export")

    with zipfile.ZipFile(args.pxz) as archive:
        unsafe = safe_archive_names(archive)
        if unsafe:
            errors.append(f"PXZ contains unsafe archive paths: {unsafe}")
        names = {info.filename for info in archive.infolist()}
        if len(names) != 65:
            errors.append(f"PXZ entry count is {len(names)}, expected 65")
        manifest = json.loads(archive.read("manifest.json"))
        if (manifest.get("width"), manifest.get("height")) != DOCUMENT_SIZE:
            errors.append("PXZ document dimensions are not 3264x2448")
        layers = manifest.get("stack", [])
        if len(layers) != 62:
            errors.append(f"PXZ layer count is {len(layers)}, expected 62")
        if layers:
            base = layers[0]
            base_rect = base["rect"]
            observed_base = (base_rect["x"], base_rect["y"], base_rect["w"], base_rect["h"])
            if observed_base != FACE_RECT or not base["visible"] or not base["locked"]:
                errors.append("base layer does not match the pinned visible/locked 1187x1484 authority rect")
        for layer in layers:
            for resource_key in ("content", "mask"):
                resource = layer.get(resource_key)
                if resource and resource not in names:
                    errors.append(f"missing {resource_key} resource {resource} for {layer['name']}")
            content = layer.get("content")
            if content and content.endswith(".png") and content in names:
                size = png_size(archive.read(content))
                rect = layer["rect"]
                if size != (rect["w"], rect["h"]):
                    errors.append(f"content dimensions do not match rect for {layer['name']}")
        rows = inventory_rows(manifest)

    counts = Counter(row["classification"] for row in rows)
    if dict(counts) != EXPECTED_CLASSIFICATION_COUNTS:
        errors.append(f"classification totals are {dict(counts)}, expected {EXPECTED_CLASSIFICATION_COUNTS}")
    if any(row["direct_generic_reuse"] != "PROHIBITED" for row in rows):
        errors.append("every Marcus source layer must prohibit direct generic reuse")
    left_rows = [row for row in rows if row["anatomical_side"] == "LEFT"]
    right_rows = [row for row in rows if row["anatomical_side"] == "RIGHT"]
    if not left_rows or not right_rows or any(not row["canonical_slot"].endswith("_L") for row in left_rows) or any(not row["canonical_slot"].endswith("_R") for row in right_rows):
        errors.append("anatomical side-to-slot mapping is inconsistent")
    source_midline = FACE_RECT[0] + FACE_RECT[2] / 2
    sided_centers: dict[tuple[str, str], dict[str, list[float]]] = {}
    for row in left_rows + right_rows:
        center_x = int(row["source_x"]) + int(row["source_width"]) / 2
        side = row["anatomical_side"]
        if (side == "LEFT" and center_x <= source_midline) or (side == "RIGHT" and center_x >= source_midline):
            errors.append(f"{row['layer_name']} is not placed on its declared anatomical image side")
        family = row["canonical_slot"].rsplit("_", 1)[0]
        semantic_key = row["canonical_semantic_state"] or row["source_candidate"]
        group = sided_centers.setdefault((family, semantic_key), {"LEFT": [], "RIGHT": []})
        group[side].append(center_x)
    for (family, semantic_key), centers in sided_centers.items():
        if centers["LEFT"] and centers["RIGHT"] and min(centers["LEFT"]) <= max(centers["RIGHT"]):
            errors.append(f"paired placement is inverted for {family}/{semantic_key}")

    expected_inventory = csv_text(rows)
    if not args.inventory.exists():
        errors.append(f"checked inventory is missing: {args.inventory}")
    elif args.inventory.read_text(encoding="utf-8") != expected_inventory:
        errors.append("checked inventory differs from the pinned PXZ-derived inventory")

    with zipfile.ZipFile(args.derivative_zip) as archive:
        unsafe = safe_archive_names(archive)
        if unsafe:
            errors.append(f"derivative ZIP contains unsafe archive paths: {unsafe}")
        names = {info.filename for info in archive.infolist()}
        if len(names) != 64 or "layer_manifest.csv" not in names or "README.txt" not in names:
            errors.append("derivative ZIP must contain 62 PNGs, layer_manifest.csv, and README.txt")
        derivative_rows = list(csv.DictReader(io.TextIOWrapper(archive.open("layer_manifest.csv"), encoding="utf-8")))
        if len(derivative_rows) != 62:
            errors.append("derivative layer_manifest.csv must contain 62 rows")
        mismatch_names: set[str] = set()
        for expected, derivative in zip(rows, derivative_rows, strict=False):
            if derivative.get("layer_name") != expected["layer_name"]:
                errors.append(f"derivative row order/name mismatch at stack {expected['stack_index']}")
                continue
            for key, derivative_key in (
                ("source_x", "canvas_x"), ("source_y", "canvas_y"),
                ("source_width", "width"), ("source_height", "height"),
            ):
                if derivative.get(derivative_key) != expected[key]:
                    errors.append(f"derivative geometry mismatch for {expected['layer_name']}")
            derivative_visible = derivative.get("visible", "").lower()
            if derivative_visible != expected["visible"]:
                mismatch_names.add(expected["layer_name"])
        if mismatch_names != EXPECTED_DERIVATIVE_VISIBILITY_MISMATCHES:
            errors.append(f"unexpected derivative visibility mismatch set: {sorted(mismatch_names)}")
        elif mismatch_names:
            warnings.append(
                "non-authoritative derivative CSV visibility differs from PXZ for: " + ", ".join(sorted(mismatch_names))
            )

    return errors, warnings, rows


def parse_args() -> argparse.Namespace:
    repository_root = Path(__file__).resolve().parents[2]
    default_inventory = repository_root / "artifacts" / "male_face_chassis_v0_1" / "reference" / "marcus" / "marcus_layer_mapping.csv"
    parser = argparse.ArgumentParser()
    parser.add_argument("--pxz", type=Path, required=True)
    parser.add_argument("--derivative-zip", type=Path, required=True)
    parser.add_argument("--inventory", type=Path, default=default_inventory)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    errors, warnings, rows = validate(args)
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")
    print(f"PXZ layers: {len(rows)}")
    print(f"Classification totals: {dict(Counter(row['classification'] for row in rows))}")
    if errors:
        print("RESULT: FAILED")
        return 1
    print("RESULT: PASS_WITH_WARNINGS" if warnings else "RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())

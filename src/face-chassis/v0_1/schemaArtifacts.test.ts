import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { identityPackManifestSchema } from "./identityPack";
import { chassisContractSchema } from "./schema";

const outputDirectory = resolve(process.cwd(), "schemas");

const documents = [
  {
    fileName: "male-face-chassis-v0.1.schema.json",
    id: "https://trapstar.example/schemas/male-face-chassis-v0.1.schema.json",
    title: "Male Face Chassis v0.1 structural envelope",
    description: "Structural JSON Schema envelope for the public contract. The authoritative frozen counts, ordering, geometry, side, gaze, anchor, macro, and cross-record invariants require the Zod chassisContractSchema parser.",
    authoritativeValidator: "src/face-chassis/v0_1/schema.ts#chassisContractSchema",
    schema: chassisContractSchema,
  },
  {
    fileName: "male-face-chassis-identity-pack-v0.1.schema.json",
    id: "https://trapstar.example/schemas/male-face-chassis-identity-pack-v0.1.schema.json",
    title: "Male Face Chassis v0.1 identity-pack structural envelope",
    description: "Structural JSON Schema envelope for identity-pack assets and bindings. The authoritative coverage, provenance, status, canvas, mask, anchor, reachability, and cross-record invariants require the Zod identityPackManifestSchema parser.",
    authoritativeValidator: "src/face-chassis/v0_1/identityPack.ts#identityPackManifestSchema",
    schema: identityPackManifestSchema,
  },
] as const;

function renderDocument(document: (typeof documents)[number]) {
  return {
    ...z.toJSONSchema(document.schema, { target: "draft-2020-12" }),
    $id: document.id,
    title: document.title,
    description: document.description,
    "x-authoritative-validator": document.authoritativeValidator,
  };
}

describe("checked JSON Schema structural envelopes", () => {
  for (const document of documents) {
    it(`${document.fileName} is generated from the executable schema`, () => {
      const rendered = renderDocument(document);
      const outputPath = resolve(outputDirectory, document.fileName);
      if (process.env.UPDATE_FACE_CHASSIS_SCHEMAS === "1") {
        mkdirSync(outputDirectory, { recursive: true });
        writeFileSync(outputPath, `${JSON.stringify(rendered, null, 2)}\n`, "utf8");
      }
      expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual(rendered);
    });
  }
});

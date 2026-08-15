import { describe, expect, it } from "vitest";
import { loadDefaultContent, rawDefaultContent, validateContentReferences } from "./index";

describe("Living Comic v0.1 portable content package", () => {
  it("loads every definition through explicit schemas and cross-reference checks", () => {
    const content = loadDefaultContent();
    expect(validateContentReferences(content)).toEqual([]);
    expect(content.conflictSkeletons.map(({ kind }) => kind).sort()).toEqual([
      "ACCESS",
      "CONCEALMENT",
      "CONTROL",
      "DISCLOSURE",
      "EXIT",
    ]);
    expect(content.objectCategories).toHaveLength(6);
    expect(content.roomCategories).toHaveLength(3);
    expect(content.basedVibes.map(({ code }) => code).sort()).toEqual(["AB", "AD", "AS", "DB", "DE", "EB", "SD", "SE"]);
  });

  it("contains composable definitions rather than authored complete scenarios", () => {
    expect(Object.keys(rawDefaultContent)).not.toContain("scenes");
    expect(Object.keys(rawDefaultContent)).not.toContain("adventures");
    expect(Object.keys(rawDefaultContent)).not.toContain("encounters");
    expect(JSON.stringify(rawDefaultContent).toLowerCase()).not.toMatch(/\b(mara|drew|envelope)\b/);
  });

  it("keeps offering, possession, and ownership semantically separate", () => {
    const content = loadDefaultContent();
    const offer = content.directActions.find(({ operation }) => operation === "OFFER_OBJECT");
    expect(offer).toMatchObject({
      possessionTransferPolicy: "REQUIRES_ACCEPTANCE",
      ownershipTransferPolicy: "EXPLICIT_RULE_ONLY",
    });
    expect(offer?.resultPredicates).not.toContain("HELD_BY");
    expect(offer?.resultPredicates).not.toContain("OWNED_BY");
    expect(content.directActions.every(({ ownershipTransferPolicy }) => ownershipTransferPolicy === "EXPLICIT_RULE_ONLY")).toBe(true);
  });
});

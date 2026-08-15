import { describe, expect, it } from "vitest";
import { loadDefaultContent } from "../content";
import { SeededRng } from "../core/rng";
import { generateScene } from "./generator";
import { validateGeneratedScene } from "./validator";

describe("Living Comic v0.1 deterministic Narrative LEGO generation", () => {
  const content = loadDefaultContent();

  it("replays the same integer seed into byte-equivalent plain data", () => {
    expect(generateScene(104729, content)).toEqual(generateScene(104729, content));
  });

  it("uses a documented, language-portable xorshift32 sequence", () => {
    const rng = new SeededRng(1);
    expect([rng.nextUint32(), rng.nextUint32(), rng.nextUint32(), rng.nextUint32()]).toEqual([
      270369,
      67634689,
      2647435461,
      307599695,
    ]);
  });

  it("generates valid recombinations across many seeds", () => {
    const scenes = Array.from({ length: 30 }, (_, seed) => generateScene(seed + 1, content));
    for (const scene of scenes) {
      const validation = validateGeneratedScene(scene, content);
      expect(validation.valid, validation.issues.join("\n")).toBe(true);
      expect(scene.playerOptions.length).toBeGreaterThanOrEqual(2);
      expect(scene.playerOptions.length).toBeLessThanOrEqual(3);
      expect(scene.validationTrace.every(({ passed }) => passed)).toBe(true);
    }

    const signatures = new Set(scenes.map(({ snapshot }) => [
      snapshot.skeletonDefinitionId,
      snapshot.room.definitionId,
      snapshot.objects[0]?.definitionId,
      ...snapshot.characters.map(({ definitionId }) => definitionId),
    ].join("|")));
    expect(signatures.size).toBeGreaterThanOrEqual(20);

    const combinationsBySkeleton = new Map<string, Set<string>>();
    for (const scene of scenes) {
      const skeletonId = scene.snapshot.skeletonDefinitionId;
      const combination = [scene.snapshot.room.definitionId, scene.snapshot.objects[0]?.definitionId, ...scene.snapshot.characters.map(({ definitionId }) => definitionId)].join("|");
      combinationsBySkeleton.set(skeletonId, new Set([...(combinationsBySkeleton.get(skeletonId) ?? []), combination]));
    }
    expect([...combinationsBySkeleton.values()].some((combinations) => combinations.size >= 3)).toBe(true);
  });

  it("can compose every committed conflict skeleton rather than leaving dead content", () => {
    const skeletons = new Set(Array.from({ length: 100 }, (_, seed) => (
      generateScene(seed + 1, content).snapshot.skeletonDefinitionId
    )));
    expect([...skeletons].sort()).toEqual([
      "skeleton_access",
      "skeleton_concealment",
      "skeleton_control",
      "skeleton_disclosure",
      "skeleton_exit",
    ]);
  });

  it("uses deterministic rejection/backtracking instead of forcing invalid selections", () => {
    const scenes = Array.from({ length: 40 }, (_, seed) => generateScene(seed + 100, content));
    const backedUp = scenes.find(({ attempt }) => attempt > 0);
    expect(backedUp).toBeDefined();
    expect(backedUp?.generationTrace.some(({ kind }) => kind === "attempt_rejected")).toBe(true);
    expect(backedUp?.generationTrace.at(-1)?.kind).toBe("attempt_accepted");
  });

  it("exposes only individually selected definitions, never a prewritten scene identity", () => {
    const scene = generateScene(314159, content);
    expect(scene.generationTrace.some(({ kind }) => kind.includes("scenario"))).toBe(false);
    expect(JSON.stringify(scene).toLowerCase()).not.toMatch(/\b(mara|drew|envelope)\b/);
    expect(scene.snapshot.characters.map(({ role }) => role).sort()).toEqual([
      "COUNTERPART_ROLE",
      "PLAYER_ROLE",
      "THIRD_PARTY_ROLE",
    ]);
    expect(new Set(scene.playerOptions.map(({ goal }) => goal.definitionId)).size).toBe(scene.playerOptions.length);
  });

  it("makes physical possession and ownership separate truths", () => {
    const scene = generateScene(271828, content);
    const object = scene.snapshot.objects[0]!;
    expect(object.holderId).not.toBe(object.ownerId);
    expect(scene.snapshot.worldFacts.some(({ proposition }) => (
      proposition.subjectId === object.id
      && proposition.predicate === "HELD_BY"
      && proposition.objectId === object.holderId
    ))).toBe(true);
    expect(scene.snapshot.worldFacts.some(({ proposition }) => (
      proposition.subjectId === object.id
      && proposition.predicate === "OWNED_BY"
      && proposition.objectId === object.ownerId
    ))).toBe(true);
  });

  it("rejects a tampered scene whose pressure is no longer operative", () => {
    const scene = structuredClone(generateScene(161803, content));
    scene.snapshot.scenePressure.active = false;
    const result = validateGeneratedScene(scene, content);
    expect(result.valid).toBe(false);
    expect(result.trace.find(({ checkId }) => checkId === "check_scene_pressure")?.passed).toBe(false);
  });
});
